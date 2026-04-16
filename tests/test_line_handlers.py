import pytest
import time
from linebot.models import TextSendMessage, QuickReply, QuickReplyButton, PostbackAction


def test_attach_cancel_quick_reply_adds_quick_reply_button():
    """Verify attach_cancel_quick_reply adds ❌ 取消 button"""
    from app.line_handlers import attach_cancel_quick_reply

    message = TextSendMessage(text="Please input...")
    result = attach_cancel_quick_reply(message)

    assert result.quick_reply is not None
    assert len(result.quick_reply.items) == 1
    assert result.quick_reply.items[0].action.label == "❌ 取消"
    assert result.quick_reply.items[0].action.data == "action=cancel_state"
    assert result.text == "Please input..."


def test_attach_cancel_quick_reply_raises_on_none():
    """Verify function raises ValueError for None input"""
    from app.line_handlers import attach_cancel_quick_reply

    with pytest.raises(ValueError, match="cannot be None"):
        attach_cancel_quick_reply(None)


def test_attach_cancel_quick_reply_overwrites_existing():
    """Verify function overwrites existing quick_reply"""
    from app.line_handlers import attach_cancel_quick_reply

    # Create a message that already has a quick_reply
    message = TextSendMessage(text="Test")
    old_reply = QuickReply(
        items=[
            QuickReplyButton(action=PostbackAction(label="Old", data="old"))
        ]
    )
    message.quick_reply = old_reply

    result = attach_cancel_quick_reply(message)

    # Verify old quick_reply was replaced
    assert len(result.quick_reply.items) == 1
    assert result.quick_reply.items[0].action.label == "❌ 取消"


def test_handle_cancel_state_postback_clears_state():
    """Verify cancel postback clears user_states and replies with confirmation"""
    import asyncio
    from unittest.mock import patch, AsyncMock
    from app.line_handlers import handle_cancel_state_postback, user_states

    user_id = "test_user_123"
    user_states[user_id] = {'action': 'editing_field', 'card_id': 'card_456', 'expires_at': time.time() + 1800}

    reply_token = "token_789"

    with patch('app.line_handlers.line_bot_api') as mock_line_bot_api:
        mock_line_bot_api.reply_message = AsyncMock()
        asyncio.run(handle_cancel_state_postback(user_id, reply_token))

    # Verify state was cleared
    assert user_id not in user_states


def test_handle_postback_event_routes_cancel_state_action():
    """Verify handle_postback_event routes action=cancel_state correctly"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_postback_event, user_states

    user_id = "test_user"
    reply_token = "token"
    user_states[user_id] = {'action': 'editing_field', 'expires_at': time.time() + 1800}

    # Create mock event with cancel_state postback
    mock_event = MagicMock()
    mock_event.source.user_id = user_id
    mock_event.reply_token = reply_token
    mock_event.postback.data = "action=cancel_state"

    with patch('app.line_handlers.line_bot_api') as mock_line_bot_api:
        mock_line_bot_api.reply_message = AsyncMock()
        # Call the async function
        asyncio.run(handle_postback_event(mock_event, user_id))

    # Verify cancel handler was executed (state cleared)
    assert user_id not in user_states


def test_handle_editing_field_state_includes_cancel_quick_reply():
    """Verify editing field state includes cancel quick reply"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_edit_field_state, user_states

    user_id = "test_user"
    org_id = "org_123"
    card_id = "card_123"
    reply_token = "token"

    user_states[user_id] = {'action': 'editing_field', 'card_id': card_id, 'field': 'name', 'expires_at': time.time() + 1800}

    mock_event = MagicMock()
    mock_event.reply_token = reply_token

    with patch('app.line_handlers.firebase_utils') as mock_firebase, \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api, \
         patch('app.line_handlers.flex_messages') as mock_flex:

        mock_firebase.require_admin.return_value = True
        mock_firebase.update_namecard_field.return_value = True
        mock_firebase.get_card_by_id.return_value = {'name': 'New Value'}
        mock_flex.get_namecard_flex_msg.return_value = MagicMock()
        mock_line_bot_api.reply_message = AsyncMock()

        asyncio.run(handle_edit_field_state(mock_event, user_id, org_id, 'New Value'))

        # Verify reply was called with cancel quick reply
        mock_line_bot_api.reply_message.assert_called_once()
        call_args = mock_line_bot_api.reply_message.call_args
        messages = call_args[0][1]

        # First message should be TextSendMessage with cancel quick reply
        text_msg = messages[0]
        assert text_msg.quick_reply is not None
        assert text_msg.quick_reply.items[0].action.label == "❌ 取消"


