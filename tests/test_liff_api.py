import pytest
import os
from unittest.mock import patch, AsyncMock, MagicMock


@pytest.fixture
def client():
    os.environ.setdefault("ChannelSecret", "test")
    os.environ.setdefault("ChannelAccessToken", "test")
    os.environ.setdefault("GEMINI_API_KEY", "test")
    os.environ.setdefault("FIREBASE_URL", "https://test.firebaseio.com")
    os.environ.setdefault("JWT_SECRET", "test-secret")
    os.environ.setdefault("LIFF_CHANNEL_ID", "test-channel")

    with patch("firebase_admin.initialize_app"), \
         patch("firebase_admin.credentials.ApplicationDefault"), \
         patch("google.generativeai.configure"):
        from app.main import app
        from fastapi.testclient import TestClient
        return TestClient(app)


def test_auth_token_success(client):
    with patch("app.api.liff.auth_service") as mock_auth, \
         patch("app.api.liff.org_repo") as mock_org:
        mock_auth.verify_line_token = AsyncMock(return_value="U123456")
        mock_auth.issue_jwt = MagicMock(return_value="eyJ.fake.jwt")
        mock_org.get_user_org_id = MagicMock(return_value="org_abc")
        mock_org.get_user_role = MagicMock(return_value="admin")

        resp = client.post("/api/auth/token", json={"id_token": "line-token"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"] == "eyJ.fake.jwt"
    assert data["expires_in"] == 3600


def test_auth_token_invalid_line_token(client):
    from app.services.auth_service import AuthError
    with patch("app.api.liff.auth_service") as mock_auth:
        mock_auth.verify_line_token = AsyncMock(side_effect=AuthError("bad token"))

        resp = client.post("/api/auth/token", json={"id_token": "bad-token"})

    assert resp.status_code == 401
    assert resp.json()["detail"]["error"] == "invalid_token"


def test_auth_token_user_not_in_org(client):
    with patch("app.api.liff.auth_service") as mock_auth, \
         patch("app.api.liff.org_repo") as mock_org:
        mock_auth.verify_line_token = AsyncMock(return_value="U999")
        mock_org.get_user_org_id = MagicMock(return_value=None)

        resp = client.post("/api/auth/token", json={"id_token": "line-token"})

    assert resp.status_code == 403
    assert resp.json()["detail"]["error"] == "no_org"
