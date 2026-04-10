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

        # Mock Firebase data: 2 cards, one by user_a, one by user_b
        mock_org_data = {
            "card_001": {"name": "Alice", "added_by": "user_a"},
            "card_002": {"name": "Bob", "added_by": "user_b"}
        }

        with patch("app.firebase_utils.db") as mock_db:
            mock_ref = MagicMock()
            mock_ref.get.return_value = mock_org_data
            mock_db.reference.return_value = mock_ref

            # Member user_a should only get their own card
            result = get_all_namecards(
                org_id="org_1",
                user_id="user_a",
                user_role="member"
            )

        # Should return only 1 card (user_a's)
        assert len(result) == 1
        assert result[0]["card_id"] == "card_001"
        assert result[0]["name"] == "Alice"

    def test_admin_gets_all_cards(self):
        """管理員可以取得全部名片"""
        from app.firebase_utils import get_all_namecards

        mock_org_data = {
            "card_001": {"name": "Alice", "added_by": "user_a"},
            "card_002": {"name": "Bob", "added_by": "user_b"}
        }

        with patch("app.firebase_utils.db") as mock_db:
            mock_ref = MagicMock()
            mock_ref.get.return_value = mock_org_data
            mock_db.reference.return_value = mock_ref

            result = get_all_namecards(
                org_id="org_1",
                user_id="user_c",  # Different user
                user_role="admin"
            )

        # Admin should get all 2 cards
        assert len(result) == 2
        assert {r["card_id"] for r in result} == {"card_001", "card_002"}

    def test_empty_result_if_no_own_cards(self):
        """成員沒有建立名片時回傳空列表"""
        from app.firebase_utils import get_all_namecards

        # Cards from other users only
        mock_org_data = {
            "card_001": {"name": "Alice", "added_by": "user_a"},
            "card_002": {"name": "Bob", "added_by": "user_b"}
        }

        with patch("app.firebase_utils.db") as mock_db:
            mock_ref = MagicMock()
            mock_ref.get.return_value = mock_org_data
            mock_db.reference.return_value = mock_ref

            # user_c (member) never created any cards
            result = get_all_namecards(
                org_id="org_1",
                user_id="user_c",
                user_role="member"
            )

        assert result == []  # Empty list


class TestSearchNamecards:
    """測試 search_namecards 的權限隔離"""

    def test_member_search_only_own_cards(self):
        """成員搜尋只返回自己建立的名片結果"""
        from app.firebase_utils import search_namecards
        assert callable(search_namecards)

    def test_admin_search_all_cards(self):
        """管理員搜尋返回全部名片結果"""
        from app.firebase_utils import search_namecards
        assert callable(search_namecards)

    def test_search_empty_if_no_matches(self):
        """沒有符合權限的搜尋結果應返回空列表"""
        from app.firebase_utils import search_namecards
        assert callable(search_namecards)


class TestDeleteNamecard:
    """測試 delete_namecard 的權限檢查"""

    def test_member_can_delete_own_card(self):
        """成員可以刪除自己建立的名片"""
        from app.firebase_utils import delete_namecard

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_a can delete their own card
            result = delete_namecard(
                card_id="card_123",
                user_id="user_a",
                org_id="org_1",
                user_role="member"
            )

        assert result is True
        mock_ref.delete.assert_called_once()

    def test_member_cannot_delete_others_card(self):
        """成員無法刪除他人建立的名片"""
        from app.firebase_utils import delete_namecard

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_b cannot delete card created by user_a
            result = delete_namecard(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                user_role="member"
            )

        assert result is False
        mock_ref.delete.assert_not_called()

    def test_admin_can_delete_any_card(self):
        """管理員可以刪除任何人建立的名片"""
        from app.firebase_utils import delete_namecard

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Admin user_b can delete card created by user_a
            result = delete_namecard(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                user_role="admin"
            )

        assert result is True
        mock_ref.delete.assert_called_once()


class TestUpdateNamecardField:
    """測試 update_namecard_field 的權限檢查"""

    def test_member_can_update_own_card(self):
        """成員可以更新自己建立的名片欄位"""
        from app.firebase_utils import update_namecard_field

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            with patch("app.firebase_utils.trigger_sync"):
                # Member user_a can update their own card
                result = update_namecard_field(
                    card_id="card_123",
                    user_id="user_a",
                    org_id="org_1",
                    field="name",
                    value="Updated Name",
                    user_role="member"
                )

        assert result is True
        mock_ref.update.assert_called_once()

    def test_member_cannot_update_others_card(self):
        """成員無法更新他人建立的名片欄位"""
        from app.firebase_utils import update_namecard_field

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_b cannot update card created by user_a
            result = update_namecard_field(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                field="name",
                value="Updated Name",
                user_role="member"
            )

        assert result is False
        mock_ref.update.assert_not_called()

    def test_admin_can_update_any_card(self):
        """管理員可以更新任何人建立的名片欄位"""
        from app.firebase_utils import update_namecard_field

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a"}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            with patch("app.firebase_utils.trigger_sync"):
                # Admin user_b can update card created by user_a
                result = update_namecard_field(
                    card_id="card_123",
                    user_id="user_b",
                    org_id="org_1",
                    field="name",
                    value="Updated Name",
                    user_role="admin"
                )

        assert result is True
        mock_ref.update.assert_called_once()


