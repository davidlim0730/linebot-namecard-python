## 1. Firebase Schema & Data Layer

- [x] 1.1 Add `get_user_org_id(user_id)` to `firebase_utils.py` — reads `user_org_map/{user_id}`, returns org_id or None
- [x] 1.2 Add `create_org(user_id, org_name)` to `firebase_utils.py` — writes `organizations/{org_id}` with admin member and `user_org_map/{user_id}`
- [x] 1.3 Add `get_org(org_id)` to `firebase_utils.py` — returns org name, members dict
- [x] 1.4 Add `get_user_role(org_id, user_id)` to `firebase_utils.py` — reads `organizations/{org_id}/members/{user_id}/role`
- [x] 1.5 Add `add_member(org_id, user_id, role)` and `remove_member(org_id, user_id)` to `firebase_utils.py`
- [x] 1.6 Update all namecard CRUD functions in `firebase_utils.py` to accept `org_id` instead of `user_id` as path prefix (save, get, list, delete, update)
- [x] 1.7 Update namecard save function to include `added_by: user_id` field
- [x] 1.8 Add invite code functions to `firebase_utils.py`: `create_invite_code(org_id, created_by)` → returns 6-char code; `get_invite_code(code)` → returns record or None; `delete_invite_code(code)` [Firebase index note: no index needed, direct key lookup]

## 2. Organization Bootstrap (auto-create on first use)

- [x] 2.1 Add `ensure_user_org(user_id)` helper — calls `get_user_org_id`; if None, calls `create_org` with default name `"{user_id}的團隊"` and returns org_id
- [x] 2.2 Integrate `ensure_user_org` at the top of all message handlers in `line_handlers.py` so every interaction has a valid org_id

## 3. Migration Script

- [x] 3.1 Create `scripts/migrate_phase2.py` — reads all `namecard/{user_id}/` paths, copies each card to `namecard/org_default/{card_id}/` with `added_by: user_id`, creates `organizations/org_default` with all existing user_ids as members (first user = admin), writes `user_org_map` for all users
- [x] 3.2 Add idempotency check to migration script — skip card_ids that already exist under `namecard/org_default/`

## 4. Role-Based Permission Guard

- [x] 4.1 Add `require_admin(org_id, user_id)` guard function in `firebase_utils.py` or a new `app/permissions.py` — returns True/False
- [x] 4.2 Wrap delete namecard handler in `line_handlers.py` with permission check: admin can delete any card; member can only delete if `added_by == user_id`; reply「此名片非您新增，無法刪除」on denial
- [x] 4.3 Wrap admin-only text commands (邀請, 設定團隊名稱, remove member flow) with `require_admin` check; reply「此功能僅限管理員使用」on denial

## 5. Team Commands — Text Handlers

- [x] 5.1 Add handler for「團隊」/「team」command in `line_handlers.py` — replies with org name, member count, user's role (Flex Message preview: simple bubble with org name as title, member count, role badge)
- [x] 5.2 Add handler for「成員」/「members」command — replies with a list of members with display name and role (Flex Message preview: carousel or list bubble with each member as a row)
- [x] 5.3 Add handler for「設定團隊名稱 <name>」— admin only; updates org name in Firebase and confirms
- [x] 5.4 Add handler for「邀請」/「invite」command — admin only; generates invite code and replies with code + expiry (Flex Message preview: bubble showing the 6-char code in large text and expiry date)
- [x] 5.5 Add handler for「加入 <code>」— available to users with no org; validates code, adds user to org, replies with welcome message including org name

## 6. Flex Message Templates

- [x] 6.1 Add `team_info_flex(org_name, member_count, user_role)` to `flex_messages.py` — bubble card with org name, member count, role chip
- [x] 6.2 Add `member_list_flex(members)` to `flex_messages.py` — list of members with name + role; `members` is list of `{display_name, role}` dicts
- [x] 6.3 Add `invite_code_flex(code, expires_at, org_name)` to `flex_messages.py` — bubble with code displayed prominently, expiry date, and a「分享邀請」URI action button (Flex Message preview: large code text center-aligned, expiry in subtitle, share button at bottom; URI: `https://line.me/R/msg/text/` + URL-encoded invite text containing org_name and code)
- [x] 6.4 Update namecard detail Flex Message in `flex_messages.py` to include「新增者」row showing `added_by` display name

## 7. Google Sheets Sync Update

- [x] 7.1 Update `gsheets_utils.py` to sync `namecard/{org_id}/` instead of `namecard/{user_id}/`; add `added_by` column to the sheet output
- [x] 7.2 Update sync trigger in `line_handlers.py` to pass `org_id` to the sync function

## 8. Config & Env

- [x] 8.1 Add optional `DEFAULT_ORG_ID` env var to `config.py` for migration purposes (defaults to `"org_default"` if not set)
