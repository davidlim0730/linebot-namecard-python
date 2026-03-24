## ADDED Requirements

### Requirement: 使用者可申請 CSV 匯出
使用者 SHALL 可透過 Quick Reply「📤 匯出」按鈕或文字指令「匯出」申請將組織名片資料匯出為 CSV 檔案。

#### Scenario: 使用者觸發匯出流程
- **WHEN** 使用者點擊「📤 匯出」或輸入「匯出」
- **THEN** 系統 SHALL 回覆「請輸入您的 email 地址，CSV 將寄送至該信箱：」

#### Scenario: 使用者輸入有效 email
- **WHEN** 使用者在匯出狀態下輸入合法 email（含 @ 和 domain）
- **THEN** 系統 SHALL 產生 CSV 檔並寄送至該 email，回覆「CSV 已寄送至 xxx@yyy.com，請查收信箱。」

#### Scenario: 使用者輸入無效 email
- **WHEN** 使用者在匯出狀態下輸入不合法的 email 格式
- **THEN** 系統 SHALL 回覆「email 格式不正確，請重新輸入。」，維持匯出狀態

### Requirement: CSV 檔案格式
CSV 檔案 SHALL 使用 UTF-8 BOM 編碼（確保 Excel 正確顯示中文），包含以下欄位順序：name, title, company, address, phone, email, memo, role_tags, added_by, created_at。

#### Scenario: CSV 包含所有名片
- **WHEN** 組織有 50 張名片，使用者申請匯出
- **THEN** CSV SHALL 包含 50 筆資料列加 1 行標題列

#### Scenario: role_tags 欄位格式
- **WHEN** 名片有多個角色標籤 `["客戶", "合作夥伴"]`
- **THEN** CSV 中 `role_tags` 欄位 SHALL 以逗號分隔字串呈現：「客戶,合作夥伴」

#### Scenario: 無標籤的名片
- **WHEN** 名片沒有 role_tags
- **THEN** CSV 中對應欄位 SHALL 為空字串

### Requirement: Email 寄送
系統 SHALL 使用 SMTP 寄送 CSV 附件到使用者指定的 email。寄件設定透過環境變數 `SMTP_USER` 和 `SMTP_PASSWORD` 配置。

#### Scenario: 寄送成功
- **WHEN** SMTP 設定正確且目標 email 可達
- **THEN** 使用者 SHALL 收到主旨為「名片匯出 - {org_name}」的郵件，附件為 `namecards_{date}.csv`

#### Scenario: 寄送失敗
- **WHEN** SMTP 連線失敗或遭拒
- **THEN** 系統 SHALL 回覆使用者「CSV 寄送失敗，請稍後再試或確認 email 地址。」

#### Scenario: SMTP 環境變數未設定
- **WHEN** `SMTP_USER` 或 `SMTP_PASSWORD` 環境變數未設定，使用者嘗試匯出
- **THEN** 系統 SHALL 回覆「匯出功能尚未設定，請聯繫管理員。」