def test_handle_adding_memo_state_includes_cancel_quick_reply():
    """Verify memo state includes cancel quick reply"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_add_memo_state, user_states

    user_id = "test_user"
    org_id = "org_123"
    card_id = "card_123"
    reply_token = "token"

    user_states[user_id] = {'action': 'adding_memo', 'card_id': card_id, 'expires_at': time.time() + 1800}

    mock_event = MagicMock()
    mock_event.reply_token = reply_token

    with patch('app.line_handlers.firebase_utils') as mock_firebase, \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api:

        mock_firebase.update_namecard_memo.return_value = True
        mock_line_bot_api.reply_message = AsyncMock()

        asyncio.run(handle_add_memo_state(mock_event, user_id, org_id, 'New memo'))

        # Verify reply was called
        mock_line_bot_api.reply_message.assert_called_once()
        call_args = mock_line_bot_api.reply_message.call_args
        msg = call_args[0][1]

        # Should have cancel quick reply
        assert msg.quick_reply is not None
        assert msg.quick_reply.items[0].action.label == "❌ 取消"


def test_handle_adding_tag_state_includes_cancel_quick_reply():
    """Verify tag state includes cancel quick reply"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_adding_tag_state, user_states

    user_id = "test_user"
    org_id = "org_123"
    reply_token = "token"

    user_states[user_id] = {'action': 'adding_tag', 'card_id': 'card_123', 'expires_at': time.time() + 1800}

    mock_event = MagicMock()
    mock_event.reply_token = reply_token

    with patch('app.line_handlers.firebase_utils') as mock_firebase, \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api, \
         patch('app.line_handlers.flex_messages') as mock_flex:

        mock_firebase.add_role_tag.return_value = True
        mock_firebase.get_all_role_tags.return_value = []
        mock_flex.tag_management_flex.return_value = MagicMock()
        mock_line_bot_api.reply_message = AsyncMock()

        asyncio.run(handle_adding_tag_state(mock_event, user_id, org_id, 'tag_name'))

        # Verify reply was called
        mock_line_bot_api.reply_message.assert_called_once()
        call_args = mock_line_bot_api.reply_message.call_args
        messages = call_args[0][1]

        # First message should have cancel quick reply
        text_msg = messages[0]
        assert text_msg.quick_reply is not None
        assert text_msg.quick_reply.items[0].action.label == "❌ 取消"


def test_handle_exporting_csv_state_includes_cancel_quick_reply():
    """Verify CSV export state includes cancel quick reply"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_export_email_state, user_states

    user_id = "test_user"
    org_id = "org_123"
    reply_token = "token"

    user_states[user_id] = {'action': 'exporting_csv', 'expires_at': time.time() + 1800}

    mock_event = MagicMock()
    mock_event.reply_token = reply_token

    with patch('app.line_handlers.firebase_utils') as mock_firebase, \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api:

        mock_firebase.get_user_role.return_value = "member"
        mock_firebase.get_all_namecards.return_value = []
        mock_firebase.get_org.return_value = {'name': 'Team'}
        mock_line_bot_api.reply_message = AsyncMock()

        with patch('app.csv_export.generate_csv') as mock_gen_csv, \
             patch('app.csv_export.send_csv_email'):

            mock_gen_csv.return_value = b'csv_data'

            asyncio.run(handle_export_email_state(mock_event, user_id, org_id, 'user@example.com'))

            # Verify reply was called
            mock_line_bot_api.reply_message.assert_called_once()
            call_args = mock_line_bot_api.reply_message.call_args
            msg = call_args[0][1]

            # Should have cancel quick reply
            assert msg.quick_reply is not None
            assert msg.quick_reply.items[0].action.label == "❌ 取消"


def test_batch_start_message_includes_warning():
    """Verify batch start message includes warning about waiting"""
    import asyncio
    from unittest.mock import MagicMock, patch, AsyncMock
    from app.line_handlers import handle_postback_event

    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"

    # Create mock postback event
    mock_event = MagicMock()
    mock_event.source.user_id = user_id
    mock_event.reply_token = reply_token
    mock_event.postback.data = "action=batch_start"

    with patch('app.line_handlers.firebase_utils') as mock_firebase, \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api:

        mock_firebase.get_user_org_id.return_value = org_id
        mock_firebase.ensure_user_org.return_value = (org_id, False)
        mock_firebase.require_admin.return_value = True
        mock_firebase.init_batch_state = MagicMock()
        mock_line_bot_api.reply_message = AsyncMock()

        asyncio.run(handle_postback_event(mock_event, user_id))

        # Verify reply was called
        mock_line_bot_api.reply_message.assert_called_once()
        call_args = mock_line_bot_api.reply_message.call_args
        message = call_args[0][1]

        assert "批量上傳模式已開啟" in message.text
        assert "系統將依序" in message.text or "請勿輸入其他指令" in message.text


def test_handle_reporting_issue_trigger_enters_state():
    """Verify 'reporting_issue' trigger enters correct state"""
    import asyncio
    from unittest.mock import patch, AsyncMock
    from app.line_handlers import handle_reporting_issue_trigger, user_states

    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"

    user_states.clear()

    with patch('app.line_handlers.line_bot_api') as mock_line_bot_api:
        mock_line_bot_api.reply_message = AsyncMock()
        asyncio.run(handle_reporting_issue_trigger(user_id, org_id, reply_token))

    assert user_id in user_states
    assert user_states[user_id]['action'] == 'reporting_issue'
    assert user_states[user_id]['org_id'] == org_id
    assert 'expires_at' in user_states[user_id]


def test_handle_reporting_issue_state_processes_input():
    """Verify reporting_issue state processes user input"""
    import asyncio
    from unittest.mock import patch, AsyncMock
    from app.line_handlers import handle_reporting_issue_state, user_states

    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    feedback_text = "系統無法掃描名片"

    user_states[user_id] = {'action': 'reporting_issue', 'org_id': org_id, 'expires_at': time.time() + 1800}

    with patch('app.line_handlers.firebase_utils.write_feedback'), \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api:
        mock_line_bot_api.reply_message = AsyncMock()
        asyncio.run(handle_reporting_issue_state(user_id, org_id, feedback_text, reply_token))

    assert user_id not in user_states


def test_handle_text_event_triggers_reporting_issue():
    """Verify '回報問題' text triggers reporting issue flow"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_text_event, user_states

    user_id = "test_user"
    reply_token = "token"

    mock_event = MagicMock()
    mock_event.source.user_id = user_id
    mock_event.reply_token = reply_token
    mock_event.message.text = "回報問題"

    user_states.clear()

    with patch('app.line_handlers.firebase_utils.ensure_user_org', return_value=('test_org', False)), \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api:

        mock_line_bot_api.reply_message = AsyncMock()
        asyncio.run(handle_text_event(mock_event, user_id))

    assert user_id in user_states
    assert user_states[user_id]['action'] == 'reporting_issue'