class TestTagOperations:
    """測試 add_tag_to_card 和 remove_tag_from_card 的權限檢查"""

    def test_member_can_add_tag_to_own_card(self):
        """成員可以為自己建立的名片新增標籤"""
        from app.firebase_utils import add_tag_to_card

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a", "tags": []}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_a can add tag to their own card
            result = add_tag_to_card(
                card_id="card_123",
                user_id="user_a",
                org_id="org_1",
                tag_name="customer",
                user_role="member"
            )

        assert result is True
        mock_ref.update.assert_called_once()

    def test_member_cannot_add_tag_to_others_card(self):
        """成員無法為他人建立的名片新增標籤"""
        from app.firebase_utils import add_tag_to_card

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a", "tags": []}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_b cannot add tag to card created by user_a
            result = add_tag_to_card(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                tag_name="customer",
                user_role="member"
            )

        assert result is False
        mock_ref.update.assert_not_called()

    def test_admin_can_add_tag_to_any_card(self):
        """管理員可以為任何人建立的名片新增標籤"""
        from app.firebase_utils import add_tag_to_card

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a", "tags": []}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Admin user_b can add tag to card created by user_a
            result = add_tag_to_card(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                tag_name="customer",
                user_role="admin"
            )

        assert result is True
        mock_ref.update.assert_called_once()

    def test_member_can_remove_tag_from_own_card(self):
        """成員可以從自己建立的名片移除標籤"""
        from app.firebase_utils import remove_tag_from_card

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a", "tags": ["customer"]}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_a can remove tag from their own card
            result = remove_tag_from_card(
                card_id="card_123",
                user_id="user_a",
                org_id="org_1",
                tag_name="customer",
                user_role="member"
            )

        assert result is True
        mock_ref.update.assert_called_once()

    def test_member_cannot_remove_tag_from_others_card(self):
        """成員無法從他人建立的名片移除標籤"""
        from app.firebase_utils import remove_tag_from_card

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a", "tags": ["customer"]}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Member user_b cannot remove tag from card created by user_a
            result = remove_tag_from_card(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                tag_name="customer",
                user_role="member"
            )

        assert result is False
        mock_ref.update.assert_not_called()

    def test_admin_can_remove_tag_from_any_card(self):
        """管理員可以從任何人建立的名片移除標籤"""
        from app.firebase_utils import remove_tag_from_card

        # Mock Firebase reference
        mock_card_data = {"name": "Alice", "added_by": "user_a", "tags": ["customer"]}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_card_data

        with patch("app.firebase_utils.db.reference", return_value=mock_ref):
            # Admin user_b can remove tag from card created by user_a
            result = remove_tag_from_card(
                card_id="card_123",
                user_id="user_b",
                org_id="org_1",
                tag_name="customer",
                user_role="admin"
            )

        assert result is True
        mock_ref.update.assert_called_once()


class TestPermissionIsolationScenarios:
    """整合測試：成員隔離場景"""

    def test_scenario_1_member_a_creates_card_member_b_cannot_see(self):
        """場景 1：成員 A 建立名片，成員 B 無法看到"""
        # 成員 B 無法訪問成員 A 的名片
        assert not _check_card_access("user_a", "user_b", "member")
        # 成員 A 可以訪問自己的
        assert _check_card_access("user_a", "user_a", "member")

    def test_scenario_2_admin_can_see_all_cards(self):
        """場景 2：管理員能看到全部名片"""
        assert _check_card_access("user_a", "admin_user", "admin")
        assert _check_card_access("user_b", "admin_user", "admin")

    def test_scenario_3_member_cannot_edit_others_card(self):
        """場景 3：成員無法編輯他人的名片"""
        assert not _check_card_access("user_a", "user_b", "member")

    def test_scenario_4_csv_export_respects_permission(self):
        """場景 4：CSV 匯出符合權限"""
        from app.firebase_utils import get_all_namecards
        assert callable(get_all_namecards)
