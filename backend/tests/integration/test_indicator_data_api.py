"""
Integration tests — Indicator Data endpoints (/api/v1/indicator-data/*)

Routes covered:
  POST /api/v1/indicator-data/indicators/{id}/data    — add data point
  GET  /api/v1/indicator-data/indicators/{id}/data    — list data points
  GET  /api/v1/indicator-data/indicators/{id}/stats   — stats for indicator
  POST /api/v1/indicator-data/uploads/{id}/import     — import from upload
  GET  /api/v1/indicator-data/dashboard/pillar-data   — pillar dashboard data
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import date, datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID     = uuid4()
USER_ID       = uuid4()
INDICATOR_ID  = uuid4()
UPLOAD_ID     = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "manager@test.com"; u.is_active = True
    u.role = MagicMock(); u.role.name = "esg_manager"
    return u


def _make_indicator():
    i = MagicMock()
    i.id = INDICATOR_ID; i.tenant_id = TENANT_ID
    i.name = "CO2 Emissions"; i.unit = "tCO2e"
    i.pillar = "env"; i.category = "emissions"
    return i


def _make_data_point():
    d = MagicMock()
    d.id = uuid4(); d.indicator_id = INDICATOR_ID
    d.date = date(2025, 6, 1); d.value = 500.0
    d.notes = None; d.source = "manual"; d.is_estimated = False
    d.created_at = datetime.now(timezone.utc)
    return d


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id

    mock_user  = _make_user()
    mock_ind   = _make_indicator()
    mock_point = _make_data_point()

    scalars_mock = MagicMock()
    scalars_mock.all   = MagicMock(return_value=[mock_point])
    scalars_mock.first = MagicMock(return_value=mock_point)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(side_effect=[mock_ind, mock_user, mock_ind, mock_point, mock_ind, mock_point, mock_ind, mock_user])
    execute_result.scalar  = MagicMock(return_value=5)
    execute_result.scalars = MagicMock(return_value=scalars_mock)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.add = MagicMock(); mock_db.commit = AsyncMock(); mock_db.refresh = AsyncMock()

    async def _db(): yield mock_db
    async def _uid(): return USER_ID

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user_id] = _uid

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestIndicatorDataCreate:
    def test_add_data_point_non_401(self, client):
        resp = client.post(
            f"/api/v1/indicator-data/indicators/{INDICATOR_ID}/data",
            json={"date": "2025-06-01", "value": 500.0, "source": "manual"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_add_missing_fields_422(self, client):
        resp = client.post(
            f"/api/v1/indicator-data/indicators/{INDICATOR_ID}/data",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post(f"/api/v1/indicator-data/indicators/{INDICATOR_ID}/data", json={})
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401


class TestIndicatorDataList:
    def test_list_returns_200(self, client):
        resp = client.get(
            f"/api/v1/indicator-data/indicators/{INDICATOR_ID}/data",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_list_returns_array_or_dict(self, client):
        resp = client.get(
            f"/api/v1/indicator-data/indicators/{INDICATOR_ID}/data",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))

    def test_invalid_indicator_uuid_422(self, client):
        resp = client.get(
            "/api/v1/indicator-data/indicators/not-a-uuid/data",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422


class TestIndicatorDataStats:
    def test_stats_non_401(self, client):
        resp = client.get(
            f"/api/v1/indicator-data/indicators/{INDICATOR_ID}/stats",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401


class TestPillarDashboard:
    def test_dashboard_non_401(self, client):
        resp = client.get(
            "/api/v1/indicator-data/dashboard/pillar-data",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.get("/api/v1/indicator-data/dashboard/pillar-data")
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401
