import pytest
from unittest.mock import patch, AsyncMock
from app.services.auth_service import AuthService, AuthError
from app.models.org import UserContext


@pytest.fixture
def auth_service():
    return AuthService(jwt_secret="test-secret", liff_channel_id="test-channel")


@pytest.mark.asyncio
async def test_verify_line_token_returns_user_id(auth_service):
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"sub": "U123456", "iss": "https://access.line.me"}

    with patch("app.services.auth_service.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        result = await auth_service.verify_line_token("fake-id-token")

    assert result == "U123456"


@pytest.mark.asyncio
async def test_verify_line_token_raises_on_error(auth_service):
    mock_response = AsyncMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {"error": "invalid_request"}

    with patch("app.services.auth_service.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        with pytest.raises(AuthError):
            await auth_service.verify_line_token("bad-token")


def test_issue_and_verify_jwt(auth_service):
    token = auth_service.issue_jwt("U123", "org_abc", "admin")
    ctx = auth_service.verify_jwt(token)
    assert ctx.user_id == "U123"
    assert ctx.org_id == "org_abc"
    assert ctx.role == "admin"
    assert ctx.is_admin is True


def test_verify_jwt_raises_on_invalid(auth_service):
    with pytest.raises(AuthError):
        auth_service.verify_jwt("not-a-jwt")


def test_verify_jwt_raises_on_wrong_secret(auth_service):
    other = AuthService(jwt_secret="other-secret", liff_channel_id="x")
    token = other.issue_jwt("U1", "org1", "member")
    with pytest.raises(AuthError):
        auth_service.verify_jwt(token)
