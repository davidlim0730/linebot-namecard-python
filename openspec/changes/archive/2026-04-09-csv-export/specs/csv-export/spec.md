## IMPLEMENTED Requirements

> 本 spec 為事後補記（retroactive），描述已在 `app/csv_export.py` 與 `app/line_handlers.py` 實作的 CSV 匯出功能。

---

### Requirement: 觸發匯出流程

The system SHALL allow users to trigger CSV export by sending the text `匯出` or `export`, or by tapping the Rich Menu 資料與設定 → 📤 匯出 CSV Quick Reply button.

#### Scenario: User triggers export when SMTP is not configured
- **WHEN** user sends `匯出` or `export`
- **AND** `SMTP_USER` or `SMTP_PASSWORD` env var is not set
- **THEN** the system replies with `匯出功能尚未設定，請聯繫管理員。`
- **AND** no state is saved

#### Scenario: User triggers export when SMTP is configured
- **WHEN** user sends `匯出` or `export`
- **AND** `SMTP_USER` and `SMTP_PASSWORD` are set
- **THEN** the system saves `user_states[user_id] = {'action': 'exporting_csv', 'org_id': org_id}`
- **AND** replies with `請輸入您的 email 地址，CSV 將寄送至該信箱：`

---

### Requirement: 輸入 Email 並寄送

The system SHALL validate the email input and send the CSV to the provided address.

#### Scenario: User inputs an invalid email
- **WHEN** user is in `exporting_csv` state
- **AND** the input does not match the pattern `^[^@]+@[^@]+\.[^@]+$`
- **THEN** the system replies with `請輸入有效的 email 地址，例如：yourname@example.com`
- **AND** state is NOT cleared (user can retry)

#### Scenario: User inputs a valid email
- **WHEN** user is in `exporting_csv` state
- **AND** the input is a valid email address
- **THEN** the system clears `user_states[user_id]`
- **AND** fetches all cards for the org via `firebase_utils.get_all_cards(org_id)`
- **AND** generates CSV bytes via `csv_export.generate_csv(cards, org_name)`
- **AND** sends email via `csv_export.send_csv_email(csv_bytes, email, org_name)`
- **AND** replies with `CSV 已寄送至 {email}，請查收信箱。`

#### Scenario: Email sending fails
- **WHEN** `send_csv_email` raises an exception
- **THEN** the system replies with an error message asking the user to try again later
- **AND** the error is logged to stdout

---

### Requirement: CSV 格式

The system SHALL generate a UTF-8 BOM encoded CSV file compatible with Microsoft Excel.

#### CSV properties
- **Encoding**: UTF-8 with BOM (`\xef\xbb\xbf`)
- **Filename**: `namecards_{YYYY-MM-DD}.csv`
- **Email subject**: `名片匯出 - {org_name}`

#### CSV columns (in order)
| 欄位 | Firebase 對應 | 備註 |
|------|--------------|------|
| `name` | `name` | |
| `title` | `title` | 職稱 |
| `company` | `company` | |
| `address` | `address` | |
| `phone` | `phone` | |
| `email` | `email` | |
| `memo` | `memo` | 備註，選填 |
| `role_tags` | `role_tags` (list) | 多個標籤以逗號串接 |
| `added_by` | `added_by` | LINE user_id |
| `created_at` | `created_at` | ISO8601 |

#### Scope
- 匯出範圍為該 org 的**全部**名片（不支援篩選，為 Phase 2 基本版；進階篩選留給 Phase 3）

---

### Requirement: 傳送機制

The system SHALL send CSV via Gmail SMTP over SSL.

#### SMTP configuration
- **Host**: `smtp.gmail.com`
- **Port**: `465` (SSL)
- **Auth**: `SMTP_USER` / `SMTP_PASSWORD` env vars
- **From**: `SMTP_USER`
