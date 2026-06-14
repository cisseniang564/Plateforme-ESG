"""
Integration tests — POST /api/v1/auth/demo-session
Verifies the full HTTP flow: routing, DB lookup, token generation, and response shape.

The legacy /demo-login endpoint has been permanently disabled (security fix —
it used to share the admin's tenant) and now always returns 403. /demo-session
is its replacement: it seeds an isolated, viewer-only sandbox tenant and issues
a short-lived JWT. ``seed_demo_data`` is mocked so no real database is needed.
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration

DEMO_USER_EMAIL = "demo@esgflow.io"


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _make_mock_user(email: str, tenant_id=None):
    u = MagicMock()
    u.id = uuid4()
    u.tenant_id = tenant_id or uuid4()
    u.email = email
    u.first_name = "Démo"
    u.last_name = "Compte"
    u.is_active = True
    u.email_verified_at = datetime.now(timezone.utc)
    u.mfa_enabled = False
    u.role = None  # => viewer
    return u


@pytest.fixture
def demo_client():
    """Client with seed_demo_data mocked and the demo user pre-resolved."""
    demo_user = _make_mock_user(DEMO_USER_EMAIL)

    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=demo_user)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=result)
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_db():
        yield mock_db

    from app.main import app
    from app.db.session import get_db

    app.dependency_overrides[get_db] = override_db

    with patch(
        "app.services.demo_tenant.seed_demo_data",
        new=AsyncMock(return_value={"counts": {"organizations": 1}}),
    ):
        with TestClient(app, raise_server_exceptions=False) as c:
            c._demo_user = demo_user
            yield c

    app.dependency_overrides.clear()


# ─── Happy path ───────────────────────────────────────────────────────────────

class TestDemoSessionHappyPath:

    def test_returns_200(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert resp.status_code == 200

    def test_response_contains_access_token(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["access_token"]

    def test_token_type_is_bearer(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert resp.json()["token_type"] == "bearer"

    def test_user_email_is_demo(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert resp.json()["user"]["email"] == DEMO_USER_EMAIL

    def test_is_demo_flag_true(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert resp.json()["is_demo"] is True

    def test_response_contains_seed_counts(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert "seed_counts" in resp.json()

    def test_access_token_is_valid_jwt(self, demo_client):
        import jwt as _jwt
        import os

        resp = demo_client.post("/api/v1/auth/demo-session")
        token = resp.json()["access_token"]
        secret = os.environ["JWT_SECRET_KEY"]
        payload = _jwt.decode(token, secret, algorithms=["HS256"])
        assert payload["sub"] == DEMO_USER_EMAIL
        assert payload["is_demo"] is True

    def test_no_body_required(self, demo_client):
        """demo-session is a POST with no body — must work with empty request."""
        resp = demo_client.post(
            "/api/v1/auth/demo-session",
            json=None,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 200

    def test_idempotent_multiple_calls(self, demo_client):
        """Calling demo-session twice should return 200 both times.

        The first call sets an httpOnly access_token cookie; the second
        request must authenticate via the Bearer header (not the cookie) to
        avoid tripping CSRFMiddleware, which rejects cookie-authenticated
        mutating requests without a matching Origin/Referer.
        """
        r1 = demo_client.post("/api/v1/auth/demo-session")
        assert r1.status_code == 200
        token = r1.json()["access_token"]

        r2 = demo_client.post(
            "/api/v1/auth/demo-session",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 200


# ─── Public access ────────────────────────────────────────────────────────────

class TestDemoSessionIsPublic:

    def test_no_auth_header_required(self, demo_client):
        """demo-session must be callable without any Authorization header."""
        resp = demo_client.post("/api/v1/auth/demo-session")
        assert resp.status_code != 401

    def test_wrong_auth_header_still_200(self, demo_client):
        """Even a garbage token header must not block demo-session."""
        resp = demo_client.post(
            "/api/v1/auth/demo-session",
            headers={"Authorization": "Bearer garbage.token.here"},
        )
        assert resp.status_code == 200

    def test_method_not_allowed_for_get(self, demo_client):
        """GET /auth/demo-session should return 405."""
        resp = demo_client.get("/api/v1/auth/demo-session")
        assert resp.status_code == 405


# ─── Legacy /demo-login is permanently disabled ───────────────────────────────

class TestLegacyDemoLoginDisabled:
    """The old /demo-login endpoint must keep returning 403 (security fix —
    it used to share the admin's tenant and expose real customer data)."""

    def test_demo_login_returns_403(self, demo_client):
        resp = demo_client.post("/api/v1/auth/demo-login")
        assert resp.status_code == 403


# ─── Token usage after demo-session ───────────────────────────────────────────

class TestDemoTokenCanAuthenticateProtectedRoutes:
    """The token from demo-session must be accepted by protected endpoints."""

    def test_token_accepted_by_supply_chain_dashboard(self, demo_client):
        login_resp = demo_client.post("/api/v1/auth/demo-session")
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        # Supply chain dashboard is protected — should not return 401.
        # (May return 500 due to the mocked DB, but NOT 401.)
        resp = demo_client.get(
            "/api/v1/supply-chain/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code != 401

    def test_token_accepted_by_organisations_endpoint(self, demo_client):
        login_resp = demo_client.post("/api/v1/auth/demo-session")
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        resp = demo_client.get(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code != 401
