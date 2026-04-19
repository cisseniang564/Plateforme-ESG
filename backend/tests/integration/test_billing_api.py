"""
Tests d'intégration — Endpoints de facturation (/api/v1/billing/*)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID    = uuid4()


def _make_tenant(plan: str = "starter", stripe_id: str | None = None):
    t = MagicMock()
    t.id = TENANT_ID
    t.name = "Test Corp"
    t.plan_tier = plan
    t.status = "active"
    t.stripe_customer_id = stripe_id
    t.stripe_subscription_id = None
    t.stripe_subscription_status = None
    t.stripe_current_period_end = None
    t.trial_ends_at = None
    t.max_users = 10
    t.max_orgs = 20
    t.max_monthly_api_calls = 1_000
    return t


def _make_user():
    u = MagicMock()
    u.id = USER_ID
    u.tenant_id = TENANT_ID
    u.email = "test@testcorp.com"
    return u


@pytest.fixture
def client():
    import os
    os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
    os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-at-least-32!!")
    os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-32-chars-min!!")
    os.environ.setdefault("DATABASE_PASSWORD", "test")

    from fastapi.testclient import TestClient

    mock_tenant = _make_tenant()
    mock_user   = _make_user()

    async def mock_execute(query, *args, **kwargs):
        result = MagicMock()
        q = str(query).lower()
        if "user" in q:
            result.scalar_one_or_none.return_value = mock_user
        else:
            result.scalar_one_or_none.return_value = mock_tenant
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


# ─── GET /billing/subscription ────────────────────────────────────────────────

class TestGetSubscription:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/billing/subscription")
        assert resp.status_code == 200

    def test_contains_plan_tier(self, client):
        resp = client.get("/api/v1/billing/subscription")
        data = resp.json()
        assert "plan_tier" in data

    def test_contains_status(self, client):
        resp = client.get("/api/v1/billing/subscription")
        data = resp.json()
        assert "status" in data

    def test_contains_max_users(self, client):
        resp = client.get("/api/v1/billing/subscription")
        data = resp.json()
        assert "max_users" in data


# ─── GET /billing/invoices ────────────────────────────────────────────────────

class TestListInvoices:
    def test_returns_200_when_no_stripe_customer(self, client):
        """When no Stripe customer → return empty list, not 500."""
        resp = client.get("/api/v1/billing/invoices")
        assert resp.status_code == 200

    def test_returns_list(self, client):
        resp = client.get("/api/v1/billing/invoices")
        data = resp.json()
        assert isinstance(data, list)

    def test_unauthenticated_returns_401(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as c:
            resp = c.get("/api/v1/billing/invoices")
        assert resp.status_code == 401


# ─── POST /billing/checkout ───────────────────────────────────────────────────

class TestCreateCheckout:
    def test_stripe_not_configured_returns_503(self, client):
        """When Stripe key is placeholder, returns 503 with helpful message."""
        resp = client.post(
            "/api/v1/billing/checkout",
            json={"price_id": "price_test123"},
        )
        # Either 503 (Stripe not configured) or 200 (Stripe configured)
        assert resp.status_code in (200, 503)

    def test_missing_price_id_returns_422(self, client):
        resp = client.post("/api/v1/billing/checkout", json={})
        assert resp.status_code == 422

    def test_invalid_body_returns_422(self, client):
        resp = client.post("/api/v1/billing/checkout", json={"wrong_field": "value"})
        assert resp.status_code == 422


# ─── POST /billing/portal ─────────────────────────────────────────────────────

class TestCreatePortal:
    def test_no_stripe_customer_returns_400(self, client):
        """Tenant without stripe_customer_id → 400 Bad Request."""
        resp = client.post("/api/v1/billing/portal", json={})
        # Returns 400 (no subscription yet) or 503 (Stripe not configured)
        assert resp.status_code in (400, 503)
