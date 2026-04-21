# EDM 個人化電子報系統 設計文件

**日期**：2026-04-21  
**狀態**：待實作  
**背景**：Avnet FAE（Pre-sales）需要個人私人名單的自動化 EDM 工具，公司缺乏此類機制，以此為 POC 切入點。

---

## 1. 產品目標

讓業務員能在 Admin App 內，用個人 Gmail 帳號對 CRM contacts 進行個人化電子報寄送，每封信件依收件人資料差異化，同時自動 CC 公司信箱留存紀錄。

**核心需求：**
- 連結個人 Gmail（OAuth，非系統信箱）
- 分眾管理：標籤篩選 + 手動調整
- 個人化模板：merge tag 替換姓名、公司、AI 開場白
- 逐人發信（非 BCC 群發），CC 公司信箱

---

## 2. 整體架構

### 新增 Admin App 路由

```
/edm/segments     ← 分眾管理
/edm/send         ← 電子報撰寫與發送
```

### 新增 FastAPI 端點

```
GET  /api/edm/gmail/auth-url       ← 產生 OAuth 授權 URL
GET  /api/edm/gmail/callback       ← OAuth callback，儲存 refresh token
GET  /api/edm/gmail/status         ← 查詢連結狀態（已連結 email）
DELETE /api/edm/gmail/disconnect   ← 解除連結

GET    /api/edm/segments           ← 列出所有 segments
POST   /api/edm/segments           ← 建立 segment
PUT    /api/edm/segments/{id}      ← 更新 segment
DELETE /api/edm/segments/{id}      ← 刪除 segment
GET    /api/edm/segments/{id}/preview ← 預覽符合人數與清單

POST   /api/edm/send               ← 觸發寄信（非同步，走 Cloud Tasks）
GET    /api/edm/send-logs          ← 寄送歷史記錄
```

### Firebase 新增路徑

```
edm_gmail_tokens/{org_id}/
  connected_email: string
  refresh_token: string          ← 加密儲存
  token_expiry: ISO8601
  connected_at: ISO8601

edm_segments/{org_id}/{segment_id}/
  name: string
  tag_filters: [string]          ← contact tags，OR 條件
  manual_add: [contact_id]       ← 手動加入（覆蓋 tag 篩選）
  manual_remove: [contact_id]    ← 手動剔除
  created_by: user_id
  created_at, updated_at: ISO8601

edm_send_log/{org_id}/{log_id}/
  segment_id: string
  segment_name: string           ← 快照，避免 segment 刪除後看不到
  subject: string
  recipient_count: int
  status: "pending" | "sending" | "done" | "failed"
  sent_at: ISO8601
  cc_email: string
```

---

## 3. Gmail OAuth 設定

### GCP 設定（一次性）

- 在現有 GCP 專案新增 OAuth 2.0 Client ID（Web application 類型）
- Scope：`https://www.googleapis.com/auth/gmail.send`
- 授權 redirect URI：`https://{cloud-run-url}/api/edm/gmail/callback`
- 新增環境變數：`GMAIL_OAUTH_CLIENT_ID`、`GMAIL_OAUTH_CLIENT_SECRET`

### 用戶設定流程（一次性）

1. 進入 Admin App `/edm` 任一頁，若未連結顯示提示 banner
2. 點「連結個人 Gmail」→ 後端產生 OAuth URL（含 `access_type=offline`、`prompt=consent`）
3. 瀏覽器跳 Google 授權同意頁
4. 授權後 redirect 回 `/api/edm/gmail/callback`
5. 後端用 `code` 換取 tokens → 加密存入 `edm_gmail_tokens/{org_id}/`
6. Redirect 回 `/admin/edm/send`，顯示「已連結：your@gmail.com ✓」

### Token 管理

- 每次寄信前用 `google.oauth2.credentials.Credentials` 自動 refresh
- Refresh token 永久有效，除非用戶主動撤銷或重新授權

---

## 4. 分眾管理（`/edm/segments`）

### UI 結構

- 左側：segment 清單（名稱 + 預估人數）
- 右側：選中 segment 的編輯面板

