# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Vision

「用 LINE 就能管名片」——為台灣企業業務團隊打造的共享名片管理工具。以 LINE 為主要介面，無需另裝 App，支援名片掃描、查詢、共享與管理。

**目標用戶**：企業業務團隊，需要共用名片庫、快速查找聯絡人、協作管理客戶關係。

**當前進度**：Phase 3 已完成（標籤系統、CSV 匯出、Flex Message 重設計）。Phase 4（follow-up 追蹤）尚未開始。

## Design Principles

1. **LINE 優先，但不綁定**：核心邏輯不應與 LINE SDK 耦合，未來可擴展至 Web UI 或其他平台。
2. **平台解耦**：業務邏輯與資料存取層分離（service layer）。Firebase 是 MVP 選擇，架構保持可替換性。
3. **團隊優先於個人**：所有名片以 `org_id` 為隔離單位。個人使用 = 單人組織。
4. **搜尋即核心體驗**：智慧查詢走 Gemini 文字模型，需持續優化準確度。

## Commands

```bash
# 本地開發
uvicorn app.main:app --host=0.0.0.0 --port=8080

# 安裝依賴
pip install -r requirements.txt

# Lint
flake8 .

# Docker
docker build -t linebot-namecard .
docker run -p 8080:8080 linebot-namecard
```

### GCP 部署

```bash
gcloud builds submit --tag gcr.io/{PROJECT_ID}/{IMAGE_NAME}

gcloud run deploy {IMAGE_NAME} \
  --image gcr.io/{PROJECT_ID}/{IMAGE_NAME} \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "ChannelSecret=...,ChannelAccessToken=...,GEMINI_API_KEY=...,FIREBASE_URL=...,FIREBASE_STORAGE_BUCKET=...,GOOGLE_APPLICATION_CREDENTIALS_JSON=..."
```

## Documentation Structure（文檔規範）

### 產品文件夾組織

```
docs/product/
├── 00_strategy/           ← 產品策略與高層次規劃
│   ├── roadmap.md         └─ 高層次路線圖、設計原則、關鍵指標
│   └── feature-planning.md └─ 功能設計細節、UI 分層、Rich Menu 架構
│
├── 01_features/           ← 每個功能的完整需求規格（每功能一個子資料夾）
│   └── [feature_name]/
│       ├── prd.md         └─ PRD（設計細節、UI/UX、驗收標準）
│       └── tech_design.md └─ （選用）技術設計文件
│
└── 02_releases/           ← 已發佈的版本記錄與對外溝通
    ├── product-features.md              ← 對外推廣用功能清單（活頁文件）
    └── release_notes/
        ├── RELEASE-NOTES-TEMPLATE.md    ← 發版模板
        └── [date]-[name]-release.md     ← 每個版本的發佈說明
```

### 文檔工作流程

1. **策略階段** → `product/00_strategy/`
   - 定義產品願景、策略、高層次路線圖

2. **規劃與開發階段** → `product/01_features/[feature_name]/`
   - 為每個新功能建立子資料夾
   - 撰寫 `prd.md`（設計細節、UI/UX、驗收標準、技術考量）

3. **發佈階段** → `product/02_releases/`
   - 根據 `release_notes/RELEASE-NOTES-TEMPLATE.md` 撰寫發佈說明
   - 更新 `product-features.md`（新功能加入列表）

### 各文件用途速查

| 角色 | 推薦閱讀 |
|------|--------|
| **業務 / 行銷** | `02_releases/product-features.md`, `00_strategy/roadmap.md` |
| **PM** | 所有文檔 |
| **設計師** | `00_strategy/feature-planning.md`, `02_releases/product-features.md` |
| **工程師** | `00_strategy/feature-planning.md`, `01_features/*/prd.md` |
| **技術主管** | `00_strategy/roadmap.md`, `01_features/*/prd.md` |

---

## Architecture

FastAPI webhook → `line_handlers.py` → `firebase_utils.py` / `gemini_utils.py`

### Request Flow

1. LINE webhook POST → `app/main.py` → 依事件型別分派
2. **Text event** → `handle_text_event`：先檢查 `user_states`（進行中的多步驟操作），否則走文字指令或 `handle_smart_query`
3. **Image event** → `handle_image_event`：先檢查 batch mode（`get_batch_state`）— 批量模式則靜默上傳到 Storage；一般模式則下載圖片 → Gemini Vision OCR → 去重檢查 → 存 Firebase
4. **Postback event** → `handle_postback_event`：parse `action=xxx&card_id=yyy` → 對應 handler
5. **Cloud Tasks callback** → `POST /internal/process-batch`：Worker 循序處理批量圖片 → Gemini OCR → 存 Firebase → Push 摘要

