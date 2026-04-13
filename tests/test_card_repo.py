from unittest.mock import MagicMock, patch


def test_card_repo_get_returns_card():
    mock_data = {
        "name": "王小明",
        "title": "業務",
        "company": "ABC",
        "phone": "02-1234",
        "mobile": "0912",
        "email": "wang@abc.com",
        "line_id": "wangxm",
        "address": "台北",
        "memo": "備註",
        "added_by": "U123",
        "created_at": "2026-04-13T00:00:00",
        "role_tags": ["VIP"],
    }
    with patch("app.repositories.card_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = mock_data
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        card = repo.get("org_abc", "card_001")
        assert card is not None
        assert card.id == "card_001"
        assert card.name == "王小明"
        assert card.tags == ["VIP"]


def test_card_repo_get_returns_none_when_not_found():
    with patch("app.repositories.card_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = None
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        card = repo.get("org_abc", "nonexistent")
        assert card is None


def test_card_repo_list_all():
    mock_data = {
        "card_001": {
            "name": "王小明", "added_by": "U1",
            "created_at": "2026-04-13T00:00:00",
            "role_tags": ["VIP"]
        },
        "card_002": {
            "name": "李大華", "added_by": "U2",
            "created_at": "2026-04-13T00:00:00",
        },
    }
    with patch("app.repositories.card_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = mock_data
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        cards = repo.list_all("org_abc")
        assert len(cards) == 2
        assert cards["card_001"].tags == ["VIP"]
        assert cards["card_002"].tags == []


def test_card_repo_update():
    with patch("app.repositories.card_repo.db") as mock_db:
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        result = repo.update("org_abc", "card_001", {"name": "新名字"})
        assert result is True
        mock_db.reference.return_value.update.assert_called_once_with({"name": "新名字"})


def test_card_repo_delete():
    with patch("app.repositories.card_repo.db") as mock_db:
        from app.repositories.card_repo import CardRepo
        repo = CardRepo()
        result = repo.delete("org_abc", "card_001")
        assert result is True
        mock_db.reference.return_value.delete.assert_called_once()
