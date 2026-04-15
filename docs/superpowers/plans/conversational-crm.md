# Conversational CRM — 整合開發計畫

## Context

兩個現有專案要合併成一個統一的 LINE CRM 產品：
- `linebot-namecard-python`：Python + Firebase + FastAPI + LINE Bot，已部署，名片管理功能完整
- `conversational-crm`：GAS + Sheets，NLU pipeline 已驗證，但架構受限

產品願景：透過 AI 讓業務人員在 LINE 上用說話完成所有 CRM 操作（Contact / Deal / Activity / Action）。
主介面是 LIFF App，LINE Chat 保留推播通知 + 名片上傳。
兩週內交付 MVP。

---

## 狀態分類：Brownfield

不是從零開始，是在成熟系統上擴充。核心原則：
- 不重寫已運作的功能
- 不破壞現有 LINE Bot 操作流程
- 先備份再動工

---

## 專案結構決策

### 不開新資料夾
以 `linebot-namecard-python` 為唯一後端 repo，在上面加 CRM 功能。

**理由：**
- FastAPI + Firebase + LINE Bot 全部就緒，移植成本趨近於零
- Cloud Run 已部署，無需重新設定 infra
- `conversational-crm` 的 GAS 層只是「膠水」，真正值錢的是 NLU Prompt（一個 .md 檔案）

### 備份策略
開發前先打兩個備份點：
```bash
# 1. linebot 現有功能 tag
cd linebot-namecard-python
git tag v1.0-namecard
git push origin v1.0-namecard

# 2. conversational-crm 備份（GAS 程式碼）
cd conversational-crm
git tag v1.0-gas-mvp
git push origin v1.0-gas-mvp
```

`conversational-crm` repo 之後仍保留（不刪），但停止主動開發，轉為參考資料。

---

## 架構設計（Architect-Methodology Step 1–2）

### 技術棧（不變）

| 層 | 現有 | 決策 |
|----|------|------|
| 後端 | Python FastAPI | 保留 |
| 資料庫 | Firebase Realtime DB | 保留，新增路徑 |
| AI | Gemini Vision + Text | 新增 NLU 用途 |
| 前端 | Vue 3 LIFF App | 新增頁面 |
| 部署 | Cloud Run | 不變 |
| LINE 整合 | Messaging API + LIFF | 主力改用 LIFF |

### Firebase 資料模型擴充（Step 2：Data First）

現有路徑（不動）：
```
namecard/{org_id}/{card_id}/          ← Contact 資料（保留）
organizations/{org_id}/               ← 組織（保留）
user_org_map/{user_id}               ← 對應（保留）
```

新增路徑：
```
deals/{org_id}/{deal_id}/
  entity_name: string                 ← 客戶名稱（允許 namecard card_id 為空，NLU 回報時）
  card_id?: string                    ← 若已有名片則關聯
  stage: "0"~"6" | "成交" | "失敗"
  is_pending?: boolean
  product_id?: string
  est_value?: number
  next_action_date?: string           ← YYYY-MM-DD
  status_summary: string
  added_by: string
  created_at: string
  updated_at: string

activities/{org_id}/{activity_id}/
  deal_id?: string
  entity_name: string
  raw_transcript: string
  ai_key_insights: string[]           ← 3 條摘要
  sentiment: "Positive"|"Neutral"|"Negative"
  is_human_corrected: boolean
  edit_log?: string                   ← JSON string
  added_by: string
  created_at: string

actions/{org_id}/{action_id}/
  deal_id?: string
  entity_name: string
  task_detail: string
  due_date: string                    ← YYYY-MM-DD
  status: "pending" | "completed"
  added_by: string
  created_at: string

stage_change_events/{org_id}/{event_id}/
  deal_id: string
  from_stage: string
  to_stage: string
  updated_by: string
  created_at: string

products/{org_id}/{product_id}/
  name: string
  status: "Active" | "Beta" | "Sunset"
```

---

## 開發計畫（兩週 14 天）

---

### Week 1 — 後端全部到位

**Day 1：備份 + 所有資料模型**
- [ ] 打備份 tag：`v1.0-namecard` / `v1.0-gas-mvp`
- [ ] `models/deal.py`：Deal, StageChangeEvent
- [ ] `models/activity.py`：Activity
- [ ] `models/action.py`：Action
- [ ] `models/product.py`：Product
- [ ] `models/stakeholder.py`：Stakeholder（姓名、職稱、態度：Champion / Decision Maker / Gatekeeper）
- [ ] 複製 NLU prompt → `app/nlu/system_prompt.md`