### 批量上傳流程（Batch Upload）

用戶輸入「新增」→ Quick Reply 選擇「批量排程上傳」→ PostbackAction `action=batch_start`
→ `init_batch_state(user_id, org_id)` 寫入 RTDB
→ 用戶傳送多張圖片 → 各自 `upload_raw_image_to_storage` → `append_batch_image`
→ 用戶輸入「完成」→ `create_process_batch_task` 建立 Cloud Task → `clear_batch_state`
→ Cloud Tasks 呼叫 `/internal/process-batch` → `batch_processor.process_batch` 循序 OCR
→ `send_batch_summary_push` 推播結果

**Rollback**：移除 `CLOUD_TASKS_QUEUE` env var 即隱藏批量選項（`BATCH_UPLOAD_ENABLED = False`）

### State Machine（多步驟操作）

`user_states` 是 in-memory dict（`bot_instance.py`），格式：
```python
user_states[user_id] = {'action': 'editing_field', 'card_id': '...', 'field': 'name'}
```
支援的 action：`editing_field`、`adding_memo`、`exporting_csv`、`adding_tag`

**注意**：Cloud Run 重啟後 state 會消失，現為已知限制。

### Data Model（Firebase Realtime DB）

所有業務資料以 `org_id` 為隔離單位：

```
# ── 組織與成員 ──────────────────────────────────────────────
organizations/{org_id}/
  name: string
  created_by: user_id
  plan_type?: string
  trial_ends_at?: ISO8601
  members/{user_id}/
    role: "admin" | "member"
    joined_at: ISO8601
    display_name?: string
  tags/roles/{push_id}/name: string    ← 角色標籤（舊版名片用）

user_org_map/{user_id}: org_id         ← 使用者 → 組織索引

invite_codes/{code}/
  org_id, created_by, created_at, expires_at

# ── 名片（舊版，LINE Bot OCR 掃描）────────────────────────────
namecard/{org_id}/{card_id}/           ← config.NAMECARD_PATH = "namecard"
  name, title, company, address
  phone?, mobile?, email?, line_id?
  memo?: string
  tags: [string]
  added_by: user_id
  created_at: ISO8601

# ── 聯絡人（新版 CRM Contact）──────────────────────────────────
contacts/{org_id}/{contact_id}/        ← config.CONTACT_PATH = "contacts"
  contact_type: "person" | "company"
  display_name: string
  legal_name?: string
  aliases: [string]
  parent_company_id?: string           ← 所屬公司 contact_id
  title?, phone?, mobile?, email?, line_id?
  memo?: string
  source: string                       ← "nlu" | "ocr" | ...
  added_by: user_id
  created_at, updated_at: ISO8601

# ── 商機 ────────────────────────────────────────────────────
deals/{org_id}/{deal_id}/
  entity_name: string
  company_contact_id?: string          ← contacts FK
  contract_entity_id?: string          ← contacts FK
  poc_contact_id?: string              ← contacts FK
  stage: "0"~"6" | "成交" | "失敗"
  is_pending?: boolean
  product_id?: string                  ← products FK
  est_value?: int                      ← TWD
  next_action_date?: YYYY-MM-DD
  status_summary: string
  added_by: user_id
  created_at, updated_at: ISO8601

stage_change_events/{org_id}/{event_id}/
  deal_id, from_stage, to_stage
  updated_by: user_id
  created_at: ISO8601

# ── 互動記錄 ────────────────────────────────────────────────
activities/{org_id}/{activity_id}/
  deal_id?: string
  contact_id?: string
  entity_name?: string
  raw_transcript: string
  ai_key_insights: [string]            ← 最多 3 條，各 ≤30 字
  sentiment: "Positive" | "Neutral" | "Negative"
  is_human_corrected: boolean
  edit_log?: string                    ← JSON 字串
  added_by: user_id
  created_at: ISO8601

# ── 待辦事項 ────────────────────────────────────────────────
actions/{org_id}/{action_id}/
  deal_id?, contact_id?, entity_name?
  task_detail: string
  due_date?: YYYY-MM-DD
  status: "pending" | "completed"
  added_by: user_id
  created_at: ISO8601

# ── 利害關係人 ──────────────────────────────────────────────
stakeholders/{org_id}/{stakeholder_id}/
  deal_id: string
  name, title?
  role: "Champion" | "Decision Maker" | "Gatekeeper"
  attitude?: "Supportive" | "Neutral" | "Skeptical"
  email?, phone?
  contact_id?: string
  is_champion: boolean
  notes?: string
  added_by: user_id
  created_at: ISO8601

# ── 產品線 ──────────────────────────────────────────────────
products/{org_id}/{product_id}/
  name: string
  status: "Active" | "Beta" | "Sunset"
  description?: string
  created_at: ISO8601

# ── 批量上傳暫態 ─────────────────────────────────────────────
batch_states/{user_id}/
  org_id: string
  pending_images: [storage_path]
  created_at, updated_at: ISO8601

# ── 快取 ─────────────────────────────────────────────────────
namecard_cache/{card_id}/roles: [tag_names]
display_name_cache/{user_id}: string
```

