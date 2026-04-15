# LINE Bot 智慧名片管家

用 LINE 就能管名片——為台灣企業業務團隊打造的共享名片管理工具。無需額外安裝 App，在日常使用的 LINE 中完成名片掃描、查詢、共享與管理。

<img width="453" height="638" alt="Microsoft PowerPoint 2025-08-01 18 39 19" src="https://github.com/user-attachments/assets/918c5b9a-c114-4f1d-b003-cdceaccaf01c" />

<img width="401" height="690" alt="image" src="https://github.com/user-attachments/assets/2cb92c49-09da-4f84-80ed-c5463866a513" />

## ✨ 主要功能

### 名片管理
- **智慧名片辨識**：傳送名片圖片，Bot 使用 Gemini Vision API 自動解析姓名、職稱、公司、電話、Email 等資訊
- **批量上傳**：一次傳送多張名片圖片，排程非同步 OCR 處理後推播摘要結果
- **互動式編輯**：辨識有誤時，直接在 LINE 中點擊按鈕修改欄位
- **備忘錄**：為每張名片添加備忘錄
- **標籤系統**：為名片套用角色標籤（如「客戶」、「合作夥伴」），支援依標籤篩選
- **智慧搜尋**：使用 Gemini NLU，輸入關鍵字（姓名、公司、需求等）快速找到相關名片
- **自動配對**：新增名片時，自動比對現有名片，避免重複（支援模糊匹配）
- **📥 一鍵加入通訊錄**：生成 vCard QR Code，掃描後直接匯入手機聯絡人（支援 iPhone/Android）
- **CSV 匯出**：將名片資料匯出為 CSV，以 Email 寄送

### 團隊協作
- **共享名片庫**：團隊成員共用同一個名片資料庫
- **邀請機制**：管理員產生邀請碼，成員輸入「加入 XXXXXX」加入團隊；附 LINE URI Scheme 一鍵分享按鈕
- **角色權限**：管理員可刪除任何名片；一般成員只能刪除自己新增的名片
- **Google Sheets 同步**：名片資料自動同步到指定 Google Sheet

### 自動追蹤與提醒
- **Follow 推播**：Bot 定期推播 Follow 清單中的聯絡人提醒，幫助業務主動跟進客戶
- **Proactive Onboarding**：新用戶上線時自動推播歡迎訊息與功能導覽

### 業務管理（Phase 4）
- **商機、活動、行動追蹤**：記錄與聯絡人相關的交易、會議、後續行動，完整追蹤業務流程

## 💬 指令列表

| 指令 | 說明 | 權限 |
|------|------|------|
| 傳送名片圖片 | 自動辨識並儲存（或進入批量模式） | 所有人 |
| 輸入任意文字 | 智慧搜尋名片 | 所有人 |
| `新增` | 選擇單張或批量排程上傳 | 所有人 |
| `完成` | 結束批量上傳、送出排程處理 | 所有人 |
| `匯出` / `export` | 將名片 CSV 以 Email 寄送 | 所有人 |
| `團隊` / `team` | 查看團隊資訊與自己的身份 | 所有人 |
| `成員` / `members` | 查看團隊成員清單 | 所有人 |
| `邀請` / `invite` | 產生邀請碼 | 管理員 |
| `加入 <邀請碼>` | 用邀請碼加入團隊 | 未加入者 |
| `設定團隊名稱 <名稱>` | 修改團隊名稱 | 管理員 |
| `remove` | 清除重複名片（依 email 去重） | 所有人 |

## 🗄️ 資料庫結構

```
organizations/
  {org_id}/
    name: string
    created_by: user_id
    members/
      {user_id}/
        role: "admin" | "member"
        joined_at: string
    tags/roles/{push_id}/name: string   ← 角色標籤

user_org_map/
  {user_id}: org_id

namecard/
  {org_id}/
    {card_id}/
      name, title, company, address, phone, email
      added_by: user_id
      created_at: string
      memo?: string

namecard_cache/
  {card_id}/roles: [tag_names]          ← 名片標籤快取

invite_codes/
  {code}/
    org_id, created_by, expires_at

batch_states/
  {user_id}/
    org_id, pending_images: [...], created_at, updated_at
```

## 📱 vCard QR Code 功能

