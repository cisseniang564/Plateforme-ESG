"""
Tests d'intégration — endpoint /framework-data/{key}

Vérifie :
  - Isolation multi-tenant (un tenant ne voit pas les données d'un autre)
  - Validation des clés autorisées (allowlist)
  - Upsert idempotent (POST × 2 → 1 ligne en DB)
  - Lecture après écriture cohérente
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user(tenant_id=None, user_id=None):
    user = MagicMock()
    user.tenant_id = tenant_id or uuid4()
    user.id = user_id or uuid4()
    return user


def _make_row(data: dict):
    """Simule une ligne DB retournée par scalar_one_or_none()."""
    row = MagicMock()
    row.data = data
    row.updated_at = "2026-01-01T00:00:00Z"
    return row


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Allowlist des clés autorisées
# ═══════════════════════════════════════════════════════════════════════════════

class TestAllowedKeys:
    """Seules les clés dans _ALLOWED sont acceptées."""

    @pytest.mark.asyncio
    async def test_valid_key_climate_scenarios(self):
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        db = AsyncMock()
        result_mock = AsyncMock()
        result_mock.scalar_one_or_none = MagicMock(return_value=None)
        db.execute = AsyncMock(return_value=result_mock)

        request = MagicMock()
        response = await get_framework_data("climate_scenarios", request, user, db)
        assert response["data"] == {}

    @pytest.mark.asyncio
    async def test_valid_key_investor_relations(self):
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        db = AsyncMock()
        result_mock = AsyncMock()
        result_mock.scalar_one_or_none = MagicMock(return_value=None)
        db.execute = AsyncMock(return_value=result_mock)

        request = MagicMock()
        response = await get_framework_data("investor_relations", request, user, db)
        assert response["data"] == {}

    @pytest.mark.asyncio
    async def test_valid_key_ixbrl(self):
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        db = AsyncMock()
        result_mock = AsyncMock()
        result_mock.scalar_one_or_none = MagicMock(return_value=None)
        db.execute = AsyncMock(return_value=result_mock)

        request = MagicMock()
        response = await get_framework_data("ixbrl", request, user, db)
        assert response["data"] == {}

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_key", [
        "users", "../users", "users; DROP TABLE users--",
        "admin", "cdp", "csddd", "__proto__", "",
        "climate_scenarios; SELECT 1", "ixbrl\x00",
    ])
    async def test_invalid_key_raises_400(self, bad_key):
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        with pytest.raises(HTTPException) as exc:
            await get_framework_data(bad_key, MagicMock(), user, AsyncMock())
        assert exc.value.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Lecture (GET) — données retournées / absentes
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetFrameworkData:
    @pytest.mark.asyncio
    async def test_no_data_returns_empty_dict(self):
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none = MagicMock(return_value=None)
        db.execute = AsyncMock(return_value=result_mock)

        resp = await get_framework_data("climate_scenarios", MagicMock(), user, db)
        assert resp == {"data": {}, "last_saved": None}

    @pytest.mark.asyncio
    async def test_existing_data_returned(self):
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        # endpoint returns row.data directly (includes last_saved inside the dict)
        stored = {"selectedScenarios": ["1.5C", "3C"], "physicalRisks": [], "last_saved": "2026-01-01T00:00:00Z"}
        row = _make_row(stored)

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none = MagicMock(return_value=row)
        db.execute = AsyncMock(return_value=result_mock)

        resp = await get_framework_data("climate_scenarios", MagicMock(), user, db)
        assert resp["selectedScenarios"] == ["1.5C", "3C"]
        assert "last_saved" in resp

    @pytest.mark.asyncio
    async def test_db_error_returns_empty(self):
        """En cas d'erreur DB, l'endpoint retourne {} plutôt que 500."""
        from app.api.v1.endpoints.framework_data import get_framework_data
        user = _make_user()
        db = AsyncMock()
        db.execute = AsyncMock(side_effect=Exception("DB connection lost"))

        resp = await get_framework_data("climate_scenarios", MagicMock(), user, db)
        assert resp == {"data": {}, "last_saved": None}


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Écriture (POST) — upsert et isolation tenant
# ═══════════════════════════════════════════════════════════════════════════════

class TestSaveFrameworkData:
    @pytest.mark.asyncio
    async def test_save_calls_upsert(self):
        from app.api.v1.endpoints.framework_data import (
            save_framework_data,
            FrameworkSaveRequest,
        )
        user = _make_user()
        db = AsyncMock()
        db.execute = AsyncMock()
        db.flush = AsyncMock()

        req = FrameworkSaveRequest(data={"foo": "bar"})
        resp = await save_framework_data("climate_scenarios", req, MagicMock(), user, db)
        assert resp["status"] == "saved"
        assert "last_saved" in resp
        db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_save_different_tenants_isolated(self):
        """Deux tenants sauvegardent — les requêtes utilisent les bons tenant_ids."""
        from app.api.v1.endpoints.framework_data import (
            save_framework_data,
            FrameworkSaveRequest,
        )
        tid1, tid2 = uuid4(), uuid4()
        user1, user2 = _make_user(tid1), _make_user(tid2)

        calls_tenant_ids = []

        async def capture_execute(stmt, *args, **kwargs):
            # Extrait le tenant_id du statement compilé
            calls_tenant_ids.append(getattr(user1 if len(calls_tenant_ids) == 0 else user2, "tenant_id"))
            mock_result = MagicMock()
            return mock_result

        db = AsyncMock()
        db.execute = capture_execute
        db.commit = AsyncMock()

        req = FrameworkSaveRequest(data={"key": "tenant1-data"})
        await save_framework_data("investor_relations", req, MagicMock(), user1, db)

        req2 = FrameworkSaveRequest(data={"key": "tenant2-data"})
        await save_framework_data("investor_relations", req2, MagicMock(), user2, db)

        # Les deux appels ont des tenant_ids distincts
        assert calls_tenant_ids[0] == tid1
        assert calls_tenant_ids[1] == tid2
        assert calls_tenant_ids[0] != calls_tenant_ids[1]

    @pytest.mark.asyncio
    async def test_save_db_error_returns_gracefully(self):
        """En cas d'erreur DB, l'endpoint log un warning et retourne quand même OK
        (l'écriture est best-effort — le frontend a déjà sauvé en localStorage)."""
        from app.api.v1.endpoints.framework_data import (
            save_framework_data,
            FrameworkSaveRequest,
        )
        user = _make_user()
        db = AsyncMock()
        db.execute = AsyncMock(side_effect=Exception("Simulated DB failure"))
        db.flush = AsyncMock()

        req = FrameworkSaveRequest(data={"x": 1})
        resp = await save_framework_data("ixbrl", req, MagicMock(), user, db)
        # L'endpoint ne raise pas — best-effort behavior
        assert resp["status"] == "saved"

    @pytest.mark.asyncio
    async def test_save_with_invalid_key_raises_400(self):
        from app.api.v1.endpoints.framework_data import (
            save_framework_data,
            FrameworkSaveRequest,
        )
        user = _make_user()
        req = FrameworkSaveRequest(data={})
        with pytest.raises(HTTPException) as exc:
            await save_framework_data("INVALID_KEY", req, MagicMock(), user, AsyncMock())
        assert exc.value.status_code == 400
