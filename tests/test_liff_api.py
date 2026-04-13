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


from app.services.auth_service import AuthService as _AuthService


def jwt_header(user_id="U123456", org_id="org_abc", role="admin"):
    """Helper: get a real JWT for test requests."""
    import os
    secret = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
    channel = os.environ.get("LIFF_CHANNEL_ID", "test-channel")
    svc = _AuthService(jwt_secret=secret, liff_channel_id=channel)
    token = svc.issue_jwt(user_id, org_id, role)
    return {"Authorization": f"Bearer {token}"}


def make_card(card_id="card1", added_by="U123456"):
    from app.models.card import Card
    return Card(
        id=card_id,
        name="王小明",
        title="業務經理",
        company="測試公司",
        address="台北市",
        phone="02-1234-5678",
        mobile="0912-345-678",
        email="wang@test.com",
        line_id="wang_line",
        memo="備注",
        tags=["VIP"],
        added_by=added_by,
        created_at="2026-04-01T00:00:00",
    )


def test_list_cards_returns_list(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.list_cards.return_value = [make_card()]
        resp = client.get("/api/v1/cards", headers=jwt_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "card1"
    assert data[0]["name"] == "王小明"


def test_list_cards_with_search_param(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.list_cards.return_value = []
        resp = client.get("/api/v1/cards?search=王&tag=VIP", headers=jwt_header())
    assert resp.status_code == 200
    # verify list_cards was called with search and tag
    mock_svc.list_cards.assert_called_once()
    call_args = mock_svc.list_cards.call_args
    all_args = list(call_args.args) + list(call_args.kwargs.values())
    assert "王" in all_args
    assert "VIP" in all_args


def test_get_card_found(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.get_card.return_value = make_card("card1")
        resp = client.get("/api/v1/cards/card1", headers=jwt_header())
    assert resp.status_code == 200
    assert resp.json()["id"] == "card1"


def test_get_card_not_found(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.get_card.return_value = None
        resp = client.get("/api/v1/cards/missing", headers=jwt_header())
    assert resp.status_code == 404


def test_update_card_success(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.update_card.return_value = True
        resp = client.put(
            "/api/v1/cards/card1",
            json={"name": "新名字", "memo": "更新備注"},
            headers=jwt_header(),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_update_card_permission_denied(client):
    from app.services.card_service import PermissionError as CardPermError
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.update_card.side_effect = CardPermError("no access")
        resp = client.put(
            "/api/v1/cards/card1",
            json={"name": "x"},
            headers=jwt_header(role="member"),
        )
    assert resp.status_code == 403


def test_delete_card_success(client):
    with patch("app.api.liff.card_service") as mock_svc:
        mock_svc.delete_card.return_value = True
        resp = client.delete("/api/v1/cards/card1", headers=jwt_header())
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_cards_require_auth(client):
    resp = client.get("/api/v1/cards")
    assert resp.status_code == 403


# ---- Tags ----

def test_list_tags(client):
    with patch("app.api.liff.tag_service") as mock_svc:
        mock_svc.list_tags.return_value = ["VIP", "潛力客戶"]
        resp = client.get("/api/v1/tags", headers=jwt_header())
    assert resp.status_code == 200
    assert resp.json() == ["VIP", "潛力客戶"]


def test_add_tag(client):
    with patch("app.api.liff.tag_service") as mock_svc:
        mock_svc.add_tag.return_value = True
        resp = client.post(
            "/api/v1/tags",
            json={"name": "新標籤"},
            headers=jwt_header(),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_set_card_tags(client):
    with patch("app.api.liff.tag_service") as mock_svc:
        mock_svc.set_card_tags.return_value = True
        resp = client.post(
            "/api/v1/cards/card1/tags",
            json={"tag_names": ["VIP", "潛力客戶"]},
            headers=jwt_header(),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


# ---- Org ----

def make_org():
    from app.models.org import Org, Member
    return Org(
        id="org_abc",
        name="測試團隊",
        created_by="U123456",
        plan_type=None,
        trial_ends_at=None,
        members=[
            Member(user_id="U123456", role="admin", joined_at="2026-01-01T00:00:00"),
            Member(user_id="U999", role="member", joined_at="2026-02-01T00:00:00"),
        ],
    )


def test_get_org(client):
    with patch("app.api.liff.org_repo") as mock_repo:
        mock_repo.get.return_value = make_org()
        resp = client.get("/api/v1/org", headers=jwt_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "org_abc"
    assert data["name"] == "測試團隊"


def test_list_org_members(client):
    with patch("app.api.liff.org_repo") as mock_repo:
        mock_repo.get.return_value = make_org()
        resp = client.get("/api/v1/org/members", headers=jwt_header())
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 2
    assert members[0]["user_id"] == "U123456"


def test_update_member_role_admin_only(client):
    with patch("app.api.liff.org_service") as mock_svc:
        mock_svc.update_member_role.return_value = True
        resp = client.patch(
            "/api/v1/org/members/U999",
            json={"role": "admin"},
            headers=jwt_header(role="admin"),
        )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_update_member_role_non_admin_forbidden(client):
    from app.services.org_service import PermissionError as OrgPermError
    with patch("app.api.liff.org_service") as mock_svc:
        mock_svc.update_member_role.side_effect = OrgPermError("not admin")
        resp = client.patch(
            "/api/v1/org/members/U999",
            json={"role": "admin"},
            headers=jwt_header(role="member"),
        )
    assert resp.status_code == 403


def test_generate_invite_code(client):
    with patch("app.api.liff.org_service") as mock_svc:
        mock_svc.generate_invite_code.return_value = "ABC123"
        resp = client.post("/api/v1/org/invite", headers=jwt_header())
    assert resp.status_code == 200
    assert resp.json()["code"] == "ABC123"
