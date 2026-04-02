## ADDED Requirements

### Requirement: Clipboard action for contact fields
The full namecard Flex Message SHALL provide clipboard action buttons for phone, email, and address fields, enabling one-tap copy to the device clipboard.

#### Scenario: Copy phone number
- **WHEN** user taps the "複製" button next to the phone field
- **THEN** the phone number is copied to the device clipboard via LINE Clipboard Action (clipboardText = phone value)

#### Scenario: Copy email address
- **WHEN** user taps the "複製" button next to the email field
- **THEN** the email address is copied to the device clipboard via LINE Clipboard Action (clipboardText = email value)

#### Scenario: Copy address
- **WHEN** user taps the "複製" button next to the address field
- **THEN** the full address is copied to the device clipboard via LINE Clipboard Action (clipboardText = address value)

### Requirement: URI action for direct contact
The full namecard Flex Message SHALL provide URI action buttons for phone and email fields, enabling direct calling and emailing.

#### Scenario: Tap to call
- **WHEN** user taps the "撥打" button next to the phone field
- **THEN** the device opens the phone dialer with the number pre-filled via `tel:` URI scheme

#### Scenario: Tap to email
- **WHEN** user taps the "寄信" button next to the email field
- **THEN** the device opens the default email client with the recipient pre-filled via `mailto:` URI scheme

### Requirement: Contact field layout with action buttons
Each contact field (phone, email, address) SHALL be displayed as a horizontal row with the value on the left and action buttons on the right.

#### Scenario: Phone row layout
- **WHEN** the phone field is rendered
- **THEN** it displays as: `📞 {phone_value}` on the left, with "複製" (clipboard) and "撥打" (URI tel:) buttons on the right

#### Scenario: Email row layout
- **WHEN** the email field is rendered
- **THEN** it displays as: `📧 {email_value}` on the left, with "複製" (clipboard) and "寄信" (URI mailto:) buttons on the right

#### Scenario: Address row layout
- **WHEN** the address field is rendered
- **THEN** it displays as: `📍 {address_value}` on the left, with "複製" (clipboard) button on the right

#### Scenario: Field value is N/A
- **WHEN** a contact field value is "N/A"
- **THEN** the URI action button (撥打/寄信) SHALL be omitted, but the clipboard button MAY still appear

### Requirement: Preserved existing functionality
The redesigned namecard detail Flex Message SHALL retain all existing interactive features.

#### Scenario: Existing buttons preserved
- **WHEN** the full namecard is displayed
- **THEN** the footer SHALL still contain: "新增/修改記事", "編輯資料", "🏷 標籤", "📥 加入通訊錄", "🗑️ 刪除名片" buttons with their existing postback actions

#### Scenario: Memo and tags display
- **WHEN** the namecard has a memo or role_tags
- **THEN** the memo section and tag badges SHALL display as before, unchanged

#### Scenario: Header display
- **WHEN** the full namecard is displayed
- **THEN** the header SHALL show company, name (xxl bold), and title on a colored background, consistent with current design
