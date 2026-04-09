## Why

Currently, new users must send their first message before seeing the onboarding prompt. This delays guidance and creates friction. By sending a welcome message immediately when users follow the OA, we provide instant clarity on next steps and improve first-time UX.

**Phase**: Phase 2 — 團隊化

## What Changes

- Add LINE Follow event handler (`handle_follow_event`) to detect when users join the OA
- Send proactive onboarding message + Quick Reply when Follow event is received
- Keep the existing interception mechanism (`check_onboarding`) as a fallback for users who dismiss the welcome message without completing onboarding

## Capabilities

### New Capabilities
- `follow-event-handler`: Handle LINE Follow event and send proactive welcome message with onboarding Quick Reply

### Modified Capabilities
- `onboarding-flow`: Keep existing interception mechanism, now acts as fallback only (user already saw welcome once on Follow, but may need reminder if dismissed)

## Impact

- **Webhook handler** (`app/main.py`): Register Follow event handler in webhook dispatcher
- **Line handlers** (`app/line_handlers.py`): Add `handle_follow_event` function to send welcome message
- **Flex messages** (`app/flex_messages.py`): Create dedicated `get_onboarding_welcome_message()` template (reuse existing Quick Reply content)
- **No database schema changes**: Onboarding logic remains stateless (no state table needed)
- **LINE API surface**: Requires Follow event type support (already in line-bot-sdk 3.5.0)

## Non-goals

- Storing onboarding acceptance state (not needed — interception remains as fallback)
- Personalizing welcome message by referencing user profile (keep simple and lightweight)
- Rich content (e.g., carrousel) for welcome — single Flex Message with Quick Reply is enough
