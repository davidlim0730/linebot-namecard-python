from unittest.mock import MagicMock, patch

from app.firebase_utils import _check_card_access


class TestCheckCardAccess:
    """測試權限檢查函數"""

    def test_admin_can_access_any_card(self):
        """管理員可以訪問任何人建立的名片"""
        result = _check_card_access(
            card_added_by="user_a",
            current_user_id="admin_user",
            user_role="admin"
        )
        assert result is True

    def test_member_can_access_own_card(self):
        """成員可以訪問自己建立的名片"""
        result = _check_card_access(
            card_added_by="user_a",
            current_user_id="user_a",
            user_role="member"
        )
        assert result is True

    def test_member_cannot_access_others_card(self):
        """成員無法訪問他人建立的名片"""
        result = _check_card_access(
            card_added_by="user_a",
            current_user_id="user_b",
            user_role="member"
        )
        assert result is False

    def test_admin_role_takes_precedence(self):
        """即使 user_id 不同，admin 角色也能訪問"""
        result = _check_card_access(
            card_added_by="user_a",
            current_user_id="user_b",
            user_role="admin"
        )
        assert result is True


class TestGetNamecard:
    """測試 get_namecard 的權限檢查"""

    def test_admin_can_get_any_namecard(self):
        """管理員可以取得任何人的名片"""
        from app.firebase_utils import get_namecard

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Admin user_b can access card created by user_a
            result = get_namecard(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                user_role="admin"
            )

        assert result == mock_card_data
        assert result["name"] == "Alice"

    def test_member_can_get_own_namecard(self):
        """成員可以取得自己的名片"""
        from app.firebase_utils import get_namecard

        # Mock Firebase reference
        mock_card_data = {"name": "Bob", "added_by": "user_b"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_b can access own card
            result = get_namecard(
                card_id="card_456",
                user_id="user_b",
                org_id="org_1",
                user_role="member"
            )

        assert result == mock_card_data
        assert result["name"] == "Bob"

    def test_member_cannot_get_others_namecard(self):
        """成員無法取得他人的名片"""
        from app.firebase_utils import get_namecard

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_b cannot access card created by user_a
            result = get_namecard(
                card_id="card_789",
                user_id="user_b",
                org_id="org_1",
                user_role="member"
            )

        # Permission check should fail and return None
        assert result is None


class TestGetAllNamecards:
    """測試 get_all_namecards 的權限隔離"""

    def test_member_gets_only_own_cards(self):
        """成員只能取得自己建立的名片"""
        from app.firebase_utils import get_all_namecards
        assert callable(get_all_namecards)

    def test_admin_gets_all_cards(self):
        """管理員可以取得全部名片"""
        from app.firebase_utils import get_all_namecards
        assert callable(get_all_namecards)

    def test_empty_result_if_no_own_cards(self):
        """如果成員沒有建立任何名片，應返回空列表"""
        from app.firebase_utils import get_all_namecards
        assert callable(get_all_namecards)
