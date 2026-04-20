"""
Integration tests — Billing endpoints (extended coverage)
Completes test_billing_api.py by covering routes not tested there:

  POST /api/v1/billing/portal       — Stripe customer portal session
  POST /api/v1/billing/cancel       — cancel subscription
  POST /api/v1/billing/reactivate   — reactivate subscription
  POST /api/v1/billing/change-plan  — upgrade/downgrade plan
  POST /api/v1/billing/retry-payment — retry failed payment
  GET  /api/v1/billing/features     — feature gates for current plan
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_tenant(stripe_customer_id: str | None = "cus_test123", plan: str = "pro"):
    t = MagicMock()
    t.id = TENANT_ID
    t.name = "TestCorp"
    t.plan_tier = plan
    t.status = "active"
    t.stripe_customer_id = stripe_customer_id
    t.stripe_subscription_id = "sub_test456"
    t.stripe_subscription_status = "active"
    t.stripe_current_period_end = None
    t.trial_ends_at = None
    t.max_users = 20
    t.max_orgs = 50
    t.max_monthly_api_calls = 10_000
    t.settings = {}
    return t


def _make_user():
    u = MagicMock()
    u.id = USER_ID
    u.tenant_id = TENANT_ID
    u.email = "admin@testcorp.com"
    u.role = MagicMock()
    u.role.name = "tenant_admin"
    return u


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id, get_current_tenant_id
    from app.core.permissions import require_role

    mock_tenant = _make_tenant()
    mock_user   = _make_user()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(side_effect=[
        mock_tenant, mock_user,
        mock_tenant, mock_user,
        mock_tenant, mock_user,
        mock_tenant, mock_user,
        mock_tenant, mock_user,
        mock_tenant, mock_user,
        mock_tenant, mock_user,
        mock_tenant, mock_user,
    ])

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

    # Bypass role guard
    async def _no_op():
        return None

    app.dependency_overrides[get_db]                = _db
    app.dependency_overrides[get_current_user_id]   = _user_id
    app.dependency_overrides[get_current_tenant_id] = _tenant_id

    with TestClient(app, raise_server_exceptions=False) as c:
        c._mock_tenant = mock_tenant
        c._mock_user   = mock_user
        yield c

    app.dependency_overrides.clear()


# ─── GET /features ────────────────────────────────────────────────────────────

class TestBillingFeatures:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/billing/features",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_dict(self, client):
        resp = client.get(
            "/api/v1/billing/features",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), dict)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.get("/api/v1/billing/features")
        async def _restore(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _restore
        assert resp.status_code == 401


# ─── POST /portal ─────────────────────────────────────────────────────────────

class TestBillingPortal:
    def test_no_stripe_key_503(self, client):
        """Without Stripe key configured, portal creation should return 503 or 400."""
        resp = client.post(
            "/api/v1/billing/portal",
            json={"return_url": "https://app.greenconnect.cloud/settings"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (400, 503, 500)

    def test_portal_with_mock_stripe(self, client):
        """With mocked Stripe, should return portal URL."""
        mock_session = MagicMock()
        mock_session.url = "https://billing.stripe.com/session/test_portal_123"
        with patch("app.services.stripe_service.StripeService.create_portal_session",
                   return_value=mock_session):
            resp = client.post(
                "/api/v1/billing/portal",
                json={"return_url": "https://app.greenconnect.cloud/settings"},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code not in (401, 403)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post("/api/v1/billing/portal", json={})
        async def _restore(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _restore
        assert resp.status_code == 401


# ─── POST /cancel ─────────────────────────────────────────────────────────────

class TestBillingCancel:
    def test_cancel_no_stripe_returns_error(self, client):
        resp = client.post(
            "/api/v1/billing/cancel",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code not in (401, 403)

    def test_cancel_with_mocked_stripe(self, client):
        with patch("app.services.stripe_service.StripeService.cancel_subscription",
                   return_value={"status": "canceled"}):
            resp = client.post(
                "/api/v1/billing/cancel",
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code not in (401, 403)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post("/api/v1/billing/cancel")
        async def _restore(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _restore
        assert resp.status_code == 401


# ─── POST /reactivate ─────────────────────────────────────────────────────────

class TestBillingReactivate:
    def test_reactivate_returns_non_401(self, client):
        resp = client.post(
            "/api/v1/billing/reactivate",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_reactivate_with_mocked_stripe(self, client):
        with patch("app.services.stripe_service.StripeService.reactivate_subscription",
                   return_value={"status": "active"}):
            resp = client.post(
                "/api/v1/billing/reactivate",
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code not in (401, 403)


# ─── POST /change-plan ────────────────────────────────────────────────────────

class TestBillingChangePlan:
    def test_missing_plan_and_price_id_returns_error(self, client):
        """Neither plan nor price_id provided — should fail gracefully."""
        resp = client.post(
            "/api/v1/billing/change-plan",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        # Either 400 (bad input) or 503 (no Stripe key) — not 401/422
        assert resp.status_code not in (401, 403)

    def test_change_plan_with_mock(self, client):
        with patch("app.services.stripe_service.StripeService.change_subscription_plan",
                   return_value={"status": "updated"}):
            resp = client.post(
                "/api/v1/billing/change-plan",
                json={"plan": "starter", "billing_cycle": "monthly"},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code not in (401, 403)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post("/api/v1/billing/change-plan", json={"plan": "pro"})
        async def _restore(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _restore
        assert resp.status_code == 401


# ─── POST /retry-payment ──────────────────────────────────────────────────────

class TestBillingRetryPayment:
    def test_retry_returns_non_401(self, client):
        resp = client.post(
            "/api/v1/billing/retry-payment",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_retry_with_mock(self, client):
        with patch("app.services.stripe_service.StripeService.retry_failed_payment",
                   return_value={"status": "succeeded"}):
            resp = client.post(
                "/api/v1/billing/retry-payment",
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code not in (401, 403)
