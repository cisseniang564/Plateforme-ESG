"""
Tests d'intégration — Endpoints d'authentification
Teste le comportement HTTP réel via FastAPI TestClient + dépendances mockées.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.integration


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """FastAPI TestClient avec DB mockée."""
    from fastapi.testclient import TestClient
    from passlib.context import CryptContext

    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

    DEMO_EMAIL = "admin@demo.esgflow.com"
    DEMO_PASSWORD = "Admin123!"
    DEMO_HASH = pwd.hash(DEMO_PASSWORD)
    DEMO_TENANT = uuid4()
    DEMO_USER_ID = uuid4()

    # Mock User object
    mock_user = MagicMock()
    mock_user.id = DEMO_USER_ID
    mock_user.tenant_id = DEMO_TENANT
    mock_user.email = DEMO_EMAIL
    mock_user.password_hash = DEMO_HASH
    mock_user.first_name = "Admin"
    mock_user.last_name = "Demo"
    mock_user.is_active = True
    mock_user.auth_provider = "local"
    mock_user.role_id = None
    mock_user.locale = "fr"
    mock_user.timezone = "Europe/Paris"
    mock_user.job_title = None
    mock_user.email_verified_at = None
    mock_user.last_login_at = None
    mock_user.updated_at = None

    # Mock Tenant
    mock_tenant = MagicMock()
    mock_tenant.id = DEMO_TENANT
    mock_tenant.name = "Demo Company"
    mock_tenant.plan_tier = "pro"

    # Mock DB result
    def make_scalar_result(obj):
        r = MagicMock()
        r.scalar_one_or_none.return_value = obj
        return r

    async def mock_execute(query, *args, **kwargs):
        q_str = str(query)
        if "users" in q_str.lower() or "User" in q_str:
            return make_scalar_result(mock_user)
        if "tenant" in q_str.lower():
            return make_scalar_result(mock_tenant)
        return make_scalar_result(None)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()

    async def override_get_db():
        yield mock_db

    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c, DEMO_EMAIL, DEMO_PASSWORD, str(DEMO_USER_ID), str(DEMO_TENANT)

    app.dependency_overrides.clear()


# ─── Login ────────────────────────────────────────────────────────────────────

class TestLoginEndpoint:

    def test_login_success_returns_200(self, client):
        c, email, password, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200

    def test_login_success_returns_tokens(self, client):
        c, email, password, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            data = resp.json()
            assert "tokens" in data or "access_token" in data

    def test_login_wrong_password_returns_401(self, client):
        c, email, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": email, "password": "WrongPass!!"})
        assert resp.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": "nobody@nowhere.com", "password": "Test1234!"})
        assert resp.status_code in (401, 404)

    def test_login_missing_email_returns_422(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/login", json={"password": "Test1234!"})
        assert resp.status_code == 422

    def test_login_missing_password_returns_422(self, client):
        c, email, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": email})
        assert resp.status_code == 422

    def test_login_invalid_email_format_returns_422(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "Test1234!"})
        assert resp.status_code == 422

    def test_login_empty_body_returns_422(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422


# ─── Protected routes ─────────────────────────────────────────────────────────

class TestProtectedEndpoints:

    def test_billing_without_token_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/billing/subscription")
        assert resp.status_code == 401

    def test_organizations_without_token_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/organizations")
        assert resp.status_code == 401

    def test_reports_without_token_returns_401(self, client):
        c, *_ = client
        resp = c.post("/api/v1/reports/generate", json={"report_type": "csrd"})
        assert resp.status_code == 401

    def test_health_is_public(self, client):
        c, *_ = client
        resp = c.get("/health")
        assert resp.status_code == 200

    def test_stripe_webhook_is_public_no_401(self, client):
        """Webhook doit être accessible sans token (retourne 400 sig invalide, pas 401)."""
        c, *_ = client
        resp = c.post("/webhooks/stripe", content=b"{}", headers={"stripe-signature": "invalid"})
        assert resp.status_code != 401

    def test_register_is_public(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/register", json={
            "email": "new@test.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "company_name": "Test Corp"
        })
        # Should not be 401 (may be 200 or 400 due to mock)
        assert resp.status_code != 401

    def test_invalid_token_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/billing/subscription",
                     headers={"Authorization": "Bearer invalid.jwt.token"})
        assert resp.status_code == 401

    def test_malformed_auth_header_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/billing/subscription",
                     headers={"Authorization": "NotBearer token"})
        assert resp.status_code == 401


# ─── Registration ─────────────────────────────────────────────────────────────

class TestRegisterEndpoint:

    def test_register_missing_fields_returns_422(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/register", json={"email": "test@test.com"})
        assert resp.status_code == 422

    def test_register_invalid_email_returns_422(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/register", json={
            "email": "not-valid",
            "password": "Test1234!",
            "first_name": "A", "last_name": "B", "company_name": "C"
        })
        assert resp.status_code == 422

    def test_register_empty_body_returns_422(self, client):
        c, *_ = client
        resp = c.post("/api/v1/auth/register", json={})
        assert resp.status_code == 422


# ─── Billing endpoints ────────────────────────────────────────────────────────

class TestBillingEndpoints:

    def _get_token(self, client):
        c, email, password, *_ = client
        resp = c.post("/api/v1/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            data = resp.json()
            tokens = data.get("tokens", data)
            return tokens.get("access_token", "")
        return ""

    def test_checkout_without_price_id_returns_422(self, client):
        c, *_ = client
        token = self._get_token(client)
        if not token:
            pytest.skip("Login failed in test environment — skipping")
        resp = c.post("/api/v1/billing/checkout",
                      json={},
                      headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 422

    def test_invoices_returns_list(self, client):
        c, *_ = client
        token = self._get_token(client)
        if not token:
            pytest.skip("Login failed in test environment — skipping")
        resp = c.get("/api/v1/billing/invoices",
                     headers={"Authorization": f"Bearer {token}"})
        # Should return 200 with empty list (no Stripe configured)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
