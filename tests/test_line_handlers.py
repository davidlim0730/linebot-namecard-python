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
