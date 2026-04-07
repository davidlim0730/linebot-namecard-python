"""
Set required environment variables before any app module is imported.
Also mock Firebase initialization to prevent real connections in tests.
"""
import os
import sys
from unittest.mock import MagicMock, patch

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

# Mock other external dependencies
sys.modules['google.generativeai'] = MagicMock()
sys.modules['linebot'] = MagicMock()
sys.modules['linebot.v3'] = MagicMock()
