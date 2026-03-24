Review the changed code in this project for quality, architecture alignment, and security.

## Review Checklist

### 1. Design Principles Compliance
- **Platform decoupling**: Check if new code directly depends on LINE SDK or Firebase in business logic. Business logic should live in a service layer, not in `line_handlers.py` or `firebase_utils.py`.
- **No LINE SDK coupling**: Handler functions should delegate to service functions. If a new feature adds logic directly in a handler, flag it.
- **No Firebase coupling**: Data access should go through `firebase_utils.py`. If other modules import `firebase_admin` directly, flag it.

### 2. Code Placement
- **Handlers** (`line_handlers.py`): Should only parse LINE events and call service functions. No business logic.
- **Utils** (`gemini_utils.py`, `firebase_utils.py`, `gsheets_utils.py`): Data access and external API calls only.
- **Flex Messages** (`flex_messages.py`): UI templates only, no data fetching.
- If business logic is found in the wrong layer, suggest where it should move.

### 3. Security
- No hardcoded API keys, secrets, or credentials in code
- User input is validated before passing to Gemini API or Firebase
- No SQL injection / NoSQL injection risks in database queries
- Firebase Security Rules are not overly permissive

### 4. Code Quality
- Functions are focused and not doing too many things
- Error handling exists for external API calls (LINE, Gemini, Firebase)
- No duplicate code that should be extracted

## Output Format

For each issue found, provide:
- **File and line**: Where the issue is
- **Severity**: Critical / Warning / Suggestion
- **Issue**: What's wrong
- **Fix**: How to fix it

If no issues are found, confirm the code looks good and briefly explain why.
