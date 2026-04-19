"""
Unit tests — demo-login logic (app.api.v1.endpoints.auth.demo_login)
Tests the User lookup + creation logic without a real database.
JWT token creation is also verified.

NOTE: SQLAlchemy uses parameterised queries, so email literals don't appear
in str(query). We match by CALL ORDER instead — first execute() returns the
demo-user lookup result, second returns the admin lookup result.
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.unit


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_user(email: str, tenant_id=None, role=None):
    """Return a minimal mock User object."""
    u = MagicMock()
    u.id = uuid4()
    u.tenant_id = tenant_id or uuid4()
    u.email = email
    u.first_name = "Compte"
    u.last_name = "Démo"
    u.is_active = True
    u.email_verified_at = datetime.now(timezone.utc)
    u.mfa_enabled = False
    u.role = role
    return u


def _make_db(demo_user=None, admin_user=None):
    """
    Return a mock DB whose execute() returns results by CALL ORDER:
      1st call → demo-user lookup result
      2nd call → admin-user lookup result (only reached when demo_user is None)
    """
    call_count = [0]

    def _scalar(obj):
        r = MagicMock()
        r.scalar_one_or_none = MagicMock(return_value=obj)
        return r

    async def _execute(query, *args, **kwargs):
        call_count[0] += 1
        if call_count[0] == 1:
            return _scalar(demo_user)   # demo-user lookup
        return _scalar(admin_user)      # admin-user lookup (fallback path)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=_execute)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()
    return mock_db


# ─── Token shape — existing user ─────────────────────────────────────────────

class TestDemoLoginTokenShape:
    """Verify that demo_login() returns well-formed JWT tokens."""

    @pytest.mark.asyncio
    async def test_existing_demo_user_gets_tokens(self):
        demo = _make_user("demo@greenconnect.cloud")
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        assert "tokens" in response
        tokens = response["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_access_token_is_decodable_jwt(self):
        from jose import jwt as _jwt
        import os

        demo = _make_user("demo@greenconnect.cloud")
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        secret = os.environ["JWT_SECRET_KEY"]
        payload = _jwt.decode(
            response["tokens"]["access_token"],
            secret,
            algorithms=["HS256"],
        )
        assert payload["sub"] == demo.email

    @pytest.mark.asyncio
    async def test_user_payload_structure(self):
        demo = _make_user("demo@greenconnect.cloud")
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        user = response["user"]
        assert user["email"] == "demo@greenconnect.cloud"
        assert user["first_name"] == "Compte"
        assert user["needs_onboarding"] is False

    @pytest.mark.asyncio
    async def test_email_verified_at_in_response(self):
        demo = _make_user("demo@greenconnect.cloud")
        demo.email_verified_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        assert response["user"]["email_verified_at"] is not None


# ─── Demo user creation — first-run path ─────────────────────────────────────

class TestDemoUserCreation:
    """When no demo user exists, a new one should be created."""

    @pytest.mark.asyncio
    async def test_creates_demo_user_when_admin_exists(self):
        """Admin found → demo user should be created under admin's tenant."""
        admin = _make_user("admin@greenconnect.cloud")
        db = _make_db(demo_user=None, admin_user=admin)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        # add() called at least once (for the new demo User)
        db.add.assert_called()
        db.commit.assert_called()
        # Response still has tokens
        assert "tokens" in response

    @pytest.mark.asyncio
    async def test_new_demo_user_inherits_admin_tenant(self):
        """When admin exists, the created demo user gets admin's tenant_id."""
        admin = _make_user("admin@greenconnect.cloud")
        admin_tenant_id = admin.tenant_id

        call_count = [0]

        def _scalar(obj):
            r = MagicMock()
            r.scalar_one_or_none = MagicMock(return_value=obj)
            return r

        async def _execute(query, *a, **kw):
            call_count[0] += 1
            if call_count[0] == 1:
                return _scalar(None)    # demo user not found
            return _scalar(admin)       # admin found

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=_execute)
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        # The user in the response must carry the admin's tenant_id
        assert str(response["user"]["tenant_id"]) == str(admin_tenant_id)

    @pytest.mark.asyncio
    async def test_creates_fallback_tenant_when_no_admin(self):
        """When no admin exists, demo_login creates a standalone Tenant."""
        db = _make_db(demo_user=None, admin_user=None)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        # add() and flush() must have been called (for the new Tenant + User)
        db.add.assert_called()
        db.flush.assert_called()
        assert "tokens" in response


# ─── Edge cases ───────────────────────────────────────────────────────────────

class TestDemoLoginEdgeCases:

    @pytest.mark.asyncio
    async def test_demo_user_with_no_role_returns_viewer(self):
        demo = _make_user("demo@greenconnect.cloud")
        demo.role = None
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        assert response["user"]["role"] == "viewer"

    @pytest.mark.asyncio
    async def test_demo_user_with_role(self):
        role = MagicMock()
        role.name = "admin"
        demo = _make_user("demo@greenconnect.cloud", role=role)
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        assert response["user"]["role"] == "admin"

    @pytest.mark.asyncio
    async def test_mfa_disabled_in_demo(self):
        demo = _make_user("demo@greenconnect.cloud")
        demo.mfa_enabled = False
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        assert response["user"]["mfa_enabled"] is False

    @pytest.mark.asyncio
    async def test_tokens_are_different(self):
        """Access token and refresh token must be distinct strings."""
        demo = _make_user("demo@greenconnect.cloud")
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        response = await demo_login(db=db)

        tokens = response["tokens"]
        assert tokens["access_token"] != tokens["refresh_token"]

    @pytest.mark.asyncio
    async def test_no_db_write_for_existing_user(self):
        """When demo user already exists, no rows should be written."""
        demo = _make_user("demo@greenconnect.cloud")
        db = _make_db(demo_user=demo)

        from app.api.v1.auth import demo_login
        await demo_login(db=db)

        # Existing user → no add(), no commit()
        db.add.assert_not_called()
        db.commit.assert_not_called()
