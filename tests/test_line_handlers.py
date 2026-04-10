import pytest
from linebot.models import TextSendMessage, QuickReply, QuickReplyButton, PostbackAction, FlexMessage


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
    from app.line_handlers import handle_cancel_state_postback, user_states
    from unittest.mock import MagicMock

    user_id = "test_user_123"
    user_states[user_id] = {'action': 'editing_field', 'card_id': 'card_456'}

    mock_line_bot_api = MagicMock()
    reply_token = "token_789"

    handle_cancel_state_postback(user_id, mock_line_bot_api, reply_token)

    # Verify state was cleared
    assert user_id not in user_states

    # Verify reply was sent with correct message
    mock_line_bot_api.reply_message.assert_called_once()
    call_args = mock_line_bot_api.reply_message.call_args
    assert call_args[0][0] == reply_token
    assert "✓ 已取消操作" in call_args[0][1].text


def test_handle_postback_event_routes_cancel_state_action():
    """Verify handle_postback_event routes action=cancel_state correctly"""
    import urllib.parse
    import asyncio
    from unittest.mock import MagicMock, patch
    from app.line_handlers import handle_postback_event, user_states

    user_id = "test_user"
    reply_token = "token"
    user_states[user_id] = {'action': 'editing_field'}

    # Create mock event with cancel_state postback
    mock_event = MagicMock()
    mock_event.source.user_id = user_id
    mock_event.reply_token = reply_token
    mock_event.postback.data = "action=cancel_state"

    with patch('app.line_handlers.line_bot_api') as mock_line_bot_api:
        # Call the async function
        asyncio.run(handle_postback_event(mock_event, user_id))

    # Verify cancel handler was executed (state cleared)
    assert user_id not in user_states
    mock_line_bot_api.reply_message.assert_called_once()


def test_handle_editing_field_state_includes_cancel_quick_reply():
    """Verify editing field state includes cancel quick reply"""
    import asyncio
    from unittest.mock import MagicMock, AsyncMock, patch
    from app.line_handlers import handle_edit_field_state, user_states

    user_id = "test_user"
    org_id = "org_123"
    card_id = "card_123"
    reply_token = "token"

    user_states[user_id] = {'action': 'editing_field', 'card_id': card_id, 'field': 'name'}

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

    user_states[user_id] = {'action': 'adding_memo', 'card_id': card_id}

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

    user_states[user_id] = {'action': 'adding_tag', 'card_id': 'card_123'}

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

    user_states[user_id] = {'action': 'exporting_csv'}

    mock_event = MagicMock()
    mock_event.reply_token = reply_token

    with patch('app.line_handlers.firebase_utils') as mock_firebase, \
         patch('app.line_handlers.line_bot_api') as mock_line_bot_api:

        mock_firebase.get_user_role.return_value = "member"
        mock_firebase.get_all_namecards.return_value = []
        mock_firebase.get_org.return_value = {'name': 'Team'}
        mock_line_bot_api.reply_message = AsyncMock()

        with patch('app.csv_export.generate_csv') as mock_gen_csv, \
             patch('app.csv_export.send_csv_email') as mock_send_email:

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
    from unittest.mock import MagicMock
    from app.line_handlers import handle_reporting_issue_trigger, user_states

    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"

    mock_line_bot_api = MagicMock()
    user_states.clear()

    handle_reporting_issue_trigger(user_id, org_id, mock_line_bot_api, reply_token)

    assert user_id in user_states
    assert user_states[user_id]['action'] == 'reporting_issue'
    assert user_states[user_id]['org_id'] == org_id
    mock_line_bot_api.reply_message.assert_called_once()
    assert '請描述您遇到的問題' in mock_line_bot_api.reply_message.call_args[0][1].text


def test_handle_reporting_issue_state_processes_input():
    """Verify reporting_issue state processes user input"""
    from unittest.mock import MagicMock, patch
    from app.line_handlers import handle_reporting_issue_state, user_states

    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    feedback_text = "系統無法掃描名片"

    user_states[user_id] = {'action': 'reporting_issue', 'org_id': org_id}

    mock_line_bot_api = MagicMock()

    with patch('app.line_handlers.firebase_utils.write_feedback') as mock_write:
        handle_reporting_issue_state(user_id, org_id, feedback_text, mock_line_bot_api, reply_token)

    assert user_id not in user_states
    mock_line_bot_api.reply_message.assert_called_once()
    assert '感謝回報' in mock_line_bot_api.reply_message.call_args[0][1].text


def test_handle_text_event_triggers_reporting_issue():
    """Verify '回報問題' text triggers reporting issue flow"""
    import asyncio
    from unittest.mock import MagicMock, patch
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

        mock_line_bot_api.reply_message = MagicMock()
        asyncio.run(handle_text_event(mock_event, user_id))

    assert user_id in user_states
    assert user_states[user_id]['action'] == 'reporting_issue'


# Task 19 test
def test_send_feedback_notification_sends_email_when_configured():
    """Verify email is sent when FEEDBACK_EMAIL is configured"""
    import os
    from unittest.mock import patch, MagicMock
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
            assert mock_thread.call_args[1]['daemon'] == True
