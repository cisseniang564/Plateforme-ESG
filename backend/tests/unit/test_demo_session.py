"""
Unit tests — demo-session logic (app.api.v1.auth.demo_session)

Verifies JWT issuance for the sandboxed demo tenant. ``seed_demo_data`` is
mocked so no real database is needed; the post-seed user lookup is mocked
via the DB session.

Also covers the now-disabled legacy /demo-login endpoint, which must keep
returning 403 (security fix — it used to share the admin's tenant).
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.unit


def _make_demo_user(tenant_id=None):
    """Return a minimal mock User object for the demo tenant."""
    u = MagicMock()
    u.id = uuid4()
    u.tenant_id = tenant_id or uuid4()
    u.email = "demo@esgflow.io"
    u.first_name = "Démo"
    u.last_name = "Prospect"
    return u


def _make_db(demo_user):
    """Mock DB session whose execute() returns the demo-user lookup result."""
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=demo_user)

    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    return db


def _patched_seed(counts=None):
    return AsyncMock(return_value={"counts": counts or {}})


# ─── Token shape ───────────────────────────────────────────────────────────

class TestDemoSessionTokenShape:
    """Verify that demo_session() returns a well-formed JWT and payload."""

    @pytest.mark.asyncio
    async def test_returns_access_token(self):
        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed()):
            result = await demo_session(response=response, db=db)

        assert "access_token" in result
        assert result["token_type"] == "bearer"
        assert result["expires_in"] == 3600
        assert result["is_demo"] is True

    @pytest.mark.asyncio
    async def test_access_token_is_decodable_jwt(self):
        import jwt as _jwt
        import os

        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed()):
            result = await demo_session(response=response, db=db)

        secret = os.environ["JWT_SECRET_KEY"]
        payload = _jwt.decode(result["access_token"], secret, algorithms=["HS256"])
        assert payload["sub"] == demo_user.email
        assert payload["tenant_id"] == str(demo_user.tenant_id)
        assert payload["user_id"] == str(demo_user.id)

    @pytest.mark.asyncio
    async def test_token_carries_demo_claims(self):
        import jwt as _jwt
        import os

        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed()):
            result = await demo_session(response=response, db=db)

        payload = _jwt.decode(result["access_token"], os.environ["JWT_SECRET_KEY"], algorithms=["HS256"])
        assert payload["is_demo"] is True
        assert payload["plan_tier"] == "pro"
        assert payload["max_monthly_api_calls"] == 10000

    @pytest.mark.asyncio
    async def test_user_payload_structure(self):
        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed()):
            result = await demo_session(response=response, db=db)

        user = result["user"]
        assert user["email"] == demo_user.email
        assert user["first_name"] == demo_user.first_name
        assert user["last_name"] == demo_user.last_name
        assert user["id"] == str(demo_user.id)
        assert user["tenant_id"] == str(demo_user.tenant_id)


# ─── Seeding ────────────────────────────────────────────────────────────────

class TestDemoSessionSeeding:
    """Verify the idempotent seeding step is invoked and its result surfaced."""

    @pytest.mark.asyncio
    async def test_calls_seed_demo_data(self):
        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()
        seed_mock = _patched_seed()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=seed_mock):
            await demo_session(response=response, db=db)

        seed_mock.assert_called_once_with(db)

    @pytest.mark.asyncio
    async def test_seed_counts_passed_through(self):
        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()
        counts = {"organizations": 1, "data_entries": 30, "materiality": 7, "risks": 8, "scores": 1}

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed(counts)):
            result = await demo_session(response=response, db=db)

        assert result["seed_counts"] == counts

    @pytest.mark.asyncio
    async def test_raises_500_if_user_missing_after_seed(self):
        from fastapi import HTTPException

        db = _make_db(demo_user=None)
        response = MagicMock()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed()):
            with pytest.raises(HTTPException) as exc_info:
                await demo_session(response=response, db=db)

        assert exc_info.value.status_code == 500


# ─── Cookie ─────────────────────────────────────────────────────────────────

class TestDemoSessionCookie:
    """Verify the httpOnly auth cookie is set so reloads stay authenticated."""

    @pytest.mark.asyncio
    async def test_sets_access_token_cookie(self):
        demo_user = _make_demo_user()
        db = _make_db(demo_user)
        response = MagicMock()

        from app.api.v1.auth import demo_session
        with patch("app.services.demo_tenant.seed_demo_data", new=_patched_seed()):
            result = await demo_session(response=response, db=db)

        response.set_cookie.assert_called_once()
        _, kwargs = response.set_cookie.call_args
        assert kwargs["key"] == "access_token"
        assert kwargs["value"] == result["access_token"]
        assert kwargs["httponly"] is True
        assert kwargs["max_age"] == 3600


# ─── Legacy /demo-login — disabled ───────────────────────────────────────────

class TestDemoLoginDisabled:
    """The old /demo-login endpoint must stay disabled (security fix —
    it used to share the admin's tenant and expose real data)."""

    @pytest.mark.asyncio
    async def test_demo_login_raises_403(self):
        from fastapi import HTTPException
        from app.api.v1.auth import demo_login

        with pytest.raises(HTTPException) as exc_info:
            await demo_login()

        assert exc_info.value.status_code == 403
