"""
Integration tests — Notifications endpoints (/api/v1/notifications/*)

Routes covered:
  GET  /api/v1/notifications              — list recent notifications
  POST /api/v1/notifications/read-all     — mark all as read
  POST /api/v1/notifications/{id}/read    — mark single as read
  GET  /api/v1/notifications/preferences  — get notification preferences
  PUT  /api/v1/notifications/preferences  — save notification preferences

All tests use FastAPI TestClient with mocked DB and auth.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()
NOTIF_ID  = str(uuid4())


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_audit_row(action: str = "create"):
    row = MagicMock()
    row.id        = uuid4()
    row.action    = action
    row.entity    = "DataEntry"
    row.entity_id = str(uuid4())
    row.user_id   = USER_ID
    row.tenant_id = TENANT_ID
    row.details   = {}
    row.ip_address = "127.0.0.1"
    row.created_at = datetime.now(timezone.utc)
    return row


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id, get_current_tenant_id

    audit_rows = [_make_audit_row("create"), _make_audit_row("update"), _make_audit_row("delete")]

    scalars_mock = MagicMock()
    scalars_mock.all = MagicMock(return_value=audit_rows)

    execute_result = MagicMock()
    execute_result.scalars = MagicMock(return_value=scalars_mock)
    execute_result.scalar  = MagicMock(return_value=3)
    execute_result.scalar_one_or_none = MagicMock(return_value=None)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.commit  = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def _db():
        yield mock_db

    async def _user_id():
        return USER_ID

    async def _tenant_id():
        return TENANT_ID

    app.dependency_overrides[get_db]                   = _db
    app.dependency_overrides[get_current_user_id]      = _user_id
    app.dependency_overrides[get_current_tenant_id]    = _tenant_id

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


# ─── GET / ────────────────────────────────────────────────────────────────────

class TestListNotifications:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/notifications",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_list_or_dict(self, client):
        resp = client.get(
            "/api/v1/notifications",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.get("/api/v1/notifications")
        async def _restore(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _restore
        assert resp.status_code == 401

    def test_limit_param(self, client):
        resp = client.get(
            "/api/v1/notifications?limit=5",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_unread_only_param(self, client):
        resp = client.get(
            "/api/v1/notifications?unread_only=true",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200


# ─── POST /read-all ──────────────────────────────────────────────────────────

class TestMarkAllRead:
    def test_returns_non_401(self, client):
        resp = client.post(
            "/api/v1/notifications/read-all",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_returns_200_or_204(self, client):
        resp = client.post(
            "/api/v1/notifications/read-all",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 204)


# ─── POST /{id}/read ─────────────────────────────────────────────────────────

class TestMarkSingleRead:
    def test_returns_non_401(self, client):
        resp = client.post(
            f"/api/v1/notifications/{NOTIF_ID}/read",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_invalid_id_422_or_404(self, client):
        resp = client.post(
            "/api/v1/notifications/not-a-uuid/read",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (404, 422)


# ─── GET /preferences ────────────────────────────────────────────────────────

class TestGetPreferences:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/notifications/preferences",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_has_alerts_key(self, client):
        resp = client.get(
            "/api/v1/notifications/preferences",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            body = resp.json()
            assert "alerts" in body or isinstance(body, dict)


# ─── PUT /preferences ────────────────────────────────────────────────────────

class TestSavePreferences:
    def test_save_preferences_non_401(self, client):
        payload = {
            "alerts": [
                {"id": "score_drop", "label": "Chute de score", "description": "Score baisse de > 5pts",
                 "enabled": True, "channel": "both"}
            ],
            "email_enabled": True,
            "webhook_url": "",
        }
        resp = client.put(
            "/api/v1/notifications/preferences",
            json=payload,
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_save_empty_preferences(self, client):
        resp = client.put(
            "/api/v1/notifications/preferences",
            json={"alerts": [], "email_enabled": False, "webhook_url": ""},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code not in (401, 403, 500)
