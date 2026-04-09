## ADDED Requirements

### Requirement: 名片操作 menu shows Quick Reply with card sub-actions
When `action=menu_card` postback is received, the system SHALL reply with a text message and Quick Reply buttons for card-related sub-actions.

#### Scenario: User opens 名片操作 menu
- **WHEN** postback event with `action=menu_card` is received
- **THEN** system SHALL reply with Quick Reply containing buttons: 「新增名片」、「批量上傳」、「智慧搜尋」、「管理名片」

#### Scenario: 新增名片 button triggers add flow
- **WHEN** user taps 「新增名片」 in the Quick Reply
- **THEN** system SHALL send a MessageAction text `新增` to trigger the existing add card flow

#### Scenario: 智慧搜尋 button prompts user to type
- **WHEN** user taps 「智慧搜尋」 in the Quick Reply
- **THEN** system SHALL reply with a text message prompting user to type search keywords

### Requirement: 團隊功能 menu shows Quick Reply with team sub-actions
When `action=menu_team` postback is received, the system SHALL reply with a text message and Quick Reply buttons for team-related sub-actions.

#### Scenario: User opens 團隊功能 menu
- **WHEN** postback event with `action=menu_team` is received
- **THEN** system SHALL reply with Quick Reply containing buttons: 「查看團隊資訊」、「查看成員」、「邀請成員」、「加入團隊」

#### Scenario: 查看團隊資訊 maps to team command
- **WHEN** user taps 「查看團隊資訊」 in the Quick Reply
- **THEN** system SHALL process it as if user typed `team`

### Requirement: 資料與設定 menu shows Quick Reply with data sub-actions
When `action=menu_data` postback is received, the system SHALL reply with a text message and Quick Reply buttons for data and settings sub-actions.

#### Scenario: User opens 資料與設定 menu
- **WHEN** postback event with `action=menu_data` is received
- **THEN** system SHALL reply with Quick Reply containing buttons: 「匯出 CSV」、「Google Sheets 同步狀態」

#### Scenario: 匯出 CSV maps to export command
- **WHEN** user taps 「匯出 CSV」 in the Quick Reply
- **THEN** system SHALL process it as if user typed `匯出`
