## MODIFIED Requirements

### Requirement: Postback handler routes menu actions
The postback event handler SHALL recognize `action=menu_card`, `action=menu_team`, and `action=menu_data` as valid postback actions and delegate to the corresponding Quick Reply reply function. All previously supported postback actions (e.g., `action=edit`, `action=delete`, `action=batch_start`) MUST continue to function without change.

#### Scenario: menu_card postback is routed correctly
- **WHEN** postback event data contains `action=menu_card`
- **THEN** system SHALL call `handle_menu_card(reply_token)` which replies with the 名片操作 Quick Reply

#### Scenario: menu_team postback is routed correctly
- **WHEN** postback event data contains `action=menu_team`
- **THEN** system SHALL call `handle_menu_team(reply_token)` which replies with the 團隊功能 Quick Reply

#### Scenario: menu_data postback is routed correctly
- **WHEN** postback event data contains `action=menu_data`
- **THEN** system SHALL call `handle_menu_data(reply_token)` which replies with the 資料與設定 Quick Reply

#### Scenario: Existing postback actions still work
- **WHEN** postback event data contains any previously supported action (e.g., `action=edit&card_id=xxx`)
- **THEN** system SHALL route to the existing handler without interference from menu routing logic
