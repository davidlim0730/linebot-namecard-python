## Why

名片庫成長後，使用者面臨兩個核心痛點：(1) 無法快速分類與篩選名片——現有智慧搜尋只能靠自然語言比對欄位文字，無法依「對方角色」等維度分類篩選；(2) 無法將名片資料批量匯出——業務需要定期整理聯絡人清單寄送報表或匯入 CRM，目前只能逐筆查看。

## What Changes

- 新增**角色標籤系統**：
  - **角色標籤**（role tag）：可選，多選，預設分類包含「合作夥伴」「供應商」「客戶」「同業」「媒體/KOL」，也支援管理員自訂
- 名片詳情 Flex Message 顯示標籤
- 新增**標籤名單查詢**：使用者可點選標籤查看該標籤下的所有名片（簡易列表呈現，UI 之後再優化）
- 保留原有純文字 Gemini 智慧搜尋不變
- 新增**CSV 匯出**：使用者透過 Quick Reply 按鈕申請匯出，填寫 email，系統產生 CSV 並寄送

## Capabilities

### New Capabilities

- `tag-management`: 角色標籤 CRUD——建立、列出、刪除角色標籤；為名片指派 / 移除標籤
- `tag-list`: 點選標籤查看該標籤下的名片列表
- `csv-export`: 將使用者（組織內）所有名片匯出為 CSV，透過 email 寄送

### Modified Capabilities

- `quick-reply-navigation`: Quick Reply 按鈕群組新增「🏷 標籤」與「📤 匯出」兩顆按鈕

## Non-goals

- 不做生命週期標籤（本期只做角色標籤）
- 不做標籤的跨組織共享（標籤僅限組織層級）
- 不做即時 CSV 下載（LINE 不支援檔案直傳，統一走 email）
- 不做 CRM API 對接（Phase 4 範圍）
- 不做標籤的顏色或 icon 自訂
- 不做標籤搜尋 UI 優化（本期用最簡易方式呈現）

## Impact

- `app/firebase_utils.py`：新增標籤 CRUD 函式；名片資料結構新增 `role_tags` 欄位
- `app/line_handlers.py`：新增標籤管理指令、標籤名單查詢、匯出流程 handler
- `app/flex_messages.py`：名片詳情加入標籤顯示；新增標籤管理 Flex Message
- `app/csv_export.py`（新檔案）：CSV 產生與 email 寄送邏輯
- Firebase RTDB schema 變更：
  - `namecard/{org_id}/{card_id}/role_tags`: list of strings
  - `organizations/{org_id}/tags/roles/`: 角色標籤清單（含預設值）
- `requirements.txt`：無需新增（smtplib 為標準庫）

**Roadmap Phase**: Phase 3
