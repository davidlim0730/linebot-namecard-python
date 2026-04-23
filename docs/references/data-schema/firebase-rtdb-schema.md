# Firebase Realtime DB — Data Schema

**更新日期**：2026-04-20
**對應程式碼**：`app/models/`、`app/repositories/`、`app/config.py`

---

## 概覽

所有業務資料以 `org_id` 為多租戶隔離單位。資料庫路徑採用 flat key tree，無 join 能力，複雜查詢在 service layer 做 in-memory filter。

```
Firebase RTDB
├── organizations/
├── user_org_map/
├── invite_codes/
├── namecard/           ← 舊版（LINE Bot OCR）
├── contacts/           ← 新版 CRM
├── deals/
├── stage_change_events/
├── activities/
├── actions/
├── stakeholders/
├── products/
├── batch_states/
├── namecard_cache/
└── display_name_cache/
```

---

## 組織與成員

### `organizations/{org_id}/`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `name` | string | 組織名稱 |
| `created_by` | string | 建立者 user_id |
| `plan_type` | string? | 方案類型 |
| `trial_ends_at` | ISO8601? | 試用期截止 |
| `members/{user_id}/role` | string | `"admin"` \| `"member"` |
| `members/{user_id}/joined_at` | ISO8601 | 加入時間 |
| `members/{user_id}/display_name` | string? | LINE 顯示名稱 |
| `tags/roles/{push_id}/name` | string | 角色標籤（舊版名片用） |

### `user_org_map/{user_id}`

值為 `org_id`（string）。使用者與組織的索引，`ensure_user_org()` 每次請求都查詢此路徑。

### `invite_codes/{code}/`

| 欄位 | 型別 |
|---|---|
| `org_id` | string |
| `created_by` | string |
| `created_at` | ISO8601 |
| `expires_at` | ISO8601 |

---

## 名片（舊版 — Legacy，不再寫入）

### `namecard/{org_id}/{card_id}/`

路徑常數：`config.NAMECARD_PATH = "namecard"`
模型：`app/models/card.py` → `Card`

> **⚠️ Legacy**：新資料改寫 `contacts/`。舊資料由 `scripts/migrate_namecard_to_contacts.py` 搬移。OCR / Batch 流程已不再寫入此路徑。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `name` | string? | 姓名 |
| `title` | string? | 職稱 |
| `company` | string? | 公司（純字串，已由 contacts 的 company Contact 取代） |
| `address` | string? | 地址 |
| `phone` | string? | 市話 |
| `mobile` | string? | 手機 |
| `email` | string? | Email |
| `line_id` | string? | LINE ID |
| `memo` | string? | 備註 |
| `role_tags` | string[] | 標籤（已搬至 contacts.tags） |
| `added_by` | string | 新增者 user_id |
| `created_at` | ISO8601 | 建立時間 |

---

## 聯絡人（CRM 主表）

### `contacts/{org_id}/{contact_id}/`

路徑常數：`config.CONTACT_PATH = "contacts"`
模型：`app/models/card.py` → `Contact`

**Person 與 Company 共用此表**，以 `contact_type` 區分。

#### Source 來源值

| 值 | 說明 |
|---|---|
| `"ocr"` | LINE Bot 掃描名片 |
| `"nlu"` | NLU 對話建立 |
| `"manual"` | 手動建立 |
| `"marketing_list"` | 行銷名單匯入 |
| `"referral"` | 轉介紹 |
| `"import"` | CSV 批次匯入 |
| `"liff"` | LIFF 介面建立 |

| 欄位 | 型別 | 說明 |
|---|---|---|
| `contact_type` | string | `"person"` \| `"company"` |
| `display_name` | string | 顯示名稱（必填） |
| `legal_name` | string? | 正式名稱 |
| `aliases` | string[] | 別名清單 |
| `parent_company_id` | string? | 所屬 Company Contact 的 contact_id（person 用） |
| `company_name` | string? | 公司名稱（denormalized，供 Flex Message 快速顯示） |
| `title` | string? | 職稱 |
| `phone` | string? | 市話 |
| `mobile` | string? | 手機 |
| `email` | string? | Email |
| `line_id` | string? | LINE ID |
| `address` | string? | 地址 |
| `memo` | string? | 備註 |
| `tags` | string[] | 聯絡人標籤（從 namecard.role_tags 搬來） |
| `source` | string | 來源（見上方 Source 表，預設 `"manual"`） |
| `raw_card_data` | object? | OCR 原始掃描結果（僅 source=ocr 有值，審計用） |
| `industry` | string? | 產業（company 專屬） |
| `website` | string? | 網站（company 專屬） |
| `added_by` | string | 新增者 user_id |
| `created_at` | ISO8601 | 建立時間 |
| `updated_at` | ISO8601? | 更新時間 |

> 去重邏輯：以 `email`（case-insensitive）為主鍵，`ContactRepo.check_exists_by_email()` 比對。
> Company 去重：`ContactRepo.find_or_create_company()` 以 `display_name`（case-insensitive）比對。

---

## 商機

### `deals/{org_id}/{deal_id}/`

