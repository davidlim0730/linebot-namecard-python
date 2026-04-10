import pytest
from unittest.mock import MagicMock, patch, call


def test_attach_cancel_quick_reply_adds_quick_reply_button():
    """Verify attach_cancel_quick_reply adds ❌ 取消 button"""
    # Patch the linebot models to use our custom factory
    with patch('app.line_handlers.QuickReply') as mock_qr_class, \
         patch('app.line_handlers.QuickReplyButton') as mock_button_class, \
         patch('app.line_handlers.PostbackAction') as mock_action_class:

        # Setup the mocks to return proper mock objects
        mock_action = MagicMock()
        mock_action.label = "❌ 取消"
        mock_action.data = "action=cancel_state"
        mock_action_class.return_value = mock_action

        mock_button = MagicMock()
        mock_button.action = mock_action
        mock_button_class.return_value = mock_button

        mock_qr = MagicMock()
        mock_qr.items = [mock_button]
        mock_qr_class.return_value = mock_qr

        # Import after patching
        from app.line_handlers import attach_cancel_quick_reply

        # Create a message
        message = MagicMock()
        message.text = "Please input..."

        # Call the function
        result = attach_cancel_quick_reply(message)

        # Verify the result
        assert result is message
        assert result.quick_reply is mock_qr
        assert result.quick_reply.items[0].action.label == "❌ 取消"
        assert result.quick_reply.items[0].action.data == "action=cancel_state"
        assert result.text == "Please input..."

        # Verify PostbackAction was called with correct arguments
        mock_action_class.assert_called_once_with(
            label="❌ 取消",
            data="action=cancel_state"
        )
