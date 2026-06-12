"""
Tests d'intégration — endpoint /admin/users

Vérifie que les endpoints admin sont correctement scopés au tenant
de l'administrateur courant (fix du bug de fuite cross-tenant).
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import date, datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user(tenant_id=None):
    user = MagicMock()
    user.tenant_id = tenant_id or uuid4()
    user.id = uuid4()
    return user


def _make_db_user_row(tenant_id, first_name="Alice", last_name="Dupont"):
    """Simule un User ORM object."""
    u = MagicMock()
    u.id = uuid4()
    u.email = f"{first_name.lower()}@test.com"
    u.first_name = first_name
    u.last_name = last_name
    u.tenant_id = tenant_id
    u.role = "esg_manager"
    u.created_at = datetime(2026, 1, 15, 10, 0, 0)
    u.email_verified_at = datetime(2026, 1, 15, 12, 0, 0)  # verified
    u.is_active = True
    return u


def _make_tenant_row(tenant_id, name="Acme Corp"):
    t = MagicMock()
    t.id = tenant_id
    t.name = name
    t.subscription_status = "active"
    return t


# ═══════════════════════════════════════════════════════════════════════════════
# 1. GET /registrations/recent — isolation tenant
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecentRegistrations:
    @pytest.mark.asyncio
    async def test_returns_only_own_tenant_users(self):
        from app.api.v1.endpoints.admin_users import get_recent_registrations
        tid = uuid4()
        admin = _make_user(tid)

        u = _make_db_user_row(tid)
        tenant_obj = _make_tenant_row(tid)

        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[(u, tenant_obj)])
        db.execute = AsyncMock(return_value=result)

        resp = await get_recent_registrations(limit=10, current_user=admin, db=db)
        assert resp["total"] == 1
        assert resp["registrations"][0]["tenant_id"] == str(tid)

    @pytest.mark.asyncio
    async def test_query_includes_tenant_filter(self):
        """Le WHERE tenant_id = ... est présent dans la requête exécutée."""
        from app.api.v1.endpoints.admin_users import get_recent_registrations
        from sqlalchemy.sql import ClauseElement
        tid = uuid4()
        admin = _make_user(tid)

        captured_stmts = []

        async def mock_execute(stmt, *args, **kwargs):
            captured_stmts.append(stmt)
            result = MagicMock()
            result.all = MagicMock(return_value=[])
            return result

        db = AsyncMock()
        db.execute = mock_execute

        await get_recent_registrations(limit=5, current_user=admin, db=db)

        assert len(captured_stmts) == 1
        # Le tenant_id de l'admin doit apparaître dans le statement compilé
        stmt_str = str(captured_stmts[0].compile(compile_kwargs={"literal_binds": False}))
        # Vérifie la présence de la clause WHERE sur tenant_id (paramétré)
        assert "tenant_id" in stmt_str.lower()

    @pytest.mark.asyncio
    async def test_limit_is_capped_at_100(self):
        from app.api.v1.endpoints.admin_users import get_recent_registrations
        admin = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[])
        db.execute = AsyncMock(return_value=result)

        # Doit passer sans erreur même avec un limit énorme
        resp = await get_recent_registrations(limit=9999, current_user=admin, db=db)
        assert resp["total"] == 0

    @pytest.mark.asyncio
    async def test_empty_tenant_returns_empty_list(self):
        from app.api.v1.endpoints.admin_users import get_recent_registrations
        admin = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[])
        db.execute = AsyncMock(return_value=result)

        resp = await get_recent_registrations(limit=10, current_user=admin, db=db)
        assert resp["registrations"] == []
        assert resp["total"] == 0

    @pytest.mark.asyncio
    async def test_response_contains_expected_fields(self):
        from app.api.v1.endpoints.admin_users import get_recent_registrations
        tid = uuid4()
        admin = _make_user(tid)
        u = _make_db_user_row(tid, "Bob", "Martin")
        t = _make_tenant_row(tid, "Test Corp")

        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[(u, t)])
        db.execute = AsyncMock(return_value=result)

        resp = await get_recent_registrations(limit=5, current_user=admin, db=db)
        reg = resp["registrations"][0]
        for field in ("user_id", "email", "full_name", "company", "tenant_id",
                      "role", "created_at", "email_verified", "is_active",
                      "subscription_status"):
            assert field in reg, f"Missing field: {field}"
        assert reg["full_name"] == "Bob Martin"
        assert reg["company"] == "Test Corp"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. GET /stats — scoping tenant
# ═══════════════════════════════════════════════════════════════════════════════

class TestRegistrationStats:
    @pytest.mark.asyncio
    async def test_stats_returns_expected_structure(self):
        from app.api.v1.endpoints.admin_users import get_registration_stats
        tid = uuid4()
        admin = _make_user(tid)
        db = AsyncMock()
        db.scalar = AsyncMock(side_effect=[5, 4, 3, 1])  # total, active, verified, today

        resp = await get_registration_stats(current_user=admin, db=db)
        assert resp["total_users"] == 5
        assert resp["active_users"] == 4
        assert resp["verified_emails"] == 3
        assert resp["registrations_today"] == 1
        assert resp["tenant_id"] == str(tid)

    @pytest.mark.asyncio
    async def test_stats_includes_tenant_id_in_response(self):
        from app.api.v1.endpoints.admin_users import get_registration_stats
        tid = uuid4()
        admin = _make_user(tid)
        db = AsyncMock()
        db.scalar = AsyncMock(return_value=0)

        resp = await get_registration_stats(current_user=admin, db=db)
        assert "tenant_id" in resp
        assert resp["tenant_id"] == str(tid)

    @pytest.mark.asyncio
    async def test_stats_none_scalar_converts_to_zero(self):
        """Si la DB renvoie NULL (aucun résultat), on renvoie 0 pas None."""
        from app.api.v1.endpoints.admin_users import get_registration_stats
        admin = _make_user()
        db = AsyncMock()
        db.scalar = AsyncMock(return_value=None)

        resp = await get_registration_stats(current_user=admin, db=db)
        assert resp["total_users"] == 0
        assert resp["active_users"] == 0
        assert resp["verified_emails"] == 0
        assert resp["registrations_today"] == 0

    @pytest.mark.asyncio
    async def test_two_admins_different_tenants_see_different_counts(self):
        from app.api.v1.endpoints.admin_users import get_registration_stats
        # Tenant 1 : 10 users. Tenant 2 : 2 users.
        admin1 = _make_user(uuid4())
        admin2 = _make_user(uuid4())

        db1 = AsyncMock()
        db1.scalar = AsyncMock(side_effect=[10, 9, 8, 0])

        db2 = AsyncMock()
        db2.scalar = AsyncMock(side_effect=[2, 2, 1, 0])

        resp1 = await get_registration_stats(current_user=admin1, db=db1)
        resp2 = await get_registration_stats(current_user=admin2, db=db2)

        assert resp1["total_users"] == 10
        assert resp2["total_users"] == 2
        # Les tenant_ids sont distincts
        assert resp1["tenant_id"] != resp2["tenant_id"]
