"""
Tests for contact-centric CRM API endpoints.
"""
import os
import pytest
from unittest.mock import patch, MagicMock

from app.models.activity import Activity
from app.models.action import Action
from app.models.org import UserContext


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


def _user():
    return UserContext(user_id="u1", org_id="org1", role="member")


def _activity(activity_id="a1", deal_id=None):
    return Activity(
        id=activity_id,
        org_id="org1",
        entity_name="ACME",
        raw_transcript="test",
        added_by="u1",
        created_at="2026-01-01T00:00:00Z",
        deal_id=deal_id,
    )


def _action(action_id="ac1", status="pending"):
    return Action(
        id=action_id,
        org_id="org1",
        entity_name="ACME",
        task_detail="follow up",
        due_date="2026-01-01",
        status=status,
        added_by="u1",
        created_at="2026-01-01T00:00:00Z",
    )


# ---- GET /contacts/{id}/activities ----

class TestContactActivities:

    def test_returns_activities(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.activity_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_by_contact_id.return_value = [
                _activity("a1"), _activity("a2")
            ]
            resp = client.get(
                "/api/v1/contacts/c1/activities",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id"] == "a1"

    def test_unauthenticated_returns_403(self, client):
        resp = client.get("/api/v1/contacts/c1/activities")
        assert resp.status_code == 403

    def test_deal_id_filter(self, client):
        activities = [
            _activity("a1", deal_id="d1"),
            _activity("a2", deal_id="d2"),
        ]
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.activity_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_by_contact_id.return_value = activities
            resp = client.get(
                "/api/v1/contacts/c1/activities?deal_id=d1",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "a1"

    def test_empty_when_cross_org(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.activity_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_by_contact_id.return_value = []
            resp = client.get(
                "/api/v1/contacts/other_org_contact/activities",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        assert resp.json() == []


# ---- GET /contacts/{id}/actions ----

class TestContactActions:

    def test_returns_actions(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.action_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_by_contact_id.return_value = [
                _action("ac1"), _action("ac2")
            ]
            resp = client.get(
                "/api/v1/contacts/c1/actions",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_unauthenticated_returns_403(self, client):
        resp = client.get("/api/v1/contacts/c1/actions")
        assert resp.status_code == 403

    def test_status_filter_pending(self, client):
        actions = [
            _action("ac1", status="pending"),
            _action("ac2", status="completed"),
        ]
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.action_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_by_contact_id.return_value = actions
            resp = client.get(
                "/api/v1/contacts/c1/actions?status=pending",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["status"] == "pending"

    def test_status_filter_completed(self, client):
        actions = [
            _action("ac1", status="pending"),
            _action("ac2", status="completed"),
        ]
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.action_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_by_contact_id.return_value = actions
            resp = client.get(
                "/api/v1/contacts/c1/actions?status=completed",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["status"] == "completed"
