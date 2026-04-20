"""
Integration tests — Carbon & Benchmarks endpoints

Carbon (/api/v1/carbon/*):
  GET  /scope-summary     — Scope 1/2/3 emissions summary
  GET  /categories        — emission categories
  GET  /history           — carbon history
  GET  /plan              — reduction plan
  POST /save-scope3       — save Scope 3 data
  POST /plan              — create/update reduction plan

Benchmarks (/api/v1/benchmarks/*):
  GET  /sector/{sector}                    — sector benchmarks
  GET  /company/{company_id}/position      — company positioning vs sector

Carbon + ESRS use get_current_user (app.dependencies).
Benchmarks has no auth.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID  = uuid4()
USER_ID    = uuid4()
COMPANY_ID = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "user@test.com"; u.is_active = True
    u.role = MagicMock(); u.role.name = "esg_manager"
    return u


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    scalars_mock = MagicMock()
    scalars_mock.all = MagicMock(return_value=[])

    execute_result = MagicMock()
    execute_result.scalars = MagicMock(return_value=scalars_mock)
    execute_result.scalar  = MagicMock(return_value=0)
    execute_result.scalar_one_or_none = MagicMock(return_value=None)
    execute_result.fetchall = MagicMock(return_value=[])

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.add = MagicMock(); mock_db.commit = AsyncMock()

    async def _db(): yield mock_db
    async def _user(): return _make_user()

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Carbon: Scope Summary ────────────────────────────────────────────────────

class TestCarbonScopeSummary:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/carbon/scope-summary",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_dict(self, client):
        resp = client.get(
            "/api/v1/carbon/scope-summary",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), dict)

    def test_has_scope_keys(self, client):
        resp = client.get(
            "/api/v1/carbon/scope-summary",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            text = resp.text.lower()
            assert any(s in text for s in ["scope", "total", "emissions"])

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/carbon/scope-summary")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── Carbon: Categories ───────────────────────────────────────────────────────

class TestCarbonCategories:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/carbon/categories",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_list(self, client):
        resp = client.get(
            "/api/v1/carbon/categories",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)


# ─── Carbon: History ──────────────────────────────────────────────────────────

class TestCarbonHistory:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/carbon/history",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_year_filter(self, client):
        resp = client.get(
            "/api/v1/carbon/history?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 422)


# ─── Carbon: Reduction Plan ───────────────────────────────────────────────────

class TestCarbonPlan:
    def test_get_plan_non_401(self, client):
        resp = client.get(
            "/api/v1/carbon/plan",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_create_plan_non_401(self, client):
        resp = client.post(
            "/api/v1/carbon/plan",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401


# ─── Carbon: Save Scope 3 ─────────────────────────────────────────────────────

class TestCarbonScope3:
    def test_save_scope3_non_401(self, client):
        resp = client.post(
            "/api/v1/carbon/save-scope3",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401


# ─── Benchmarks: Sector ───────────────────────────────────────────────────────

class TestBenchmarksSector:
    def test_known_sector_returns_non_500(self, client):
        resp = client.get(
            "/api/v1/benchmarks/sector/energie",
            headers={"Authorization": "Bearer test"},
        )
        # No auth required for benchmarks; expect 200 or 404 (no data), not 500
        assert resp.status_code in (200, 404)

    def test_invalid_sector_404(self, client):
        resp = client.get(
            "/api/v1/benchmarks/sector/completely_unknown_sector_xyz",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (404, 400)

    def test_with_year_filter(self, client):
        resp = client.get(
            "/api/v1/benchmarks/sector/transport?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 404)


# ─── Benchmarks: Company Position ────────────────────────────────────────────

class TestBenchmarksCompanyPosition:
    def test_company_position_non_500(self, client):
        resp = client.get(
            f"/api/v1/benchmarks/company/{COMPANY_ID}/position",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 404, 422)

    def test_invalid_company_uuid_422(self, client):
        resp = client.get(
            "/api/v1/benchmarks/company/not-a-uuid/position",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422
