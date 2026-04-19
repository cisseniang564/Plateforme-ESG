"""
Integration tests — POST /api/v1/auth/demo-login
Verifies the full HTTP flow: routing, DB lookup, token generation, and response shape.
No real database — DB is mocked at the dependency level.
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration

DEMO_EMAIL = "demo@greenconnect.cloud"


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _make_mock_user(email: str, tenant_id=None):
    u = MagicMock()
    u.id = uuid4()
    u.tenant_id = tenant_id or uuid4()
    u.email = email
    u.first_name = "Compte"
    u.last_name = "Démo"
    u.is_active = True
    u.email_verified_at = datetime.now(timezone.utc)
    u.mfa_enabled = False
    u.role = None  # => viewer
    return u


@pytest.fixture
def demo_client_existing_user():
    """Client with an existing demo user already in DB."""
    demo_user = _make_mock_user(DEMO_EMAIL)

    def _scalar(obj):
        r = MagicMock()
        r.scalar_one_or_none = MagicMock(return_value=obj)
        return r

    async def _execute(query, *a, **kw):
        return _scalar(demo_user)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_db():
        yield mock_db

    from app.main import app
    from app.db.session import get_db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def demo_client_no_user():
    """Client where no demo OR admin user exists — fallback org path."""
    call_count = {"n": 0}

    def _scalar(obj):
        r = MagicMock()
        r.scalar_one_or_none = MagicMock(return_value=obj)
        return r

    async def _execute(query, *a, **kw):
        # Always return None so both demo and admin lookups return None
        return _scalar(None)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()
    # After refresh(), the user object needs enough attributes to serialise
    refreshed_user = _make_mock_user(DEMO_EMAIL)
    mock_db.refresh = AsyncMock(side_effect=lambda u: None)

    async def override_db():
        yield mock_db

    from app.main import app
    from app.db.session import get_db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Happy path ───────────────────────────────────────────────────────────────

class TestDemoLoginHappyPath:

    def test_returns_200(self, demo_client_existing_user):
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.status_code == 200

    def test_response_contains_tokens(self, demo_client_existing_user):
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.status_code == 200
        data = resp.json()
        assert "tokens" in data
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]

    def test_token_type_is_bearer(self, demo_client_existing_user):
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.json()["tokens"]["token_type"] == "bearer"

    def test_user_email_is_demo(self, demo_client_existing_user):
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.json()["user"]["email"] == DEMO_EMAIL

    def test_needs_onboarding_is_false(self, demo_client_existing_user):
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.json()["user"]["needs_onboarding"] is False

    def test_role_defaults_to_viewer(self, demo_client_existing_user):
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.json()["user"]["role"] == "viewer"

    def test_access_token_is_valid_jwt(self, demo_client_existing_user):
        from jose import jwt as _jwt
        import os

        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        token = resp.json()["tokens"]["access_token"]
        secret = os.environ["JWT_SECRET_KEY"]
        payload = _jwt.decode(token, secret, algorithms=["HS256"])
        assert payload["sub"] == DEMO_EMAIL

    def test_no_body_required(self, demo_client_existing_user):
        """demo-login is a POST with no body — must work with empty request."""
        resp = demo_client_existing_user.post(
            "/api/v1/auth/demo-login",
            json=None,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 200

    def test_idempotent_multiple_calls(self, demo_client_existing_user):
        """Calling demo-login twice should return 200 both times."""
        r1 = demo_client_existing_user.post("/api/v1/auth/demo-login")
        r2 = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert r1.status_code == 200
        assert r2.status_code == 200


# ─── Public access ────────────────────────────────────────────────────────────

class TestDemoLoginIsPublic:

    def test_no_auth_header_required(self, demo_client_existing_user):
        """demo-login must be callable without any Authorization header."""
        resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert resp.status_code != 401

    def test_wrong_auth_header_still_200(self, demo_client_existing_user):
        """Even a garbage token header must not block demo-login."""
        resp = demo_client_existing_user.post(
            "/api/v1/auth/demo-login",
            headers={"Authorization": "Bearer garbage.token.here"},
        )
        assert resp.status_code == 200

    def test_method_not_allowed_for_get(self, demo_client_existing_user):
        """GET /auth/demo-login should return 405."""
        resp = demo_client_existing_user.get("/api/v1/auth/demo-login")
        assert resp.status_code == 405


# ─── Token usage after demo-login ─────────────────────────────────────────────

class TestDemoTokenCanAuthenticateProtectedRoutes:
    """The token from demo-login must be accepted by protected endpoints."""

    def test_token_accepted_by_supply_chain_dashboard(self, demo_client_existing_user):
        login_resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert login_resp.status_code == 200
        token = login_resp.json()["tokens"]["access_token"]

        # Supply chain dashboard is protected — should return 200 (not 401)
        # (May return 500 due to mocked DB, but NOT 401)
        resp = demo_client_existing_user.get(
            "/api/v1/supply-chain/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code != 401

    def test_token_accepted_by_organisations_endpoint(self, demo_client_existing_user):
        login_resp = demo_client_existing_user.post("/api/v1/auth/demo-login")
        assert login_resp.status_code == 200
        token = login_resp.json()["tokens"]["access_token"]

        resp = demo_client_existing_user.get(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code != 401