**Day 2：所有 Repositories**
- [ ] `repositories/deal_repo.py`：CRUD + list_by_org + list_by_entity_name
- [ ] `repositories/activity_repo.py`：CRUD + list_by_deal + list_by_org
- [ ] `repositories/action_repo.py`：CRUD + list_pending_by_org + list_due_today
- [ ] `repositories/product_repo.py`：CRUD + list_active
- [ ] `repositories/stakeholder_repo.py`：CRUD + list_by_deal

**Day 3：NLU Service**
- [ ] `services/nlu_service.py`
  - `build_grounding_context(org_id)` — 從 Firebase 讀取 namecard（company 欄位）+ deals（entity_name）→ 格式化為 Gemini prompt 末尾文字（Prompt Caching 友善格式）
  - `parse_text(raw_text, org_id) → NLUResult` — 呼叫 Gemini，注入 grounding context
  - `fuzzy_match_entity(name, entity_list) → match | None` — difflib，threshold 0.4，精確 → 包含 → 相似
  - `auto_link_namecard(entity_name, org_id) → card_id | None` — fuzzy match 到現有 namecard，回傳 card_id

**Day 4：所有業務 Services**
- [ ] `services/deal_service.py`
  - `upsert_deal(org_id, pipeline_data, user)` — 新建或更新，自動寫入 stage_change_events
  - `get_pipeline_summary(org_id, user)` — 主管視角：所有成員的 deals，依 stage 分組
  - `list_deals(org_id, user)` — 一般成員只看自己，主管看全部
- [ ] `services/activity_service.py`
  - `log_activity(org_id, interaction_data, user)` — 寫 activities，自動 auto_link_namecard
- [ ] `services/action_service.py`
  - `schedule_action(org_id, action_data, user)` — 寫 actions
  - `complete_action(org_id, action_id, user)` — 標記完成
  - `get_due_today(org_id)` — 查今日到期（給 LINE 推播用）

**Day 5：所有 API 路由 + LINE 推播 Service**
- [ ] `api/crm.py`：
  ```
  POST /api/v1/crm/parse                    ← Phase 1: NLU only
  POST /api/v1/crm/confirm                  ← Phase 2: 寫入 Firebase
  GET  /api/v1/deals                        ← 查 deals（支援 ?stage=&owner=）
  GET  /api/v1/deals/{id}                   ← deal 詳情 + activities timeline
  PUT  /api/v1/deals/{id}                   ← 更新 deal
  GET  /api/v1/deals/{id}/activities        ← 該 deal 的互動時間軸
  GET  /api/v1/deals/{id}/stakeholders      ← 該 deal 的關係人
  POST /api/v1/deals/{id}/stakeholders      ← 新增關係人
  GET  /api/v1/activities                   ← 查互動紀錄
  GET  /api/v1/actions                      ← 查待辦（支援 ?status=pending）
  PUT  /api/v1/actions/{id}                 ← 更新 / 完成待辦
  GET  /api/v1/products                     ← 查產品線
  POST /api/v1/products                     ← 新增產品（admin）
  PUT  /api/v1/products/{id}                ← 更新產品（admin）
  GET  /api/v1/pipeline/summary             ← 主管視角：team pipeline 彙總
  GET  /api/v1/contacts/{id}/crm            ← 聯絡人 CRM 視角（deals + activities）
  ```
- [ ] `services/push_service.py`
  - `push_action_reminders(org_id)` — 查今日到期 actions，依 user 分組，LINE push
  - `push_weekly_summary(org_id)` — 週報：本週互動數、到期未處理 deals、下週 actions

---

### Week 2 — LIFF 全部頁面 + LINE 整合

**Day 6：LIFF — 核心輸入頁 CrmInput**
- [ ] `liff_app/views/CrmInput.js`
  - 文字區塊（大輸入框）+ 「分析」按鈕
  - 呼叫 `/parse`，顯示 NLU 結果預覽卡（依 intent 分區塊顯示）
  - 低信心（< 0.5）或有 missing_fields 時顯示警告 banner
  - 確認 / 逐項修改 → 呼叫 `/confirm` → 顯示完成摘要

