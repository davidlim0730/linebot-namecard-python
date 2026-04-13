"""
Tests for onboarding flow — new users without an org see a prompt
before any other action is taken.
"""
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock


def run(coro):
    return asyncio.run(coro)


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

    def test_no_org_sends_quick_reply_and_returns_true(self):
        from app import line_handlers
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply:
            result = run(line_handlers.check_onboarding("user_new", "tok"))
        assert result is True
        mock_reply.assert_called_once()
        # Verify reply_token was passed as first arg
        assert mock_reply.call_args[0][0] == "tok"

    def test_has_org_returns_false_no_reply(self):
        from app import line_handlers
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value='org_123'), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply:
            result = run(line_handlers.check_onboarding("user_existing", "tok"))
        assert result is False
        mock_reply.assert_not_called()


class TestHandleTextEventOnboarding:
    """handle_text_event 被 onboarding 攔截時不進入後續邏輯。"""

    def test_new_user_text_is_intercepted(self):
        from app import line_handlers
        event = make_text_event("你好")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org') as mock_ensure:
            run(line_handlers.handle_text_event(event, "user_new"))
        mock_ensure.assert_not_called()
        mock_reply.assert_called_once()

    def test_join_command_bypasses_onboarding(self):
        """「加入 xxx」不被 onboarding 攔截（走現有 handle_join）。"""
        from app import line_handlers
        event = make_text_event("加入 ABC123")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch('app.line_handlers.handle_join', new_callable=AsyncMock) as mock_join:
            run(line_handlers.handle_text_event(event, "user_new"))
        mock_join.assert_called_once()


class TestHandleImageEventOnboarding:
    """handle_image_event 被 onboarding 攔截時不進入後續邏輯。"""

    def test_new_user_image_is_intercepted(self):
        from app import line_handlers
        event = MagicMock()
        event.reply_token = "tok"
        event.message.id = "msg_1"
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org') as mock_ensure:
            run(line_handlers.handle_image_event(event, "user_new"))
        mock_ensure.assert_not_called()
        mock_reply.assert_called_once()


class TestHandlePostbackEventOnboarding:
    """handle_postback_event 被 onboarding 攔截；action=create_org 建立 org。"""

    def test_new_user_postback_is_intercepted(self):
        from app import line_handlers
        event = make_postback_event("action=show_stats")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(line_handlers.line_bot_api, 'reply_message', new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org') as mock_ensure:
            run(line_handlers.handle_postback_event(event, "user_new"))
        mock_ensure.assert_not_called()
        mock_reply.assert_called_once()

    def test_create_org_action_not_intercepted(self):
        """action=create_org 不被 onboarding 攔截，且會建立 org。"""
        from app import line_handlers
        event = make_postback_event("action=create_org")
        with patch.object(line_handlers.firebase_utils, 'get_user_org_id',
                          return_value=None), \
             patch.object(line_handlers.firebase_utils, 'ensure_user_org',
                          return_value=('org_new', True)) as mock_ensure, \
             patch.object(line_handlers.line_bot_api, 'reply_message',
                          new_callable=AsyncMock) as mock_reply, \
             patch.object(line_handlers.line_bot_api, 'push_message',
                          new_callable=AsyncMock):
            run(line_handlers.handle_postback_event(event, "user_new"))
        mock_ensure.assert_called_once_with("user_new")
        mock_reply.assert_called_once()
