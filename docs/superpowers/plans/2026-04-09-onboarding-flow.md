# Onboarding Flow 修復 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新用戶第一次使用時顯示「建立團隊 / 加入既有團隊」選擇，阻止在選擇前自動建立個人組織。

**Architecture:** 在 `line_handlers.py` 新增 `check_onboarding` helper，於三個事件 handler（text、image、postback）入口攔截無 org 的用戶，回覆 Quick Reply 選擇訊息。用戶選「建立團隊」時觸發 `action=create_org` postback，才呼叫 `ensure_user_org`。

**Tech Stack:** Python, LINE Bot SDK (`TextSendMessage`, `QuickReply`, `QuickReplyButton`, `PostbackAction`, `MessageAction`), Firebase Realtime DB (`get_user_org_id`), pytest

---

## File Map

| 檔案 | 異動 |
|---|---|
| `app/line_handlers.py` | 新增 `check_onboarding`；修改 `handle_text_event`、`handle_image_event`、`handle_postback_event` |
| `tests/test_onboarding.py` | 新建，測試 onboarding 攔截邏輯 |

---

### Task 1: `check_onboarding` helper — 測試

**Files:**
- Create: `tests/test_onboarding.py`

- [ ] **Step 1: 建立測試檔**

```python
"""
Tests for onboarding flow — new users without an org see a prompt
before any other action is taken.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


def make_text_event(text="hello", reply_token="tok"):
    event = MagicMock()
    event.reply_token = reply_token
    event.message.text = text
    return event


def make_postback_event(data="action=foo", reply_token="tok"):
    event = MagicMock()
    event.reply_token = reply_token
    event.postback.data = data
    return event


class TestCheckOnboarding:
    """check_onboarding returns True and sends Quick Reply when user has no org."""

    @pytest.mark.asyncio
    async def test_no_org_sends_quick_reply_and_returns_true(self):
        from app import line_handlers
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply:
            result = await line_handlers.check_onboarding("user_new", "tok")
        assert result is True
        mock_reply.assert_called_once()
        # Quick Reply 有兩個按鈕
        sent_msg = mock_reply.call_args[0][1]
        assert len(sent_msg.quick_reply.items) == 2

    @pytest.mark.asyncio
    async def test_has_org_returns_false_no_reply(self):
        from app import line_handlers
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value='org_123'), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply:
            result = await line_handlers.check_onboarding("user_existing", "tok")
        assert result is False
        mock_reply.assert_not_called()
```

- [ ] **Step 2: 執行測試，確認 FAIL**

```bash
cd /Users/davidlin/Claude-Code-Project/linebot-namecard-python
pytest tests/test_onboarding.py -v
```

Expected: `AttributeError: module 'app.line_handlers' has no attribute 'check_onboarding'`

---

### Task 2: `check_onboarding` helper — 實作

**Files:**
- Modify: `app/line_handlers.py`（在 `FIELD_LABELS` 定義之後，`handle_postback_event` 之前新增）

- [ ] **Step 1: 新增 `MessageAction` import**

在 `app/line_handlers.py` 頂端的 import 行找到：
```python
from linebot.models import (
    PostbackEvent, MessageEvent, TextSendMessage, ImageSendMessage,
    QuickReply, QuickReplyButton, PostbackAction
)
```
改為：
```python
from linebot.models import (
    PostbackEvent, MessageEvent, TextSendMessage, ImageSendMessage,
    QuickReply, QuickReplyButton, PostbackAction, MessageAction
)
```

- [ ] **Step 2: 新增 `check_onboarding` function**

在 `FIELD_LABELS` dict 定義之後、`handle_postback_event` 之前插入：

```python
async def check_onboarding(user_id: str, reply_token: str) -> bool:
    """若用戶無 org，回覆 onboarding 選擇訊息並回傳 True（表示已攔截）。"""
    if firebase_utils.get_user_org_id(user_id):
        return False
    await line_bot_api.reply_message(
        reply_token,
        TextSendMessage(
            text='歡迎使用名片管理機器人 👋\n請先選擇「建立團隊」或是「加入既有團隊」',
            quick_reply=QuickReply(items=[
                QuickReplyButton(action=PostbackAction(
                    label='🏢 建立團隊',
                    data='action=create_org',
                    display_text='建立團隊'
                )),
                QuickReplyButton(action=MessageAction(
                    label='🔗 加入既有團隊',
                    text='加入 '
                )),
            ])
        )
    )
    return True
```