1. 上傳名片圖片 → Gemini Pro Vision API 辨識
2. 查看名片 Flex Message
3. 點擊「📥 加入通訊錄」
4. 收到 QR Code 圖片
5. 用手機相機掃描 → 直接提示「加入聯絡人」✅

| 平台 | 支援情況 |
|------|---------|
| iPhone | ✅ 相機 App 原生識別 |
| Android | ✅ Google Lens 或相機掃描 |

## 🚀 部署到 Google Cloud Run

### 1. 建立 env.yaml

```yaml
# 必要配置
ChannelSecret: 'YOUR_CHANNEL_SECRET'
ChannelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN'
GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY'
FIREBASE_URL: 'https://{your-project-id}-default-rtdb.asia-southeast1.firebasedatabase.app/'
GOOGLE_APPLICATION_CREDENTIALS_JSON: 'PASTE_SERVICE_ACCOUNT_JSON_HERE'

# 選填：啟用 QR Code 與批量上傳
FIREBASE_STORAGE_BUCKET: '{your-project-id}.firebasestorage.app'
CLOUD_TASKS_QUEUE: 'namecard-batch'
CLOUD_TASKS_LOCATION: 'asia-east1'
CLOUD_RUN_URL: 'https://{your-cloud-run-url}'
GOOGLE_CLOUD_PROJECT: '{your-project-id}'

# 選填：其他功能
GOOGLE_SHEET_ID: 'YOUR_GOOGLE_SHEET_ID'
SMTP_USER: 'YOUR_SMTP_EMAIL'
SMTP_PASSWORD: 'YOUR_SMTP_PASSWORD'
LIFF_CHANNEL_ID: 'YOUR_LINE_CHANNEL_ID'
LIFF_ID: 'YOUR_LIFF_APP_ID'
```

> **注意**：`env.yaml` 已加入 `.gitignore`，不會被 commit。

### 2. Build & Deploy

```bash
# Build
gcloud builds submit --tag gcr.io/{PROJECT_ID}/{IMAGE_NAME}

# Deploy
gcloud run deploy {IMAGE_NAME} \
  --image gcr.io/{PROJECT_ID}/{IMAGE_NAME} \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --env-vars-file env.yaml
```

### 3. 設定 LINE Webhook URL

LINE Developers Console → Messaging API → Webhook URL：

```
https://{your-cloud-run-url}/
```

### 環境變數說明

| 變數 | 必要 | 說明 |
|------|------|------|
| `ChannelSecret` | ✅ | LINE Channel secret |
| `ChannelAccessToken` | ✅ | LINE Channel access token |
| `GEMINI_API_KEY` | ✅ | Google Gemini API 金鑰 |
| `FIREBASE_URL` | ✅ | Firebase Realtime Database URL |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | ✅ | Firebase service account JSON 字串 |
| `FIREBASE_STORAGE_BUCKET` | 選填 | Firebase Storage bucket 名稱（QR Code、批量上傳暫存用） |
| `GOOGLE_SHEET_ID` | 選填 | Google Sheet ID（啟用自動同步） |
| `SMTP_USER` | 選填 | SMTP 帳號（啟用 CSV Email 匯出） |
| `SMTP_PASSWORD` | 選填 | SMTP 密碼 |
| `CLOUD_TASKS_QUEUE` | 選填 | Cloud Tasks queue 名稱（啟用批量上傳） |
| `CLOUD_TASKS_LOCATION` | 選填 | Cloud Tasks 地區（預設 `asia-east1`） |
| `CLOUD_RUN_URL` | 選填 | Cloud Run 服務 URL（批量上傳回呼用） |
| `GOOGLE_CLOUD_PROJECT` | 選填 | GCP 專案 ID（Cloud Tasks 用） |
| `LIFF_CHANNEL_ID` | 選填 | LINE Channel ID（LIFF id_token 驗證用） |
| `LIFF_ID` | 選填 | LIFF App ID（Web UI 動態注入） |
| `DEFAULT_ORG_ID` | 選填 | 預設 org_id，預設為 `org_default` |

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## 🛠️ 本地開發

```bash
pip install -r requirements.txt
uvicorn app.main:app --host=0.0.0.0 --port=8080
```

## 📜 License

MIT License
