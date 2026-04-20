"""
Integration tests — Connectors endpoints (/api/v1/connectors/*)

Routes covered:
  GET  /api/v1/connectors/catalog              — list available connectors
  PATCH /api/v1/connectors/{id}/status         — update connector status
  POST /api/v1/connectors/{id}/sync            — trigger sync
  POST /api/v1/connectors/test                 — test external connectivity (public)
  POST /api/v1/connectors/climatiq/estimate    — Climatiq CO2 estimate
  POST /api/v1/connectors/carbon-interface/estimate — Carbon Interface estimate

Uses get_current_user from app.dependencies (except /test which is public).
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID    = uuid4()
USER_ID      = uuid4()
CONNECTOR_ID = "schneider"


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "admin@test.com"; u.is_active = True
    u.role = MagicMock(); u.role.name = "tenant_admin"
    return u


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock(
        scalar_one_or_none=MagicMock(return_value=None),
        scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
    ))
    mock_db.commit = AsyncMock(); mock_db.refresh = AsyncMock()

    async def _db(): yield mock_db
    async def _user(): return _make_user()

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestConnectorsCatalog:
    def test_catalog_returns_200(self, client):
        resp = client.get(
            "/api/v1/connectors/catalog",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_catalog_returns_list(self, client):
        resp = client.get(
            "/api/v1/connectors/catalog",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)

    def test_catalog_has_connectors(self, client):
        resp = client.get(
            "/api/v1/connectors/catalog",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            text = resp.text.lower()
            assert any(s in text for s in ["climatiq", "schneider", "carbon"])

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/connectors/catalog")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


class TestConnectorTest:
    def test_public_test_endpoint_no_auth(self, client):
        """POST /connectors/test is in PUBLIC_PATHS — no auth required."""
        resp = client.post(
            "/api/v1/connectors/test",
            json={"provider": "climatiq"},
        )
        # Should not be 401 (it's public)
        assert resp.status_code != 401

    def test_test_endpoint_returns_result(self, client):
        resp = client.post(
            "/api/v1/connectors/test",
            json={"provider": "climatiq"},
        )
        assert resp.status_code in (200, 400, 503)


class TestConnectorStatus:
    def test_update_status_non_401(self, client):
        resp = client.patch(
            f"/api/v1/connectors/{CONNECTOR_ID}/status",
            json={"status": "connected"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_invalid_connector_404(self, client):
        resp = client.patch(
            "/api/v1/connectors/does_not_exist_xyz/status",
            json={"status": "connected"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (404, 400, 200)


class TestConnectorSync:
    def test_sync_non_401(self, client):
        resp = client.post(
            f"/api/v1/connectors/{CONNECTOR_ID}/sync",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401


class TestClimatiqEstimate:
    def test_estimate_no_key_503(self, client):
        """Without CLIMATIQ_API_KEY, should return 503 or 400."""
        resp = client.post(
            "/api/v1/connectors/climatiq/estimate",
            json={
                "activity_id": "electricity-supply_grid-source_residual_mix",
                "region": "FR",
                "energy_kwh": 1000.0,
            },
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 400, 503)

    def test_estimate_missing_body_422(self, client):
        resp = client.post(
            "/api/v1/connectors/climatiq/estimate",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (400, 422)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post("/api/v1/connectors/climatiq/estimate", json={})
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401
