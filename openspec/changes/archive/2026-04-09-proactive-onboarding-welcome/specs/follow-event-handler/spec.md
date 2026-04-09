## ADDED Requirements

### Requirement: Send onboarding welcome when user follows the OA

The system SHALL detect when a user follows the LINE OA and immediately send a proactive welcome message with onboarding Quick Reply choices.

#### Scenario: User follows the OA for the first time
- **WHEN** a LINE Follow event is received from a user who has not yet joined the OA
- **THEN** the system sends a push message containing the onboarding welcome message with two Quick Reply buttons (「🏢 建立團隊」and 「🔗 加入既有團隊」)
- **AND** the user_id is extracted from the Follow event and the message is sent via `push_message(user_id, message)`

#### Scenario: Webhook receives Follow event
- **WHEN** a Follow event is dispatched in the FastAPI webhook handler (`app/main.py`)
- **THEN** the event is routed to `handle_follow_event(event)` handler in `app/line_handlers.py`
- **AND** the handler extracts `event.source.user_id` and `event.reply_token` from the event object

#### Scenario: Onboarding welcome message format
- **WHEN** the welcome message is generated via `flex_messages.get_onboarding_welcome_message()`
- **THEN** the message contains the text 「歡迎使用名片管理機器人 👋 請先選擇「建立團隊」或是「加入既有團隊」」
- **AND** two Quick Reply buttons are attached:
  - Button 1: Label 「🏢 建立團隊」, type PostbackAction, data `action=create_org`
  - Button 2: Label 「🔗 加入既有團隊」, type MessageAction, text 「加入 」

#### Scenario: Error handling during push
- **WHEN** `push_message` raises an exception (e.g., network error, invalid user_id)
- **THEN** the error is logged to stdout with context (user_id, error message)
- **AND** the webhook returns a 200 OK response (webhook must not fail due to downstream issues)
