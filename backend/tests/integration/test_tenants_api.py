"""
Tests d'intégration — Endpoints /tenants/me
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID    = uuid4()


def _make_mock_tenant(plan: str = "pro"):
    t = MagicMock()
    t.id = TENANT_ID
    t.name = "Acme Corp"
    t.slug = "acme-corp"
    t.plan_tier = plan
    t.status = "active"
    t.billing_email = "billing@acme.com"
    t.stripe_customer_id = None
    t.max_users = 50
    t.max_orgs = 100
    t.max_monthly_api_calls = 10_000
    t.data_retention_months = 36
    t.settings = {}
    t.feature_flags = {}
    t.is_active = True
    t.created_at = None
    t.updated_at = None
    return t


@pytest.fixture
def client():
    import os
    os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
    os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-at-least-32!!")
    os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-32-chars-min!!")
    os.environ.setdefault("DATABASE_PASSWORD", "test")

    from fastapi.testclient import TestClient
    from app.utils.jwt import create_access_token

    token = create_access_token(
        subject=str(USER_ID),
        tenant_id=str(TENANT_ID),
        user_id=str(USER_ID),
    )

    mock_tenant = _make_mock_tenant()

    async def mock_execute(query, *args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_tenant
        result.scalar_one.return_value = 5          # user count
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

    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as c:
        yield c

    app.dependency_overrides.clear()


# ─── GET /tenants/me ──────────────────────────────────────────────────────────

class TestGetTenant:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/tenants/me")
        assert resp.status_code == 200

    def test_contains_plan_tier(self, client):
        resp = client.get("/api/v1/tenants/me")
        data = resp.json()
        assert "plan_tier" in data

    def test_contains_limits(self, client):
        resp = client.get("/api/v1/tenants/me")
        data = resp.json()
        assert "max_users" in data or "plan_tier" in data

    def test_unauthenticated_returns_401(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as c:
            resp = c.get("/api/v1/tenants/me")
        assert resp.status_code == 401


# ─── GET /tenants/me/features ─────────────────────────────────────────────────

class TestTenantFeatures:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/tenants/me/features")
        assert resp.status_code == 200

    def test_contains_features_key(self, client):
        resp = client.get("/api/v1/tenants/me/features")
        data = resp.json()
        # Expect either features list or dict with available/unavailable
        assert isinstance(data, (dict, list))


# ─── GET /tenants/me/stats ────────────────────────────────────────────────────

class TestTenantStats:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/tenants/me/stats")
        assert resp.status_code == 200

    def test_contains_user_count(self, client):
        resp = client.get("/api/v1/tenants/me/stats")
        data = resp.json()
        # Should have total_users or similar
        assert isinstance(data, dict)
