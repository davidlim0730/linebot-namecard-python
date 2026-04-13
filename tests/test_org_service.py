from unittest.mock import MagicMock
from app.models.org import UserContext, Org, Member


def _admin_ctx():
    return UserContext(user_id="U123", org_id="org_abc", role="admin")


def _member_ctx():
    return UserContext(user_id="U456", org_id="org_abc", role="member")


def test_ensure_user_org_creates_new():
    mock_repo = MagicMock()
    mock_repo.get_user_org_id.return_value = None
    mock_repo.create.return_value = "org_new"

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    org_id, is_new = svc.ensure_user_org("U_new")
    assert org_id == "org_new"
    assert is_new is True


def test_ensure_user_org_existing():
    mock_repo = MagicMock()
    mock_repo.get_user_org_id.return_value = "org_abc"

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    org_id, is_new = svc.ensure_user_org("U123")
    assert org_id == "org_abc"
    assert is_new is False


def test_join_org_with_valid_code():
    from datetime import datetime, timezone, timedelta
    future = (datetime.now(timezone.utc) + timedelta(days=1)).strftime(
        '%Y-%m-%dT%H:%M:%SZ'
    )
    mock_repo = MagicMock()
    mock_repo.get_invite_code.return_value = {
        "org_id": "org_target", "expires_at": future
    }
    mock_repo.add_member.return_value = True

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    result = svc.join_org_with_code("U456", "ABC123")
    assert result == "org_target"


def test_join_org_with_expired_code():
    from datetime import datetime, timezone, timedelta
    past = (datetime.now(timezone.utc) - timedelta(days=1)).strftime(
        '%Y-%m-%dT%H:%M:%SZ'
    )
    mock_repo = MagicMock()
    mock_repo.get_invite_code.return_value = {
        "org_id": "org_target", "expires_at": past
    }

    from app.services.org_service import OrgService
    svc = OrgService(org_repo=mock_repo)
    result = svc.join_org_with_code("U456", "EXPIRED")
    assert result is None


def test_update_member_role_requires_admin():
    mock_repo = MagicMock()

    from app.services.org_service import OrgService, PermissionError
    svc = OrgService(org_repo=mock_repo)
    try:
        svc.update_member_role("org_abc", "U456", "admin", _member_ctx())
        assert False, "Should raise PermissionError"
    except PermissionError:
        pass
