"""
Tests for contact-centric CRM API endpoints.
"""
import os
import pytest
from unittest.mock import patch, MagicMock

from app.models.activity import Activity
from app.models.action import Action
from app.models.org import UserContext
from app.models.card import Contact


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


def _contact(contact_id="c1"):
    return Contact(
        id=contact_id,
        contact_type="person",
        display_name="Alice",
        added_by="u1",
        created_at="2026-01-01T00:00:00Z",
    )


# ---- GET /contacts ----

class TestListContacts:

    def test_returns_contacts(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_all.return_value = {"c1": _contact("c1"), "c2": _contact("c2")}
            resp = client.get(
                "/api/v1/contacts",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_returns_empty_list(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.list_all.return_value = {}
            resp = client.get(
                "/api/v1/contacts",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_unauthenticated_returns_403(self, client):
        resp = client.get("/api/v1/contacts")
        assert resp.status_code == 403


# ---- GET /contacts/:id ----

class TestGetContact:

    def test_returns_contact(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.get.return_value = _contact("c1")
            resp = client.get(
                "/api/v1/contacts/c1",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        assert resp.json()["id"] == "c1"

    def test_returns_404_when_not_found(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.get.return_value = None
            resp = client.get(
                "/api/v1/contacts/missing",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 404
        assert resp.json()["detail"]["error"] == "not_found"

    def test_unauthenticated_returns_403(self, client):
        resp = client.get("/api/v1/contacts/c1")
        assert resp.status_code == 403


# ---- PUT /contacts/:id ----

class TestUpdateContact:

    def test_updates_contact(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.get.return_value = _contact("c1")
            resp = client.put(
                "/api/v1/contacts/c1",
                json={"display_name": "Alice Updated"},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock_repo.update.assert_called_once()
        call_args = mock_repo.update.call_args[0]
        assert call_args[2]["display_name"] == "Alice Updated"
        assert "updated_at" in call_args[2]

    def test_returns_404_when_not_found(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.get.return_value = None
            resp = client.put(
                "/api/v1/contacts/missing",
                json={"display_name": "X"},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 404

    def test_no_update_when_body_empty(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            mock_repo.get.return_value = _contact("c1")
            resp = client.put(
                "/api/v1/contacts/c1",
                json={},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        mock_repo.update.assert_not_called()

    def test_unauthenticated_returns_403(self, client):
        resp = client.put("/api/v1/contacts/c1", json={"display_name": "X"})
        assert resp.status_code == 403


# ---- POST /contacts ----

class TestCreateContact:

    def test_creates_contact(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            resp = client.post(
                "/api/v1/contacts",
                json={"display_name": "Bob", "contact_type": "person"},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert "id" in data
        mock_repo.save.assert_called_once()
        saved_data = mock_repo.save.call_args[0][2]
        assert saved_data["display_name"] == "Bob"
        assert saved_data["contact_type"] == "person"
        assert saved_data["added_by"] == "u1"
        assert saved_data["org_id"] == "org1"

    def test_optional_fields_included(self, client):
        with patch("app.api.crm.auth_service") as mock_auth, \
             patch("app.api.crm.contact_repo") as mock_repo:
            mock_auth.verify_jwt.return_value = _user()
            resp = client.post(
                "/api/v1/contacts",
                json={
                    "display_name": "Bob",
                    "contact_type": "person",
                    "email": "bob@example.com",
                    "title": "CEO",
                },
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        saved_data = mock_repo.save.call_args[0][2]
        assert saved_data["email"] == "bob@example.com"
        assert saved_data["title"] == "CEO"

    def test_unauthenticated_returns_403(self, client):
        resp = client.post(
            "/api/v1/contacts",
            json={"display_name": "Bob", "contact_type": "person"},
        )
        assert resp.status_code == 403

    def test_missing_required_fields_returns_422(self, client):
        with patch("app.api.crm.auth_service") as mock_auth:
            mock_auth.verify_jwt.return_value = _user()
            resp = client.post(
                "/api/v1/contacts",
                json={"display_name": "Bob"},  # missing contact_type
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 422
