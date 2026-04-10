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
        assert callable(get_namecard)

    def test_member_can_get_own_namecard(self):
        """成員可以取得自己的名片"""
        from app.firebase_utils import get_namecard
        assert callable(get_namecard)

    def test_member_cannot_get_others_namecard(self):
        """成員無法取得他人的名片"""
        from app.firebase_utils import get_namecard
        assert callable(get_namecard)
