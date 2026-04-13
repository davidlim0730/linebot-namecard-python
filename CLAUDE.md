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

### GTM 文件夾組織

```
docs/gtm/
├── 📅 planning/          ← 規劃中的產品願景（未來）
│   ├── roadmap.md       └─ Phase 1-5 路線圖、設計原則、驗收指標
│   └── feature-planning.md  └─ 功能設計細節、UI 分層、Rich Menu 架構
│
├── 🏗️ prd/              ← 進行中開發的規格書（現在）
│   └── [date]-[name]-prd-v*.md  ← 每個功能開發都有一份 PRD
│
└── 📢 pr/               ← 已發佈的版本記錄（過去）
    ├── product-features.md              ← 對外推廣用功能清單
    ├── RELEASE-NOTES-TEMPLATE.md        ← 發版模板
    └── [date]-[name]-release.md         ← 每個版本都發佈一份 Release Notes
```

### 文檔工作流程

1. **規劃階段** → `planning/roadmap.md`
   - 列出 Phase X 的規劃功能
   - 定義設計原則、驗收指標

2. **開發階段** → `prd/*.md`
   - PRD 完成 → 開發實作
   - 內容：規格書、驗收標準、技術細節

3. **發佈階段** → `pr/`
   - 用 `RELEASE-NOTES-TEMPLATE.md` 寫 Release Notes
   - 更新 `product-features.md`（新功能加入列表）

### 各文件用途速查

| 角色 | 推薦閱讀 |
|------|--------|
| **業務 / 行銷** | `pr/product-features.md`, `planning/roadmap.md` |
| **PM** | 所有文檔 |
| **設計師** | `planning/feature-planning.md`, `pr/product-features.md` |
| **工程師** | `planning/feature-planning.md`, `prd/*.md` |
| **技術主管** | `planning/roadmap.md`, `prd/*.md` |

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

Phase 2 後，所有名片以組織為隔離單位：

```
batch_states/{user_id}/
  org_id: string
  pending_images: [storage_path, ...]
  created_at, updated_at: ISO8601
  ← 批量上傳進行中的狀態（Admin SDK 寫入）

namecard/{org_id}/{card_id}/     ← config.NAMECARD_PATH = "namecard"
  name, title, company, address, phone, email
  memo?: string
  added_by: user_id
  created_at: ISO8601

organizations/{org_id}/
  name: string
  created_by: user_id
  members/{user_id}/role: "admin" | "member"
  tags/roles/{push_id}/name: string    ← 角色標籤

user_org_map/{user_id}: org_id        ← 使用者 → 組織的索引

invite_codes/{code}/
  org_id, created_by, created_at, expires_at

namecard_cache/{card_id}/roles: [tag_names]  ← 名片標籤快取
display_name_cache/{user_id}: string         ← LINE 顯示名稱快取
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