**Day 7：LIFF — Deal Pipeline 頁**
- [ ] `liff_app/views/DealList.js`
  - 依 Stage 分欄顯示（Kanban 橫向捲動，mobile-friendly）
  - 每張卡顯示：entity_name、est_value、next_action_date、is_pending 標記
  - 點擊開啟 DealDetail
- [ ] `liff_app/views/DealDetail.js`
  - Deal 欄位展示 + 編輯（stage、est_value、next_action_date）
  - Activities 時間軸（倒序）
  - Stakeholders 列表 + 新增
  - Stage Change History（from → to，時間戳）

**Day 8：LIFF — 待辦 + 聯絡人 CRM 視角**
- [ ] `liff_app/views/ActionList.js`
  - 今日到期 / 本週 / 全部 tab
  - 每筆顯示 entity_name、task_detail、due_date
  - 「完成」按鈕 → PUT /actions/{id}，畫面即時更新
- [ ] `liff_app/views/ContactCrm.js`
  - 從 CardDetail 連結進來，顯示該聯絡人的所有 deals + activities
  - 「新增案件」→ 跳轉 CrmInput 並帶入 entity_name

**Day 9：LIFF — 主管 Pipeline 總覽**
- [ ] `liff_app/views/ManagerPipeline.js`（僅 admin 可見）
  - 全團隊 deals 依 stage 統計（數量、總預估金額）
  - 成員列表：每人的活躍案件數、本月互動數
  - 可按成員篩選查看個別 pipeline
  - 逾期 actions 警示（due_date < today && status=pending）

**Day 10：LIFF — 產品管理 + app.js 路由整合**
- [ ] `liff_app/views/ProductList.js`（admin 可見）
  - 產品線清單、新增、啟用 / 停用
  - 說明：產品線是 NLU Grounding Context 的一部分
- [ ] `liff_app/app.js` — 新增所有路由：
  ```
  #/crm              → CrmInput
  #/deals            → DealList
  #/deals/:id        → DealDetail
  #/actions          → ActionList
  #/contacts/:id/crm → ContactCrm
  #/pipeline         → ManagerPipeline（admin only）
  #/products         → ProductList（admin only）
  ```

**Day 11：LINE Chat — 快速指令 + 推播**
- [ ] `handlers/text_handler.py` 新增指令：
  - `「我的待辦」` / `「today」` → 推播今日到期 actions（Flex Message 列表）
  - `「查 [名稱]」` → Fuzzy match → 回傳 Contact 摘要 + 最新 Deal status + 「查看詳情」按鈕（LIFF 連結）
  - `「pipeline」` → admin 限定，回傳本週 stage 分佈快照
- [ ] `services/push_service.py` 接上 LINE SDK：
  - `push_action_reminders()` — 早上 9:00 推播今日到期 actions
  - `push_weekly_summary()` — 週五 18:00 推播本週摘要

**Day 12：每日 / 每週排程 + Cloud Scheduler**
- [ ] `api/internal.py` 新增：
  - `POST /internal/push-action-reminders` — Cloud Scheduler 每日 09:00 呼叫
  - `POST /internal/push-weekly-summary` — Cloud Scheduler 週五 18:00 呼叫
- [ ] `scripts/setup_scheduler.sh` — 建立兩個 Cloud Scheduler jobs

**Day 13：Rich Menu 重設計**
- [ ] `rich_menu_utils.py` 全面更新：
  - 業務 Rich Menu（6 格）：
    - 「回報拜訪」→ LIFF #/crm
    - 「我的案件」→ LIFF #/deals
    - 「我的待辦」→ LIFF #/actions
    - 「名片管理」→ LIFF #/（原有）
    - 「查聯絡人」→ LIFF #/（原有 CardList）
    - 「團隊資訊」→ 原有指令
  - 主管 Rich Menu（額外 1 格）：
    - 「Pipeline 總覽」→ LIFF #/pipeline

**Day 14：端對端測試 + 部署**
- [ ] 主流程：意識流輸入 → NLU → 預覽 → 確認 → Firebase → LIFF 顯示
- [ ] 「查王總」→ LINE Chat 回傳 Contact + Deal 摘要
- [ ] 「我的待辦」→ LINE Chat 回傳今日 actions
- [ ] 主管 Pipeline 視角：admin 帳號可見 ManagerPipeline
- [ ] 推播測試：手動觸發 `/internal/push-action-reminders`
- [ ] 現有名片功能迴歸測試：OCR / 邀請 / 匯出 不受影響

