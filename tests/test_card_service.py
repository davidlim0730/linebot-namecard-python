from unittest.mock import MagicMock
from app.models.card import Card, CardUpdate
from app.models.org import UserContext


def _make_card(card_id="card_001", added_by="U123", email="test@test.com"):
    return Card(
        id=card_id, name="王小明", email=email,
        added_by=added_by, created_at="2026-04-13T00:00:00"
    )


def _admin_ctx():
    return UserContext(user_id="U123", org_id="org_abc", role="admin")


def _member_ctx(user_id="U456"):
    return UserContext(user_id=user_id, org_id="org_abc", role="member")


def test_get_card_admin_can_access_any():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U999")

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    card = svc.get_card("org_abc", "card_001", _admin_ctx())
    assert card is not None


def test_get_card_member_can_only_access_own():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U999")

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    card = svc.get_card("org_abc", "card_001", _member_ctx("U456"))
    assert card is None


def test_get_card_member_can_access_own():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U456")

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    card = svc.get_card("org_abc", "card_001", _member_ctx("U456"))
    assert card is not None


def test_update_card_forbidden_for_member():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U999")

    from app.services.card_service import CardService, PermissionError
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    try:
        svc.update_card("org_abc", "card_001", CardUpdate(name="新名"), _member_ctx("U456"))
        assert False, "Should have raised PermissionError"
    except PermissionError:
        pass


def test_update_card_succeeds_for_owner():
    mock_repo = MagicMock()
    mock_repo.get.return_value = _make_card(added_by="U456")
    mock_repo.update.return_value = True

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    result = svc.update_card("org_abc", "card_001", CardUpdate(name="新名"), _member_ctx("U456"))
    assert result is True
    mock_repo.update.assert_called_once()


def test_check_duplicate_returns_existing_id():
    mock_repo = MagicMock()
    mock_repo.check_exists_by_email.return_value = "existing_001"

    from app.services.card_service import CardService
    svc = CardService(card_repo=mock_repo, org_repo=MagicMock())
    result = svc.check_duplicate("org_abc", "dup@test.com")
    assert result == "existing_001"
