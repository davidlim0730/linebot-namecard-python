Help test LINE Bot message handling by generating test fixtures and validating response logic.

## Capabilities

### 1. Generate Test Events
Generate mock LINE webhook event payloads for testing. When asked, create realistic JSON payloads for:

- **Text Message Event**: User sends a text query (e.g., search for a namecard, "test", "list", "remove" commands)
- **Image Message Event**: User sends a business card photo
- **Postback Event**: User taps a button (edit field, confirm action, pagination)

Base the event structure on LINE Messaging API v3 webhook event format.

### 2. Validate Flex Messages
Read Flex Message templates in `app/flex_messages.py` and check:
- JSON structure is valid per LINE Flex Message specification
- All required fields (type, layout, contents) are present
- Action objects have correct types and required parameters
- Text doesn't exceed LINE's character limits

### 3. Trace Handler Logic
Given a specific user scenario, trace the execution path through the code:
1. Start from `app/main.py` webhook endpoint
2. Follow through `app/line_handlers.py` to the relevant handler
3. Track which utils are called (`gemini_utils.py`, `firebase_utils.py`, etc.)
4. Identify the final response sent back to the user

Report each step with file and line references.

### 4. Suggest pytest Test Cases
Based on the current code, suggest concrete pytest test cases for:
- Handler functions with mocked LINE/Firebase/Gemini dependencies
- Utility functions (QR code generation, vCard formatting, Gemini prompt parsing)
- Edge cases (empty input, duplicate cards, missing fields, API failures)

## Usage Examples

- "Trace what happens when a user sends an image"
- "Generate a postback event for editing a namecard's phone field"
- "Validate all Flex Messages in the project"
- "Suggest test cases for the smart search feature"