模型：`app/models/deal.py` → `Deal`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `entity_name` | string | 客戶/合作對象名稱 |
| `company_contact_id` | string? | 公司 Contact FK |
| `contract_entity_id` | string? | 簽約實體 Contact FK |
| `poc_contact_id` | string? | 主要窗口 Contact FK |
| `stage` | string | `"0"`～`"6"` \| `"成交"` \| `"失敗"` |
| `is_pending` | boolean? | 是否擱置中 |
| `product_id` | string? | Product FK |
| `est_value` | int? | 預估金額（TWD） |
| `next_action_date` | YYYY-MM-DD? | 下次行動日期 |
| `status_summary` | string | 一行現況摘要（中文） |
| `added_by` | string? | 建立者 user_id |
| `created_at` | ISO8601? | 建立時間 |
| `updated_at` | ISO8601? | 更新時間 |

**Stage 定義**

| 值 | 意義 |
|---|---|
| `"0"` | 初步接觸 |
| `"1"` | 需求確認 |
| `"2"` | 提案中 |
| `"3"` | 報價送出 |
| `"4"` | 議價協商 |
| `"5"` | 合約審查 |
| `"6"` | 等待簽約 |
| `"成交"` | 已成交 |
| `"失敗"` | 已流失 |

### `stage_change_events/{org_id}/{event_id}/`

模型：`app/models/deal.py` → `StageChangeEvent`

| 欄位 | 型別 |
|---|---|
| `deal_id` | string |
| `from_stage` | string |
| `to_stage` | string |
| `updated_by` | string |
| `created_at` | ISO8601 |

---

## 互動記錄

### `activities/{org_id}/{activity_id}/`

模型：`app/models/activity.py` → `Activity`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `deal_id` | string? | 關聯商機 |
| `contact_id` | string? | 關聯聯絡人 |
| `entity_name` | string? | 對象名稱（deal_id 為空時用於搜尋） |
| `raw_transcript` | string | 原始輸入文字（保留原文） |
| `ai_key_insights` | string[] | AI 摘要，最多 3 條，各 ≤30 字 |
| `sentiment` | string | `"Positive"` \| `"Neutral"` \| `"Negative"` |
| `is_human_corrected` | boolean | 使用者是否已手動編輯 |
| `edit_log` | string? | 編輯歷史（JSON 字串） |
| `added_by` | string? | 新增者 user_id |
| `created_at` | ISO8601? | 建立時間 |

---

## 待辦事項

### `actions/{org_id}/{action_id}/`

模型：`app/models/action.py` → `Action`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `deal_id` | string? | 關聯商機 |
| `contact_id` | string? | 關聯聯絡人 |
| `entity_name` | string? | 對象名稱 |
| `task_detail` | string | 具體可執行的任務描述 |
| `due_date` | YYYY-MM-DD? | 截止日期 |
| `status` | string | `"pending"` \| `"completed"` |
| `added_by` | string | 建立者 user_id |
| `created_at` | ISO8601 | 建立時間 |

---

## 利害關係人

### `stakeholders/{org_id}/{stakeholder_id}/`

模型：`app/models/stakeholder.py` → `Stakeholder`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `deal_id` | string | 所屬商機（必填） |
| `name` | string | 姓名 |
| `title` | string? | 職稱 |
| `role` | string | `"Champion"` \| `"Decision Maker"` \| `"Gatekeeper"` |
| `attitude` | string? | `"Supportive"` \| `"Neutral"` \| `"Skeptical"` |
| `email` | string? | Email |
| `phone` | string? | 電話 |
| `contact_id` | string? | 關聯 Contact FK |
| `is_champion` | boolean | 是否為 Champion |
| `notes` | string? | 補充備註 |
| `added_by` | string | 建立者 user_id |
| `created_at` | ISO8601 | 建立時間 |

---

## 產品線

### `products/{org_id}/{product_id}/`

模型：`app/models/product.py` → `Product`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `name` | string | 產品線名稱 |
| `status` | string | `"Active"` \| `"Beta"` \| `"Sunset"` |
| `description` | string? | 描述（供 NLU grounding 使用） |
| `created_at` | ISO8601 | 建立時間 |

---

## 系統暫態與快取

### `batch_states/{user_id}/`

批量上傳進行中的暫態，`clear_batch_state()` 完成後清除。

| 欄位 | 型別 |
|---|---|
| `org_id` | string |
| `pending_images` | string[] （Storage 路徑） |
| `created_at` | ISO8601 |
| `updated_at` | ISO8601 |

### `namecard_cache/{card_id}/roles`

值為 `string[]`，舊版名片的標籤快取。

### `display_name_cache/{user_id}`

值為 `string`，LINE 顯示名稱快取。

---

## 關聯圖

```
Org
 └── Contact (person/company)
      └── parent_company_id → Contact (company)

Deal
 ├── company_contact_id → Contact
 ├── contract_entity_id → Contact
 ├── poc_contact_id → Contact
 ├── product_id → Product
 ├── Stakeholder[]
 │    └── contact_id → Contact (optional)
 ├── Activity[]
 └── Action[]
```

---

## Firebase Storage

```
qrcodes/{user_id}/{card_id}.png            ← QR Code，公開讀取
raw_images/{org_id}/{user_id}/{uuid}.jpg   ← 批量上傳暫存，處理後刪除
```
