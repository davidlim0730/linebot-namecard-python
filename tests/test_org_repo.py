from unittest.mock import MagicMock, patch


def test_org_repo_get_user_org_id():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = "org_abc"
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        result = repo.get_user_org_id("U123")
        assert result == "org_abc"
        mock_db.reference.assert_called_with("user_org_map/U123")


def test_org_repo_get_user_org_id_returns_none():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = None
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        assert repo.get_user_org_id("U_unknown") is None


def test_org_repo_get_user_role():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = "admin"
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        role = repo.get_user_role("org_abc", "U123")
        assert role == "admin"


def test_org_repo_get_returns_org():
    mock_data = {
        "name": "測試團隊",
        "created_by": "U123",
        "plan_type": "trial",
        "members": {"U123": {"role": "admin", "joined_at": "2026-04-13T00:00:00"}}
    }
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = mock_data
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        org = repo.get("org_abc")
        assert org is not None
        assert org.name == "測試團隊"
        assert len(org.members) == 1
        assert org.members[0].role == "admin"


def test_org_repo_get_returns_none():
    with patch("app.repositories.org_repo.db") as mock_db:
        mock_db.reference.return_value.get.return_value = None
        from app.repositories.org_repo import OrgRepo
        repo = OrgRepo()
        assert repo.get("org_nonexistent") is None
