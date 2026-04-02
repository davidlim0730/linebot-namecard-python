## ADDED Requirements

### Requirement: OCR 提取 mobile 與 line_id
Gemini OCR Prompt SHALL 包含 `mobile`（行動電話）與 `line_id`（LINE ID）欄位的說明，明確指示與 `phone`（市話）的區別。

#### Scenario: 名片含手機號碼
- **WHEN** 用戶傳送含有「09」開頭手機號碼的名片圖片
- **THEN** Gemini OCR 結果的 `mobile` 欄位 MUST 包含該手機號碼
- **THEN** `phone` 欄位 MUST NOT 包含該手機號碼（除非名片上無市話）

#### Scenario: 名片含 LINE ID
- **WHEN** 用戶傳送含有「LINE:」或「ID:」標示的名片圖片
- **THEN** Gemini OCR 結果的 `line_id` 欄位 MUST 包含對應帳號

#### Scenario: 名片無手機或 LINE ID
- **WHEN** 名片圖片上無法識別 mobile 或 line_id
- **THEN** 對應欄位值 MUST 為「N/A」

### Requirement: 欄位格式驗證
系統 SHALL 在儲存名片前執行 `validate_namecard_fields()`，對 `phone`、`mobile`、`email`、`line_id` 進行格式驗證，不符合格式者設為 N/A。

#### Scenario: 有效手機號碼通過驗證
- **WHEN** `mobile` 為「0912345678」或「+886912345678」
- **THEN** 驗證後 `mobile` MUST 保持原值

#### Scenario: 無效手機號碼被設為 N/A
- **WHEN** `mobile` 為「12345」或其他不符台灣手機格式的字串
- **THEN** 驗證後 `mobile` MUST 為「N/A」

#### Scenario: 有效 email 通過驗證
- **WHEN** `email` 符合 `user@domain.tld` 格式
- **THEN** 驗證後 `email` MUST 保持原值

#### Scenario: 無效 email 被設為 N/A
- **WHEN** `email` 為「not-an-email」或不含 `@` 的字串
- **THEN** 驗證後 `email` MUST 為「N/A」

#### Scenario: 有效 LINE ID 通過驗證
- **WHEN** `line_id` 為 4–20 個英數字、底線、句點組成的字串
- **THEN** 驗證後 `line_id` MUST 保持原值

#### Scenario: LINE ID 過短被設為 N/A
- **WHEN** `line_id` 少於 4 個字元
- **THEN** 驗證後 `line_id` MUST 為「N/A」

#### Scenario: 欄位原本為 N/A 則保持不變
- **WHEN** `phone` 為「N/A」
- **THEN** 驗證後 `phone` MUST 仍為「N/A」

#### Scenario: 不存在的欄位不被新增
- **WHEN** 傳入 card dict 不含 `mobile` 欄位
- **THEN** 驗證後 result MUST NOT 含 `mobile` 欄位

### Requirement: Flex Message 顯示新欄位
名片詳細 Flex Message SHALL 顯示 `mobile` 與 `line_id` 欄位，欄位值為 N/A 時不顯示該列。

#### Scenario: mobile 有值時顯示
- **WHEN** 名片的 `mobile` 欄位不為「N/A」且不為空
- **THEN** Flex Message body MUST 包含「Mobile」標籤列及對應值

#### Scenario: mobile 為 N/A 時不顯示
- **WHEN** 名片的 `mobile` 欄位為「N/A」
- **THEN** Flex Message body MUST NOT 包含「Mobile」標籤列

#### Scenario: line_id 有值時顯示
- **WHEN** 名片的 `line_id` 欄位不為「N/A」且不為空
- **THEN** Flex Message body MUST 包含「LINE ID」標籤列及對應值

#### Scenario: line_id 為 N/A 時不顯示
- **WHEN** 名片的 `line_id` 欄位為「N/A」
- **THEN** Flex Message body MUST NOT 包含「LINE ID」標籤列

### Requirement: 新欄位可編輯
`mobile` 與 `line_id` SHALL 加入 `ALLOWED_EDIT_FIELDS`，用戶可透過「編輯資料」功能修改。

#### Scenario: 用戶編輯 mobile 欄位
- **WHEN** 用戶在名片編輯流程中選擇「手機」欄位並輸入新值
- **THEN** 系統 MUST 更新 Firebase 中對應名片的 `mobile` 欄位
