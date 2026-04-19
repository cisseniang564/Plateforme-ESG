"""
Tests d'intégration — Endpoints RGPD (/api/v1/me/export et /api/v1/me)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID    = uuid4()


def _make_mock_user():
    from datetime import datetime, timezone
    u = MagicMock()
    u.id = USER_ID
    u.tenant_id = TENANT_ID
    u.email = "alice@example.com"
    u.first_name = "Alice"
    u.last_name = "Martin"
    u.job_title = "RSE Manager"
    u.phone = "+33612345678"
    u.locale = "fr"
    u.timezone = "Europe/Paris"
    u.auth_provider = "local"
    u.is_active = True
    u.email_verified_at = None
    u.last_login_at = None
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = None
    u.notification_preferences = {}
    return u


@pytest.fixture
def client():
    import os
    os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
    os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-at-least-32!!")
    os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-32-chars-min!!")
    os.environ.setdefault("DATABASE_PASSWORD", "test")

    from fastapi.testclient import TestClient

    mock_user = _make_mock_user()

    async def mock_execute(query, *args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_user
        result.scalars.return_value.all.return_value = []
        return result

    mock_db = AsyncMock()
    mock_db.execute = mock_execute
    mock_db.commit = AsyncMock()

    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_tenant_id, get_current_user_id

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_tenant_id] = lambda: TENANT_ID
    app.dependency_overrides[get_current_user_id] = lambda: USER_ID

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ─── GET /me/export ───────────────────────────────────────────────────────────

class TestGDPRExport:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/me/export")
        assert resp.status_code == 200

    def test_response_is_json(self, client):
        resp = client.get("/api/v1/me/export")
        assert resp.headers["content-type"].startswith("application/json")

    def test_contains_user_section(self, client):
        resp = client.get("/api/v1/me/export")
        data = resp.json()
        assert "user" in data

    def test_user_has_email(self, client):
        resp = client.get("/api/v1/me/export")
        data = resp.json()
        assert "email" in data["user"]
        assert data["user"]["email"] == "alice@example.com"

    def test_contains_exported_at(self, client):
        resp = client.get("/api/v1/me/export")
        data = resp.json()
        assert "exported_at" in data

    def test_contains_regulation_field(self, client):
        resp = client.get("/api/v1/me/export")
        data = resp.json()
        assert "regulation" in data
        assert "Article 15" in data["regulation"]

    def test_no_password_hash_in_export(self, client):
        """Password hash must never appear in GDPR export."""
        resp = client.get("/api/v1/me/export")
        raw = resp.text
        assert "password_hash" not in raw
        assert "$2b$" not in raw  # bcrypt prefix

    def test_contains_data_categories(self, client):
        resp = client.get("/api/v1/me/export")
        data = resp.json()
        assert "data_categories" in data
        assert isinstance(data["data_categories"], list)

    def test_unauthenticated_returns_401(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as c:
            resp = c.get("/api/v1/me/export")
        assert resp.status_code == 401


# ─── DELETE /me ───────────────────────────────────────────────────────────────

class TestGDPRDelete:
    def test_returns_200(self, client):
        resp = client.delete("/api/v1/me")
        assert resp.status_code == 200

    def test_response_contains_message(self, client):
        resp = client.delete("/api/v1/me")
        data = resp.json()
        assert "message" in data

    def test_response_contains_anonymized_at(self, client):
        resp = client.delete("/api/v1/me")
        data = resp.json()
        assert "anonymized_at" in data

    def test_response_contains_note_about_data_retention(self, client):
        resp = client.delete("/api/v1/me")
        data = resp.json()
        assert "note" in data

    def test_unauthenticated_returns_401(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as c:
            resp = c.delete("/api/v1/me")
        assert resp.status_code == 401

    def test_message_mentions_rgpd(self, client):
        resp = client.delete("/api/v1/me")
        data = resp.json()
        assert "RGPD" in data["message"] or "rgpd" in data["message"].lower()
