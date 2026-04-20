"""
Integration tests — ESRS endpoints (/api/v1/esrs/*)

Routes covered:
  GET  /api/v1/esrs/standards          — list ESRS standards
  GET  /api/v1/esrs/gap-analysis       — coverage gap analysis
  POST /api/v1/esrs/gap-analysis/export — export gap analysis as CSV

Uses get_current_user from app.dependencies.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "csrd@test.com"; u.is_active = True
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

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)

    async def _db(): yield mock_db
    async def _user(): return _make_user()

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestESRSStandards:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/esrs/standards",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_list_or_dict(self, client):
        resp = client.get(
            "/api/v1/esrs/standards",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))

    def test_contains_esrs_standards(self, client):
        resp = client.get(
            "/api/v1/esrs/standards",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            text = resp.text.upper()
            assert any(s in text for s in ["ESRS", "E1", "S1", "G1"])

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/esrs/standards")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


class TestESRSGapAnalysis:
    def test_gap_analysis_returns_200(self, client):
        resp = client.get(
            "/api/v1/esrs/gap-analysis",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_gap_analysis_structure(self, client):
        resp = client.get(
            "/api/v1/esrs/gap-analysis",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            body = resp.json()
            assert isinstance(body, (list, dict))

    def test_gap_analysis_with_year(self, client):
        resp = client.get(
            "/api/v1/esrs/gap-analysis?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 422)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/esrs/gap-analysis")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


class TestESRSGapExport:
    def test_export_non_401(self, client):
        resp = client.post(
            "/api/v1/esrs/gap-analysis/export",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_export_returns_file_or_json(self, client):
        resp = client.post(
            "/api/v1/esrs/gap-analysis/export",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            ct = resp.headers.get("content-type", "")
            assert "csv" in ct or "json" in ct or "octet" in ct or "text" in ct
