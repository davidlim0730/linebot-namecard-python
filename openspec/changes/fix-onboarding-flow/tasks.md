## 1. `check_onboarding` helper

- [x] 1.1 在 `app/line_handlers.py` 的 import 行加入 `MessageAction`（與現有 `PostbackAction` 同行）
- [x] 1.2 在 `FIELD_LABELS` 定義之後、`handle_postback_event` 之前，新增 `check_onboarding(user_id, reply_token) -> bool` async function：呼叫 `firebase_utils.get_user_org_id`，若為 None 則回覆 onboarding Quick Reply（文案：「歡迎使用名片管理機器人 👋\n請先選擇「建立團隊」或是「加入既有團隊」」，兩個按鈕：`🏢 建立團隊` postback `action=create_org`、`🔗 加入既有團隊` message text `加入 `）並回傳 True；有 org 則回傳 False
- [x] 1.3 新增 `tests/test_onboarding.py`，測試：(a) 無 org 時回覆 Quick Reply 且回傳 True；(b) 有 org 時不回覆且回傳 False
- [x] 1.4 執行 `pytest tests/test_onboarding.py -v` 確認通過
- [x] 1.5 commit: `feat: add check_onboarding helper`

## 2. 攔截 `handle_text_event`

- [x] 2.1 在 `handle_text_event` 的 `加入 ` 攔截之後、`ensure_user_org` 之前插入：`if await check_onboarding(user_id, event.reply_token): return`
- [x] 2.2 在 `tests/test_onboarding.py` 新增測試：無 org 的 text 訊息不呼叫 `ensure_user_org`；「加入 xxx」仍走 `handle_join`
- [x] 2.3 執行 `pytest tests/test_onboarding.py -v` 確認通過
- [x] 2.4 commit: `feat: intercept new users in handle_text_event`

## 3. 攔截 `handle_image_event`

- [x] 3.1 在 `handle_image_event` 的第一行插入：`if await check_onboarding(user_id, event.reply_token): return`（在現有 `ensure_user_org` 之前）
- [x] 3.2 在 `tests/test_onboarding.py` 新增測試：無 org 的圖片訊息不呼叫 `ensure_user_org`
- [x] 3.3 執行 `pytest tests/test_onboarding.py -v` 確認通過
- [x] 3.4 commit: `feat: intercept new users in handle_image_event`

## 4. 攔截 `handle_postback_event` + `create_org` handler

- [x] 4.1 在 `handle_postback_event` 中，將 `org_id, _ = firebase_utils.ensure_user_org(user_id)` 移至 onboarding 攔截之後
- [x] 4.2 在 `postback_data` / `action` 解析之後、其他 action 判斷之前，加入 `create_org` handler：呼叫 `ensure_user_org`，若 `is_new_org` 則推播 trial welcome，回覆「您的團隊已建立！現在可以開始掃描名片了。📇」
- [x] 4.3 在 `create_org` handler 之後、其他 action 之前，插入 onboarding 攔截：`if await check_onboarding(user_id, event.reply_token): return`
- [x] 4.4 在 `tests/test_onboarding.py` 新增測試：(a) 無 org 的一般 postback 不呼叫 `ensure_user_org`；(b) `action=create_org` 不被攔截且呼叫 `ensure_user_org`
- [x] 4.5 執行 `pytest tests/ -v` 確認全部通過（含既有測試）
- [x] 4.6 commit: `feat: intercept new users in handle_postback_event, add create_org handler`