---

## 關鍵檔案

### 要新增的檔案（30 個）
```
app/
  nlu/system_prompt.md
  models/deal.py
  models/activity.py
  models/action.py
  models/product.py
  models/stakeholder.py
  repositories/deal_repo.py
  repositories/activity_repo.py
  repositories/action_repo.py
  repositories/product_repo.py
  repositories/stakeholder_repo.py
  services/nlu_service.py
  services/deal_service.py
  services/activity_service.py
  services/action_service.py
  services/push_service.py
  api/crm.py
  liff_app/views/CrmInput.js
  liff_app/views/DealList.js
  liff_app/views/DealDetail.js
  liff_app/views/ActionList.js
  liff_app/views/ContactCrm.js
  liff_app/views/ManagerPipeline.js
  liff_app/views/ProductList.js
scripts/
  setup_scheduler.sh
```

### 要修改的檔案（5 個）
```
app/main.py                     ← 引入 crm router
app/liff_app/app.js             ← 新增 7 個路由
app/rich_menu_utils.py          ← 重設計 Rich Menu
app/handlers/text_handler.py    ← 新增 3 個 LINE 指令
app/api/internal.py             ← 新增 2 個排程端點
app/liff_app/views/CardDetail.js← 加入「查看 CRM」連結按鈕
```

### 不動的檔案
```
app/handlers/image_handler.py   ← 名片 OCR 不動
app/handlers/postback_handler.py
app/services/card_service.py
app/services/org_service.py
app/repositories/card_repo.py
app/liff_app/views/CardList.js
```

---

## 可複用的現有 Pattern

| 功能 | 參考位置 |
|------|---------|
| Firebase CRUD | `repositories/card_repo.py` |
| Permission 檢查（admin vs member）| `services/card_service.py` → `_can_access()` |
| JWT 認證 | `services/auth_service.py` |
| LIFF Vue 元件結構 | `liff_app/views/CardList.js` |
| Gemini API 呼叫 | `gemini_utils.py` |
| LINE push message | `line_handlers.py` → `line_bot_api.push_message()` |
| Pydantic Model 格式 | `models/card.py` |
| Cloud Scheduler 呼叫格式 | `api/internal.py` 現有端點 |

---

## API 合約（Step 4）

### POST /api/v1/crm/parse
```json
Request:  { "raw_text": "剛見完王總..." }
Response: {
  "parsed": {
    "intents": ["LOG_INTERACTION", "SCHEDULE_ACTION"],
    "overall_confidence": 0.88,
    "missing_fields": [],
    "entities": [...],
    "pipelines": [...],
    "interactions": [...],
    "actions": [...]
  }
}
```

### POST /api/v1/crm/confirm
```json
Request:  { "confirmed_data": { ...NLU JSON（可能被使用者修改過）} }
Response: {
  "written": {
    "entities_created": [...],
    "pipelines_updated": [...],
    "interactions_logged": [...],
    "actions_scheduled": [...]
  }
}
```

### GET /api/v1/pipeline/summary（主管）
```json
Response: {
  "by_stage": { "0": 3, "1": 5, "3": 2, ... },
  "total_est_value": 12500000,
  "members": [
    { "user_id": "...", "display_name": "小王", "active_deals": 8, "interactions_this_week": 5 }
  ],
  "overdue_actions": [...]
}
```

---

## 驗證策略（Primary 70% First）

1. **主流程**（先驗，Day 14 第一優先）：
   - 意識流輸入 → NLU 解析 → 預覽確認 → Firebase 寫入 → LIFF 更新

2. **次要流程**（後驗）：
   - LINE Chat 快速指令（「查王總」、「我的待辦」）
   - 主管 Pipeline 視角
   - 推播通知手動觸發

3. **迴歸確認**（最後）：
   - 名片 OCR 完整流程
   - 邀請碼、CSV 匯出

---

## 注意事項

- Firebase Realtime DB（不是 Firestore）：CRUD 參考 `card_repo.py`，注意 `push()` vs `set()`
- Grounding Context：namecard 用 `company` 欄位，需對應到 NLU 的 `entity_name`
- Prompt Caching：`build_grounding_context()` 的輸出盡量穩定，減少 Gemini token 費用
- 排程推播需要 Cloud Scheduler 呼叫 `/internal/*`，記得設定 Service Account 權限
- Slack 整合暫不移植（兩週後可加）