### Segment 編輯流程

1. 輸入分眾名稱
2. 多選 contact tags（OR 條件篩選）→ 即時顯示「符合 N 人」
3. 預覽清單：顯示所有符合 contacts（姓名、公司、email）
   - 每筆右側有「加入 ＋」/ 「剔除 －」toggle
   - 剔除顯示刪除線 + 灰色；手動加入顯示「手動」badge
4. 儲存 segment（儲存規則，非快照）

### 動態計算邏輯（後端 `/preview` 端點）

```
符合人數 = (tag 篩選結果 ∪ manual_add) - manual_remove
```

且收件人需有有效 email 欄位，無 email 者自動排除並提示。

---

## 5. 電子報發送（`/edm/send`）

### UI 結構（單頁由上到下）

1. **Gmail 連結狀態**：顯示已連結帳號，或提示去設定
2. **收件人**：下拉選擇 segment → 顯示「預計寄送 N 人」
3. **主旨**：文字輸入框（支援 merge tag：`{{name}}`、`{{company}}`）
4. **CC 公司信箱**：預填（存於 `organizations/{org_id}/edm_cc_email`），可覆蓋
5. **HTML 模板**：textarea 貼入 HTML，右側 `<iframe>` sandbox 即時預覽
6. **Merge Tag 說明**：固定顯示可用的 tag 清單與說明
7. **發送按鈕**：「預覽確認 → 確認寄出」兩步驟

### 可用 Merge Tags

| Tag | 來源 | Fallback |
|-----|------|----------|
| `{{name}}` | `contact.display_name` | 「您好」 |
| `{{company}}` | contact 公司欄位 | 空字串 |
| `{{opening_line}}` | AI 根據最新 activity 生成 | 空字串 |

### 發信流程（後端，非同步）

1. API 收到請求後立即回傳 `log_id`，狀態設為 `"pending"`
2. 建立 Cloud Task 執行實際寄送
3. Worker 流程：
   - 動態計算 segment 收件人清單
   - 對每位收件人：
     a. 替換 `{{name}}`、`{{company}}`
     b. 若模板含 `{{opening_line}}`：撈最新 activity → 呼叫 Gemini 生成開場白（30 字內）
     c. 用 Gmail API `users.messages.send` 寄出，`To` = 收件人，`Cc` = 公司信箱，`From` = 個人 Gmail
     d. 每封間隔 200ms（避免 Gmail quota 觸頂）
4. 全部完成後更新 `edm_send_log` 狀態為 `"done"`

### `{{opening_line}}` Gemini Prompt

```
根據以下業務互動摘要，生成一句繁體中文的個人化感謝開場白，30 字以內，語氣專業但親切：

互動摘要：{ai_key_insights}
對方姓名：{name}
```

若無 activity 記錄，跳過 Gemini 呼叫，`{{opening_line}}` 替換為空字串。

### 寄送估算

- 50 人清單，含 `{{opening_line}}`：約 60-90 秒（Gemini latency ~1s/人 + Gmail API）
- 50 人清單，不含 `{{opening_line}}`：約 15-20 秒

---

## 6. 寄送記錄

`/edm/send` 頁面底部顯示歷史記錄表格：

| 欄位 | 說明 |
|------|------|
| 寄送時間 | `sent_at` |
| 主旨 | 截斷顯示 |
| 分眾名稱 | `segment_name`（快照） |
| 人數 | `recipient_count` |
| 狀態 | pending / sending / done / failed |

---

## 7. 新增環境變數

```
GMAIL_OAUTH_CLIENT_ID      ← GCP OAuth Client ID
GMAIL_OAUTH_CLIENT_SECRET  ← GCP OAuth Client Secret
EDM_CC_DEFAULT_EMAIL       ← 預設 CC 公司信箱（可在 UI 覆蓋）
```

---

## 8. 未納入本期範圍

- 退訂（unsubscribe）機制
- 開信率追蹤（需第三方服務）
- 排程寄送（指定時間自動發出）
- 多個 Gmail 帳號管理
- A/B 測試
