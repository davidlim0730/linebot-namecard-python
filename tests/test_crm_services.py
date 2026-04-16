"""
Day 14 — tests for Day 4+5 CRM services and LINE Chat commands.

Coverage:
- deal_service: upsert_deal (create & update), list_deals, get_pipeline_summary
- activity_service: log_activity (with auto_link_namecard)
- action_service: schedule_action, complete_action, get_due_today
- LINE Chat handlers: handle_crm_today, handle_crm_search, handle_crm_pipeline
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.org import UserContext
from app.models.deal import Deal
from app.models.activity import Activity
from app.models.action import Action


# ---- helpers ----

def _user(role="member"):
    return UserContext(user_id="u1", org_id="org1", role=role)


def _deal(deal_id="d1", stage="0", entity_name="台積電", added_by="u1", est_value=None):
    return Deal(
        id=deal_id, org_id="org1", entity_name=entity_name,
        stage=stage, status_summary="test", added_by=added_by,
        created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z",
        est_value=est_value,
    )


def _activity(activity_id="a1", entity_name="台積電", added_by="u1"):
    return Activity(
        id=activity_id, org_id="org1", entity_name=entity_name,
        raw_transcript="test transcript", added_by=added_by,
        created_at="2026-01-01T00:00:00Z",
    )


def _action(action_id="ac1", entity_name="台積電", due_date="2026-01-01",
            status="pending", added_by="u1"):
    return Action(
        id=action_id, org_id="org1", entity_name=entity_name,
        task_detail="follow up", due_date=due_date, status=status,
        added_by=added_by, created_at="2026-01-01T00:00:00Z",
    )


# ============================================================
# DealService
# ============================================================

class TestDealService:

    def _make(self, list_by_entity=None, existing_deal=None):
        from app.services.deal_service import DealService
        deal_repo = MagicMock()
        org_repo  = MagicMock()
        deal_repo.list_by_entity_name.return_value = [existing_deal] if existing_deal else []
        deal_repo.save.return_value = True
        deal_repo.update.return_value = True
        deal_repo.get.return_value = existing_deal or _deal()
        deal_repo.list_all.return_value = {"d1": _deal()}
        org_repo.get.return_value = MagicMock(members=[])
        return DealService(deal_repo, org_repo), deal_repo, org_repo

    def test_upsert_creates_new_deal(self):
        svc, repo, _ = self._make()
        result = svc.upsert_deal("org1", {"entity_name": "台積電", "stage": "1"}, _user())
        assert repo.save.called
        assert not repo.update.called

    def test_upsert_updates_existing_deal(self):
        existing = _deal(stage="0")
        svc, repo, _ = self._make(existing_deal=existing)
        svc.upsert_deal("org1", {"entity_name": "台積電", "stage": "2"}, _user())
        assert repo.update.called
        assert not repo.save.called

    def test_upsert_logs_stage_change(self):
        existing = _deal(stage="0")
        svc, repo, _ = self._make(existing_deal=existing)
        svc.upsert_deal("org1", {"entity_name": "台積電", "stage": "3"}, _user())
        assert repo.log_stage_change.called
        call_args = repo.log_stage_change.call_args
        assert call_args[0][2] == "0"   # from_stage
        assert call_args[0][3] == "3"   # to_stage

    def test_upsert_no_stage_change_event_when_same_stage(self):
        existing = _deal(stage="2")
        svc, repo, _ = self._make(existing_deal=existing)
        svc.upsert_deal("org1", {"entity_name": "台積電", "stage": "2"}, _user())
        assert not repo.log_stage_change.called

    def test_list_deals_member_sees_own(self):
        deal_mine  = _deal("d1", added_by="u1")
        deal_other = _deal("d2", added_by="u2")
        svc, repo, _ = self._make()
        repo.list_all.return_value = {"d1": deal_mine, "d2": deal_other}
        result = svc.list_deals("org1", _user("member"))
        assert all(d.added_by == "u1" for d in result)

    def test_list_deals_admin_sees_all(self):
        deal_mine  = _deal("d1", added_by="u1")
        deal_other = _deal("d2", added_by="u2")
        svc, repo, _ = self._make()
        repo.list_all.return_value = {"d1": deal_mine, "d2": deal_other}
        result = svc.list_deals("org1", _user("admin"))
        assert len(result) == 2

    def test_pipeline_summary_totals(self):
        d1 = _deal("d1", stage="1", est_value=100000)
        d2 = _deal("d2", stage="2", est_value=200000)
        svc, repo, org_repo = self._make()
        repo.list_all.return_value = {"d1": d1, "d2": d2}
        summary = svc.get_pipeline_summary("org1", _user("admin"))
        assert summary["total_est_value"] == 300000
        assert summary["by_stage"]["1"] == 1
        assert summary["by_stage"]["2"] == 1


# ============================================================
# ActivityService
# ============================================================

class TestActivityService:

    def _make(self):
        from app.services.activity_service import ActivityService
        repo = MagicMock()
        repo.save.return_value = True
        repo.get.return_value = _activity()
        repo.list_all.return_value = {"a1": _activity()}
        return ActivityService(repo), repo

    @patch("app.services.activity_service.auto_link_or_create_contact", return_value="contact-123")
    @patch("app.services.activity_service.DealRepo")
    def test_log_activity_auto_links_namecard(self, mock_deal_repo, mock_link):
        mock_deal_repo.return_value.get.return_value = None
        svc, repo = self._make()
        svc.log_activity("org1", {"entity_name": "台積電", "raw_transcript": "test"}, _user())
        assert repo.save.called
        saved_data = repo.save.call_args[0][2]
        assert saved_data["entity_name"] == "台積電"

    @patch("app.services.activity_service.auto_link_or_create_contact", return_value="contact-new")
    @patch("app.services.activity_service.DealRepo")
    def test_log_activity_no_namecard_match(self, mock_deal_repo, mock_link):
        mock_deal_repo.return_value.get.return_value = None
        svc, repo = self._make()
        result = svc.log_activity("org1", {"entity_name": "未知客戶", "raw_transcript": "test"}, _user())
        assert repo.save.called

    def test_list_activities_member_sees_own(self):
        a_mine  = _activity("a1", added_by="u1")
        a_other = _activity("a2", added_by="u2")
        svc, repo = self._make()
        repo.list_all.return_value = {"a1": a_mine, "a2": a_other}
        result = svc.list_activities("org1", _user("member"))
        assert all(a.added_by == "u1" for a in result)

    def test_list_activities_admin_sees_all(self):
        a_mine  = _activity("a1", added_by="u1")
        a_other = _activity("a2", added_by="u2")
        svc, repo = self._make()
        repo.list_all.return_value = {"a1": a_mine, "a2": a_other}
        result = svc.list_activities("org1", _user("admin"))
        assert len(result) == 2


# ============================================================
# ActionService
# ============================================================

class TestActionService:

    def _make(self, due_actions=None):
        from app.services.action_service import ActionService
        repo = MagicMock()
        repo.save.return_value = True
        repo.get.return_value = _action()
        repo.list_all.return_value = {"ac1": _action()}
        repo.list_due_today.return_value = due_actions or []
        return ActionService(repo), repo

    def test_schedule_action_creates(self):
        svc, repo = self._make()
        result = svc.schedule_action("org1", {"entity_name": "台積電", "task_detail": "call", "due_date": "2026-04-20"}, _user())
        assert repo.save.called
        assert result is not None

    def test_schedule_action_skips_empty_due_date(self):
        svc, repo = self._make()
        result = svc.schedule_action("org1", {"entity_name": "台積電", "task_detail": "call", "due_date": ""}, _user())
        assert result is None
        assert not repo.save.called

    def test_complete_action(self):
        svc, repo = self._make()
        svc.complete_action("org1", "ac1", _user())
        repo.update.assert_called_once_with("org1", "ac1", {"status": "completed"})

    def test_get_due_today(self):
        due = [_action(due_date="2026-01-01")]
        svc, repo = self._make(due_actions=due)
        result = svc.get_due_today("org1")
        assert result == due

    def test_list_actions_member_sees_own(self):
        a_mine  = _action("ac1", added_by="u1")
        a_other = _action("ac2", added_by="u2")
        svc, repo = self._make()
        repo.list_all.return_value = {"ac1": a_mine, "ac2": a_other}
        result = svc.list_actions("org1", _user("member"))
        assert all(a.added_by == "u1" for a in result)

    def test_list_actions_admin_sees_all(self):
        a_mine  = _action("ac1", added_by="u1")
        a_other = _action("ac2", added_by="u2")
        svc, repo = self._make()
        repo.list_all.return_value = {"ac1": a_mine, "ac2": a_other}
        result = svc.list_actions("org1", _user("admin"))
        assert len(result) == 2


# ============================================================
# LINE Chat CRM command handlers
# ============================================================

class TestCrmLineHandlers:
    """Smoke tests for the three CRM LINE command handlers."""

    @pytest.mark.asyncio
    async def test_handle_crm_today_no_actions(self):
        from app.line_handlers import handle_crm_today
        with patch("app.line_handlers._action_repo") as repo, \
             patch("app.line_handlers.line_bot_api") as mock_api:
            repo.list_all.return_value = {}
            mock_api.reply_message = AsyncMock()
            await handle_crm_today("reply-token", "u1", "org1")
            mock_api.reply_message.assert_called_once()
            sent_text = mock_api.reply_message.call_args[0][1].text
            assert "無到期" in sent_text

    @pytest.mark.asyncio
    async def test_handle_crm_today_with_due_actions(self):
        from app.line_handlers import handle_crm_today
        today = datetime.utcnow().strftime("%Y-%m-%d")
        due = _action(due_date=today)
        with patch("app.line_handlers._action_repo") as repo, \
             patch("app.line_handlers.line_bot_api") as mock_api:
            repo.list_all.return_value = {"ac1": due}
            mock_api.reply_message = AsyncMock()
            await handle_crm_today("reply-token", "u1", "org1")
            sent_text = mock_api.reply_message.call_args[0][1].text
            assert "待辦" in sent_text

    @pytest.mark.asyncio
    async def test_handle_crm_search_not_found(self):
        from app.line_handlers import handle_crm_search
        with patch("app.line_handlers._card_repo") as card_repo, \
             patch("app.line_handlers.fuzzy_match_entity", return_value=None), \
             patch("app.line_handlers.line_bot_api") as mock_api:
            card_repo.list_all.return_value = {}
            mock_api.reply_message = AsyncMock()
            await handle_crm_search("reply-token", "org1", "不存在的公司")
            sent_text = mock_api.reply_message.call_args[0][1].text
            assert "找不到" in sent_text

    @pytest.mark.asyncio
    async def test_handle_crm_search_found(self):
        from app.models.card import Card
        from app.line_handlers import handle_crm_search
        card = Card(id="c1", org_id="org1", name="王總", company="台積電",
                    added_by="u1", created_at="2026-01-01T00:00:00Z")
        with patch("app.line_handlers._card_repo") as card_repo, \
             patch("app.line_handlers._deal_repo") as deal_repo, \
             patch("app.line_handlers.fuzzy_match_entity", return_value="台積電"), \
             patch("app.line_handlers.line_bot_api") as mock_api:
            card_repo.list_all.return_value = {"c1": card}
            deal_repo.list_by_entity_name.return_value = []
            mock_api.reply_message = AsyncMock()
            await handle_crm_search("reply-token", "org1", "台積")
            sent_text = mock_api.reply_message.call_args[0][1].text
            assert "王總" in sent_text

    @pytest.mark.asyncio
    async def test_handle_crm_pipeline_admin_only(self):
        from app.line_handlers import handle_crm_pipeline
        with patch("app.line_handlers._org_repo") as org_repo, \
             patch("app.line_handlers.line_bot_api") as mock_api:
            org_repo.get_user_role.return_value = "member"
            mock_api.reply_message = AsyncMock()
            await handle_crm_pipeline("reply-token", "u1", "org1")
            sent_text = mock_api.reply_message.call_args[0][1].text
            assert "僅限主管" in sent_text

    @pytest.mark.asyncio
    async def test_handle_crm_pipeline_admin_sees_data(self):
        from app.line_handlers import handle_crm_pipeline
        with patch("app.line_handlers._org_repo") as org_repo, \
             patch("app.line_handlers._deal_repo") as deal_repo, \
             patch("app.line_handlers.line_bot_api") as mock_api:
            org_repo.get_user_role.return_value = "admin"
            deal_repo.list_all.return_value = {"d1": _deal(stage="2", est_value=500000)}
            mock_api.reply_message = AsyncMock()
            await handle_crm_pipeline("reply-token", "u1", "org1")
            sent_text = mock_api.reply_message.call_args[0][1].text
            assert "Pipeline" in sent_text
            assert "500,000" in sent_text
