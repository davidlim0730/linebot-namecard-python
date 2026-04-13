"""
Set required environment variables before any app module is imported.
Also mock Firebase initialization to prevent real connections in tests.
"""
import os
import sys
from unittest.mock import MagicMock

# Set env vars before any app import
os.environ.setdefault("ChannelSecret", "test_secret")
os.environ.setdefault("ChannelAccessToken", "test_token")
os.environ.setdefault("GEMINI_API_KEY", "test_gemini_key")
os.environ.setdefault("FIREBASE_URL", "https://test.firebaseio.com")

# Mock firebase_admin at the module level so imports don't fail
firebase_admin_mock = MagicMock()
sys.modules['firebase_admin'] = firebase_admin_mock
sys.modules['firebase_admin.db'] = firebase_admin_mock.db
sys.modules['firebase_admin.storage'] = firebase_admin_mock.storage
sys.modules['firebase_admin.credentials'] = firebase_admin_mock.credentials

# Mock linebot with stub models that can be used for testing


class StubPostbackAction:
    def __init__(self, label, data, **kwargs):
        self.label = label
        self.data = data
        # Accept but ignore any additional kwargs for forward compatibility
        for key, value in kwargs.items():
            setattr(self, key, value)


class StubQuickReplyButton:
    def __init__(self, action):
        self.action = action


class StubQuickReply:
    def __init__(self, items):
        self.items = items


class StubTextSendMessage:
    def __init__(self, text, quick_reply=None):
        self.text = text
        self.quick_reply = quick_reply


class StubFlexMessage:
    def __init__(self, alt_text, body):
        self.alt_text = alt_text
        self.body = body
        self.quick_reply = None


class StubInvalidSignatureError(Exception):
    pass


linebot_mock = MagicMock()
linebot_exceptions_mock = MagicMock()
linebot_exceptions_mock.InvalidSignatureError = StubInvalidSignatureError

linebot_models_mock = MagicMock()
linebot_models_mock.PostbackAction = StubPostbackAction
linebot_models_mock.QuickReplyButton = StubQuickReplyButton
linebot_models_mock.QuickReply = StubQuickReply
linebot_models_mock.TextSendMessage = StubTextSendMessage
linebot_models_mock.FlexMessage = StubFlexMessage
linebot_models_mock.PostbackEvent = MagicMock
linebot_models_mock.MessageEvent = MagicMock
linebot_models_mock.ImageSendMessage = MagicMock
linebot_models_mock.MessageAction = MagicMock
linebot_models_mock.FollowEvent = MagicMock

sys.modules['linebot'] = linebot_mock
sys.modules['linebot.exceptions'] = linebot_exceptions_mock
sys.modules['linebot.models'] = linebot_models_mock
sys.modules['linebot.v3'] = MagicMock()
sys.modules['linebot.aiohttp_async_http_client'] = MagicMock()

# Mock other external dependencies
sys.modules['google.generativeai'] = MagicMock()
sys.modules['qrcode'] = MagicMock()
sys.modules['PIL'] = MagicMock()
sys.modules['PIL.Image'] = MagicMock()
sys.modules['gspread'] = MagicMock()
sys.modules['google.oauth2'] = MagicMock()
sys.modules['google.oauth2.service_account'] = MagicMock()
sys.modules['aiohttp'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()
sys.modules['google.cloud.tasks_v2'] = MagicMock()