# Task 19 test
def test_send_feedback_notification_sends_email_when_configured():
    """Verify email is sent when FEEDBACK_EMAIL is configured"""
    import os
    from unittest.mock import patch
    from app.line_handlers import send_feedback_notification_async

    org_id = "test_org"
    user_id = "test_user"
    feedback_data = {
        'content': 'Test issue',
        'type': 'text',
        'created_at': '2026-04-10T12:00:00'
    }

    with patch.dict(os.environ, {'FEEDBACK_EMAIL': 'pm@example.com'}):
        with patch('app.line_handlers.threading.Thread') as mock_thread:
            send_feedback_notification_async(org_id, user_id, feedback_data)

            # Verify Thread was created with send_email function
            mock_thread.assert_called_once()
            assert mock_thread.call_args[1]['daemon'] is True


# Task 1: State TTL tests
import time
from unittest.mock import patch

@pytest.fixture(autouse=True)
def cleanup_user_states():
    """Auto-cleanup user_states before and after each test."""
    from app.bot_instance import user_states
    user_states.clear()
    yield
    user_states.clear()

def test_get_valid_state_returns_none_when_no_state():
    from app.line_handlers import get_valid_state
    assert get_valid_state("nonexistent_user") is None

def test_get_valid_state_returns_state_when_fresh():
    from app.line_handlers import get_valid_state
    from app.bot_instance import user_states
    user_states["u1"] = {"action": "adding_memo", "expires_at": time.time() + 1800}
    result = get_valid_state("u1")
    assert result is not None
    assert result["action"] == "adding_memo"

def test_get_valid_state_clears_and_returns_none_when_expired():
    from app.line_handlers import get_valid_state
    from app.bot_instance import user_states
    user_states["u2"] = {"action": "editing_field", "expires_at": time.time() - 1}
    result = get_valid_state("u2")
    assert result is None
    assert "u2" not in user_states


@pytest.mark.asyncio
async def test_handle_download_contact_sends_vcf_url():
    """handle_download_contact 應回傳 .vcf URL，不再產生 QR Code 圖片"""
    from app.line_handlers import handle_download_contact
    from linebot.models import TextSendMessage
    from unittest.mock import patch, AsyncMock, MagicMock

    mock_event = MagicMock()
    mock_event.reply_token = "token123"

    card_data = {"name": "陳大明", "company": "ABC", "email": "chen@abc.com",
                 "phone": "", "title": "", "address": "", "memo": ""}

    with patch("app.line_handlers.firebase_utils.get_card_by_id", return_value=card_data), \
         patch("app.line_handlers.config.CLOUD_RUN_URL", "https://bot.example.com"), \
         patch("app.line_handlers.line_bot_api.reply_message", new_callable=AsyncMock) as mock_reply:
        await handle_download_contact(mock_event, "user1", "org1", "card123", "陳大明")

    mock_reply.assert_called_once()
    sent_msg = mock_reply.call_args[0][1]
    assert isinstance(sent_msg, TextSendMessage)
    assert "/vcf/card123" in sent_msg.text
    assert "user1" in sent_msg.text
