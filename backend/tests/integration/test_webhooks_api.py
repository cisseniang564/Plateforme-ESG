"""
Integration tests — Webhooks endpoints (/api/v1/webhooks/*)

Routes covered:
  GET  /api/v1/webhooks/events        — list available webhook event types
  GET  /api/v1/webhooks/              — list tenant webhooks
  POST /api/v1/webhooks/              — create webhook
  GET  /api/v1/webhooks/{id}/deliveries — delivery history
  PATCH /api/v1/webhooks/{id}         — update webhook
  DELETE /api/v1/webhooks/{id}        — delete webhook

Uses get_current_user_id from auth_middleware.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID  = uuid4()
USER_ID    = uuid4()
WEBHOOK_ID = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "admin@test.com"; u.is_active = True
    return u


def _make_webhook():
    w = MagicMock()
    w.id = WEBHOOK_ID; w.tenant_id = TENANT_ID
    w.name = "Test Webhook"
    w.url = "https://hooks.example.com/esg"
    w.events = ["score.calculated", "data.imported"]
    w.is_active = True
    w.secret = "whsec_test123"
    w.created_at = datetime.now(timezone.utc)
    return w


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id

    mock_user    = _make_user()
    mock_webhook = _make_webhook()

    scalars_mock = MagicMock()
    scalars_mock.all   = MagicMock(return_value=[mock_webhook])
    scalars_mock.first = MagicMock(return_value=mock_webhook)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(return_value=mock_webhook)
    execute_result.scalar  = MagicMock(return_value=1)
    execute_result.scalars = MagicMock(return_value=scalars_mock)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.add = MagicMock(); mock_db.commit = AsyncMock()
    mock_db.delete = AsyncMock(); mock_db.refresh = AsyncMock()

    async def _db(): yield mock_db
    async def _uid(): return USER_ID

    app.dependency_overrides[get_db]                = _db
    app.dependency_overrides[get_current_user_id]   = _uid

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestWebhookEvents:
    def test_events_200(self, client):
        resp = client.get(
            "/api/v1/webhooks/events",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_events_returns_list(self, client):
        resp = client.get(
            "/api/v1/webhooks/events",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), (list, dict))

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.get("/api/v1/webhooks/events")
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401


class TestWebhookList:
    def test_list_returns_200(self, client):
        resp = client.get(
            "/api/v1/webhooks/",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_list_returns_array(self, client):
        resp = client.get(
            "/api/v1/webhooks/",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))


class TestWebhookCreate:
    def test_create_non_401(self, client):
        resp = client.post(
            "/api/v1/webhooks/",
            json={
                "name": "My Hook",
                "url": "https://hooks.example.com/esg",
                "events": ["score.calculated"],
            },
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_create_missing_url_422(self, client):
        resp = client.post(
            "/api/v1/webhooks/",
            json={"name": "Hook", "events": ["score.calculated"]},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_create_invalid_url_422(self, client):
        resp = client.post(
            "/api/v1/webhooks/",
            json={"name": "Hook", "url": "not-a-url", "events": []},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post("/api/v1/webhooks/", json={})
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401


class TestWebhookDeliveries:
    def test_deliveries_non_401(self, client):
        resp = client.get(
            f"/api/v1/webhooks/{WEBHOOK_ID}/deliveries",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_invalid_uuid_422(self, client):
        resp = client.get(
            "/api/v1/webhooks/bad-uuid/deliveries",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422


class TestWebhookUpdate:
    def test_update_non_401(self, client):
        resp = client.patch(
            f"/api/v1/webhooks/{WEBHOOK_ID}",
            json={"name": "Updated Hook", "is_active": False},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_invalid_uuid_422(self, client):
        resp = client.patch(
            "/api/v1/webhooks/not-uuid",
            json={"name": "X"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422


class TestWebhookDelete:
    def test_delete_non_401(self, client):
        resp = client.delete(
            f"/api/v1/webhooks/{WEBHOOK_ID}",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_invalid_uuid_422(self, client):
        resp = client.delete(
            "/api/v1/webhooks/bad",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422