- [ ] **Step 3: 執行測試，確認 PASS**

```bash
pytest tests/test_onboarding.py -v
```

Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
git add app/line_handlers.py tests/test_onboarding.py
git commit -m "feat: add check_onboarding helper for new user onboarding flow"
```

---

### Task 3: 攔截 `handle_text_event`

**Files:**
- Modify: `app/line_handlers.py` — `handle_text_event`

- [ ] **Step 1: 新增測試**

在 `tests/test_onboarding.py` 末尾加入：

```python
class TestHandleTextEventOnboarding:
    """handle_text_event 被 onboarding 攔截時不進入後續邏輯。"""

    @pytest.mark.asyncio
    async def test_new_user_text_is_intercepted(self):
        from app import line_handlers
        event = make_text_event("你好")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org') as mock_ensure:
            await line_handlers.handle_text_event(event, "user_new")
        mock_ensure.assert_not_called()
        mock_reply.assert_called_once()

    @pytest.mark.asyncio
    async def test_join_command_bypasses_onboarding(self):
        """「加入 xxx」不被 onboarding 攔截（原本邏輯）。"""
        from app import line_handlers
        event = make_text_event("加入 ABC123")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch('app.line_handlers.handle_join', new_callable=AsyncMock) as mock_join:
            await line_handlers.handle_text_event(event, "user_new")
        mock_join.assert_called_once()
```

- [ ] **Step 2: 執行測試，確認 FAIL**

```bash
pytest tests/test_onboarding.py::TestHandleTextEventOnboarding -v
```

Expected: `test_new_user_text_is_intercepted` FAIL（`ensure_user_org` 被呼叫）

- [ ] **Step 3: 修改 `handle_text_event`**

找到 `handle_text_event` 中：
```python
    # 加入流程優先處理（加入前 user 可能沒有 org）
    if msg.upper().startswith("加入 "):
        await handle_join(event, user_id, msg)
        return

    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
```

改為：
```python
    # 加入流程優先處理（加入前 user 可能沒有 org）
    if msg.upper().startswith("加入 "):
        await handle_join(event, user_id, msg)
        return

    # Onboarding 攔截：新用戶尚未選擇組織
    if await check_onboarding(user_id, event.reply_token):
        return

    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
```

- [ ] **Step 4: 執行測試，確認 PASS**

```bash
pytest tests/test_onboarding.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_onboarding.py
git commit -m "feat: intercept new users in handle_text_event before ensure_user_org"
```

---

### Task 4: 攔截 `handle_image_event`

**Files:**
- Modify: `app/line_handlers.py` — `handle_image_event`

- [ ] **Step 1: 新增測試**

在 `tests/test_onboarding.py` 末尾加入：

```python
class TestHandleImageEventOnboarding:
    """handle_image_event 被 onboarding 攔截時不進入後續邏輯。"""

    @pytest.mark.asyncio
    async def test_new_user_image_is_intercepted(self):
        from app import line_handlers
        event = MagicMock()
        event.reply_token = "tok"
        event.message.id = "msg_1"
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org') as mock_ensure:
            await line_handlers.handle_image_event(event, "user_new")
        mock_ensure.assert_not_called()
        mock_reply.assert_called_once()
```

- [ ] **Step 2: 執行測試，確認 FAIL**

```bash
pytest tests/test_onboarding.py::TestHandleImageEventOnboarding -v
```

Expected: FAIL

- [ ] **Step 3: 修改 `handle_image_event`**

找到 `handle_image_event` 開頭：
```python
async def handle_image_event(event: MessageEvent, user_id: str) -> None:
    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
    if is_new_org:
        await line_bot_api.push_message(
            user_id, flex_messages.get_trial_welcome_message()
        )
```

改為：
```python
async def handle_image_event(event: MessageEvent, user_id: str) -> None:
    # Onboarding 攔截：新用戶尚未選擇組織
    if await check_onboarding(user_id, event.reply_token):
        return

    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
    if is_new_org:
        await line_bot_api.push_message(
            user_id, flex_messages.get_trial_welcome_message()
        )
