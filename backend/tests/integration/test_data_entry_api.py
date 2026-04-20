"""
Integration tests — Data Entry endpoints (/api/v1/data-entry/*)

Routes covered:
  POST /api/v1/data-entry/              — create data entry
  GET  /api/v1/data-entry/              — list data entries
  GET  /api/v1/data-entry/templates/metrics — metric templates
  GET  /api/v1/data-entry/stats         — aggregated stats
  GET  /api/v1/data-entry/export        — CSV/JSON export
  PUT  /api/v1/data-entry/{entry_id}    — update entry
  DELETE /api/v1/data-entry/{entry_id}  — delete entry

Data entry uses get_current_user from app.dependencies.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import date, datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()
ORG_ID    = uuid4()
ENTRY_ID  = uuid4()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_user():
    u = MagicMock()
    u.id        = USER_ID
    u.tenant_id = TENANT_ID
    u.email     = "manager@test.com"
    u.is_active = True
    u.role      = MagicMock()
    u.role.name = "esg_manager"
    return u


def _make_entry():
    e = MagicMock()
    e.id               = ENTRY_ID
    e.tenant_id        = TENANT_ID
    e.organization_id  = ORG_ID
    e.period_start     = date(2025, 1, 1)
    e.period_end       = date(2025, 12, 31)
    e.period_type      = "annual"
    e.pillar           = "env"
    e.category         = "emissions"
    e.metric_name      = "co2_emissions"
    e.value_numeric    = 1000.0
    e.value_text       = None
    e.unit             = "tCO2e"
    e.data_source      = "manual"
    e.collection_method = "manual"
    e.notes            = None
    e.created_at       = datetime.now(timezone.utc)
    e.updated_at       = datetime.now(timezone.utc)
    e.validated_by     = None
    e.validated_at     = None
    return e


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    mock_user  = _make_user()
    mock_entry = _make_entry()

    scalars_mock = MagicMock()
    scalars_mock.all   = MagicMock(return_value=[mock_entry])
    scalars_mock.first = MagicMock(return_value=mock_entry)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(return_value=mock_entry)
    execute_result.scalar             = MagicMock(return_value=1)
    execute_result.scalars            = MagicMock(return_value=scalars_mock)
    execute_result.fetchall           = MagicMock(return_value=[(mock_entry,)])

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.add     = MagicMock()
    mock_db.commit  = AsyncMock()
    mock_db.refresh = AsyncMock(side_effect=lambda obj: None)
    mock_db.delete  = AsyncMock()

    async def _db():
        yield mock_db

    async def _user():
        return mock_user

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        c._entry = mock_entry
        c._user  = mock_user
        yield c

    app.dependency_overrides.clear()


# ─── POST / ───────────────────────────────────────────────────────────────────

class TestCreateDataEntry:
    def test_create_valid_entry_non_401(self, client):
        resp = client.post(
            "/api/v1/data-entry/",
            json={
                "period_start": "2025-01-01",
                "period_end":   "2025-12-31",
                "period_type":  "annual",
                "pillar":       "env",
                "category":     "emissions",
                "metric_name":  "co2_emissions",
                "value_numeric": 1000.0,
                "unit":         "tCO2e",
            },
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_create_missing_required_fields_422(self, client):
        resp = client.post(
            "/api/v1/data-entry/",
            json={"pillar": "env"},   # missing period_start, period_end, etc.
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post("/api/v1/data-entry/", json={})
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── GET / ────────────────────────────────────────────────────────────────────

class TestListDataEntries:
    def test_list_returns_200(self, client):
        resp = client.get(
            "/api/v1/data-entry/",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_list_returns_array(self, client):
        resp = client.get(
            "/api/v1/data-entry/",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), list)

    def test_filter_by_year(self, client):
        resp = client.get(
            "/api/v1/data-entry/?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_filter_by_pillar(self, client):
        resp = client.get(
            "/api/v1/data-entry/?pillar=env",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/data-entry/")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── GET /templates/metrics ───────────────────────────────────────────────────

class TestMetricTemplates:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/data-entry/templates/metrics",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_list_or_dict(self, client):
        resp = client.get(
            "/api/v1/data-entry/templates/metrics",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))

    def test_filter_by_pillar(self, client):
        for pillar in ("env", "soc", "gov"):
            resp = client.get(
                f"/api/v1/data-entry/templates/metrics?pillar={pillar}",
                headers={"Authorization": "Bearer test"},
            )
            assert resp.status_code == 200


# ─── GET /stats ───────────────────────────────────────────────────────────────

class TestDataEntryStats:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/data-entry/stats",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_dict(self, client):
        resp = client.get(
            "/api/v1/data-entry/stats",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), dict)


# ─── GET /export ──────────────────────────────────────────────────────────────

class TestDataEntryExport:
    def test_export_non_401(self, client):
        resp = client.get(
            "/api/v1/data-entry/export",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_export_csv_format(self, client):
        resp = client.get(
            "/api/v1/data-entry/export?format=csv",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401


# ─── PUT /{entry_id} ─────────────────────────────────────────────────────────

class TestUpdateDataEntry:
    def test_update_non_401(self, client):
        resp = client.put(
            f"/api/v1/data-entry/{ENTRY_ID}",
            json={"value_numeric": 1200.0, "notes": "Updated value"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_update_invalid_uuid_422(self, client):
        resp = client.put(
            "/api/v1/data-entry/not-a-uuid",
            json={"value_numeric": 100.0},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422


# ─── DELETE /{entry_id} ───────────────────────────────────────────────────────

class TestDeleteDataEntry:
    def test_delete_non_401(self, client):
        resp = client.delete(
            f"/api/v1/data-entry/{ENTRY_ID}",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_delete_invalid_uuid_422(self, client):
        resp = client.delete(
            "/api/v1/data-entry/bad-uuid",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422
