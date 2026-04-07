## 1. Data Layer — Trial Fields & Atomic Counting

- [x] 1.1 Modify `create_org` in `app/firebase_utils.py` to write `plan_type=trial`, `trial_ends_at=now+7d` (UTC), `usage.scan_count=0`
- [x] 1.2 Add `increment_scan_count(org_id)` in `app/firebase_utils.py` using Firebase Transaction (`ref.transaction()`)
- [x] 1.3 Call `increment_scan_count` in `add_namecard` after successful push (non-duplicate only)
- [x] 1.4 Modify `ensure_user_org` to return `(org_id, is_new: bool)` tuple

## 2. Permission Check — Core Gate

- [x] 2.1 Add constants `TRIAL_SCAN_LIMIT=50`, `TRIAL_MEMBER_LIMIT=3` in `app/firebase_utils.py`
- [x] 2.2 Add `check_org_permission(org_id, action_type)` in `app/firebase_utils.py` — returns `{'allowed': bool, 'reason': str}`; handles grandfathering (`plan_type is None` → pro), pro pass-through, trial expiry, scan limit, member limit

## 3. Batch Upload Guard

- [x] 3.1 Add per-image quota check in `app/batch_processor.py` loop — call `check_org_permission(org_id, 'scan')` before each image, break on denial, set `quota_hit`/`quota_reason` in result
- [x] 3.2 Update `send_batch_summary_push` in `app/line_handlers.py` to include quota exceeded warning when `quota_hit=True` (message: "⚠️ 已達用量上限...")

## 4. Paywall UI — Flex Messages

- [x] 4.1 Add `LINE_OA_ID` env var to `app/config.py`
- [x] 4.2 Add `get_trial_welcome_message()` in `app/flex_messages.py` — TextSendMessage with trial details (7 days, 50 scans, 3 members). Preview: plain text welcome message listing trial benefits
- [x] 4.3 Add `get_paywall_flex(reason)` in `app/flex_messages.py` — FlexSendMessage with orange header, reason-specific copy (scan_limit_reached vs trial_expired), upgrade button (URIAction → `line://ti/p/@{OA_ID}` if `LINE_OA_ID` set, else MessageAction fallback). Preview: orange-header Flex bubble with title, body text, and single CTA button

## 5. Handler Integration — Permission Checks & Onboarding

- [x] 5.1 Update all 3 `ensure_user_org` call sites in `app/line_handlers.py` to unpack `(org_id, is_new)` tuple
- [x] 5.2 Add onboarding push: when `is_new=True`, call `push_message` with `get_trial_welcome_message()` in `handle_text_event` and `handle_image_event`
- [x] 5.3 Add scan permission check in `handle_image_event` before batch/single mode — on denial, reply with `get_paywall_flex(reason)` and return
- [x] 5.4 Add member permission check in `handle_join` (invite code flow) — on denial, reply with member limit text message and return

## 6. Tests

- [x] 6.1 Write tests for `check_org_permission` — grandfathering, pro, trial within limit, expired, at/over scan limit, expiry priority, member limit scenarios
- [x] 6.2 Write tests for `create_org` trial fields — `plan_type`, `trial_ends_at` ~7 days, `usage.scan_count=0`
- [x] 6.3 Write tests for `ensure_user_org` — existing returns `(org_id, False)`, new returns `(org_id, True)`
- [x] 6.4 Run full test suite and verify all tests pass