```

- [ ] **Step 4: 執行測試，確認 PASS**

```bash
pytest tests/test_onboarding.py -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_onboarding.py
git commit -m "feat: intercept new users in handle_image_event before ensure_user_org"
```

---

### Task 5: 攔截 `handle_postback_event` + 新增 `create_org` handler

**Files:**
- Modify: `app/line_handlers.py` — `handle_postback_event`

- [ ] **Step 1: 新增測試**

在 `tests/test_onboarding.py` 末尾加入：

```python
class TestHandlePostbackEventOnboarding:
    """handle_postback_event 被 onboarding 攔截；action=create_org 建立 org。"""

    @pytest.mark.asyncio
    async def test_new_user_postback_is_intercepted(self):
        from app import line_handlers
        event = make_postback_event("action=show_stats")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org') as mock_ensure:
            await line_handlers.handle_postback_event(event, "user_new")
        mock_ensure.assert_not_called()
        mock_reply.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_org_action_not_intercepted(self):
        """action=create_org 不被 onboarding 攔截，且會建立 org。"""
        from app import line_handlers
        event = make_postback_event("action=create_org")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org', return_value=('org_new', True)) as mock_ensure, \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.line_bot_api, 'push_message', new_callable=AsyncMock):
            await line_handlers.handle_postback_event(event, "user_new")
        mock_ensure.assert_called_once_with("user_new")
        mock_reply.assert_called_once()
```

- [ ] **Step 2: 執行測試，確認 FAIL**

```bash
pytest tests/test_onboarding.py::TestHandlePostbackEventOnboarding -v
```

Expected: FAIL

- [ ] **Step 3: 修改 `handle_postback_event`**

找到 `handle_postback_event` 開頭：
```python
async def handle_postback_event(event: PostbackEvent, user_id: str):
    org_id, _ = firebase_utils.ensure_user_org(user_id)
    postback_data = dict(parse_qsl(event.postback.data))
    action = postback_data.get('action')
    card_id = postback_data.get('card_id')

    # 處理功能性 action（不需要 card_id）
    if action == 'show_stats':
```

改為：
```python
async def handle_postback_event(event: PostbackEvent, user_id: str):
    postback_data = dict(parse_qsl(event.postback.data))
    action = postback_data.get('action')
    card_id = postback_data.get('card_id')

    # create_org：onboarding 選擇「建立團隊」
    if action == 'create_org':
        org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
        if is_new_org:
            await line_bot_api.push_message(
                user_id, flex_messages.get_trial_welcome_message()
            )
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='您的團隊已建立！現在可以開始掃描名片了。📇')
        )
        return

    # Onboarding 攔截：新用戶尚未選擇組織
    if await check_onboarding(user_id, event.reply_token):
        return

    org_id, _ = firebase_utils.ensure_user_org(user_id)

    # 處理功能性 action（不需要 card_id）
    if action == 'show_stats':
```

- [ ] **Step 4: 執行所有測試，確認 PASS**

```bash
pytest tests/ -v
```

Expected: all passed（包含既有的 `test_trial_permissions.py` 和 `test_utils.py`）

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_onboarding.py
git commit -m "feat: intercept new users in handle_postback_event, add create_org handler"
```

---

### Task 6: 手動測試確認（Smoke Test）

**Files:** 無異動

- [ ] **Step 1: 本地啟動**

```bash
uvicorn app.main:app --host=0.0.0.0 --port=8080
```

- [ ] **Step 2: 確認以下場景**

1. **新用戶發任何文字** → 收到 onboarding Quick Reply（兩個按鈕）
2. **新用戶上傳圖片** → 收到 onboarding Quick Reply
3. **新用戶點「建立團隊」** → 收到「您的團隊已建立！」，之後掃名片正常
4. **新用戶點「加入既有團隊」** → 收到「加入 」提示，輸入有效邀請碼後加入成功
5. **新用戶忽略 Quick Reply 繼續傳訊息** → 再次收到 onboarding Quick Reply
6. **既有用戶** → 一切正常，無任何影響

- [ ] **Step 3: 最終 commit（如有任何小修正）**

```bash
git add -p
git commit -m "fix: onboarding flow smoke test fixes"
```