### Key Behaviors

- **`ensure_user_org(user_id)`**：每次 text/image event 都呼叫，若使用者沒有組織則自動建立個人組織（這是 onboarding 的唯一入口）。
- **去重邏輯**：`check_if_card_exists` 以 email 為 key 比對，若有重複回傳既有的 `card_id`。
- **Gemini 模型**：`gemini-2.5-flash`，OCR 和查詢都強制 `response_mime_type: application/json`。
- **CSV 匯出**：透過 SMTP 將 CSV 以 email 寄出（需設定 `SMTP_USER`、`SMTP_PASSWORD`）。
- **Google Sheets 同步**：每次新增/更新名片時呼叫 `gsheets_utils.trigger_sync`（需設定 `GOOGLE_SHEET_ID`）。

### Environment Variables

必要：
- `ChannelSecret`, `ChannelAccessToken` — LINE Bot
- `GEMINI_API_KEY` — Gemini API
- `FIREBASE_URL` — Firebase Realtime DB URL
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` — Firebase service account JSON 字串

選用：
- `FIREBASE_STORAGE_BUCKET` — QR Code 圖片儲存 + 批量上傳暫存（e.g. `project-id.firebasestorage.app`）
- `GOOGLE_SHEET_ID` — Google Sheets 同步
- `SMTP_USER`, `SMTP_PASSWORD` — CSV 匯出 email
- `DEFAULT_ORG_ID` — 預設組織 ID（預設 `org_default`）
- `LIFF_CHANNEL_ID` — LINE Channel ID（用於驗證 id_token）
- `LIFF_ID` — LIFF App ID（LINE Developers Console 取得，`/liff/` 頁面動態注入）
- `CLOUD_TASKS_QUEUE` — Cloud Tasks queue name（e.g. `namecard-batch`）；缺失時批量功能關閉
- `CLOUD_TASKS_LOCATION` — Cloud Tasks 地區（e.g. `asia-east1`）
- `CLOUD_RUN_URL` — Cloud Run 服務 URL，供 Cloud Tasks 回呼（e.g. `https://xxx.run.app`）
- `GOOGLE_CLOUD_PROJECT` — GCP 專案 ID（Cloud Tasks client 用）

### Bot 測試指令（LINE 聊天室直接輸入）

- `remove` — 清理重複名片
- `加入 {code}` — 加入組織（邀請碼流程）
- `設定團隊名稱 {name}` — 更新組織名稱

### Firebase Storage

```
qrcodes/{user_id}/{card_id}.png            ← QR Code，公開讀取，Admin SDK 寫入
raw_images/{org_id}/{user_id}/{uuid}.jpg   ← 批量上傳暫存，處理後刪除，Admin SDK 讀寫
```

### GCP Infrastructure（批量上傳）

```bash
# 建立 Cloud Tasks queue（部署前執行一次）
gcloud tasks queues create namecard-batch --location=asia-east1

# 授予 Cloud Run SA enqueuer 權限
gcloud projects add-iam-policy-binding {PROJECT_ID} \
  --member="serviceAccount:{SA_EMAIL}" \
  --role="roles/cloudtasks.enqueuer"
```

**gcloud run deploy** 需加入環境變數：
```
CLOUD_TASKS_QUEUE=namecard-batch
CLOUD_TASKS_LOCATION=asia-east1
CLOUD_RUN_URL=https://{SERVICE}-{HASH}.{REGION}.run.app
GOOGLE_CLOUD_PROJECT={PROJECT_ID}
```
---

## AI 回覆規範

- **直接給結果**：不要前言、不要總結
- **使用工具後，只回報結果**：不描述過程
- **除非主動問，否則不解釋**：不說明你在做什麼
- **程式碼和資料維持完整精確**：只壓縮自然語言