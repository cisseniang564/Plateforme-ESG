"""
Integration tests — ESG Import endpoints (/api/v1/esg-import/*)

Routes covered:
  POST /api/v1/esg-import/upload-preview        — preview CSV before import
  POST /api/v1/esg-import/uploads/{id}/import   — execute import with mapping

Uses get_current_user from app.dependencies.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()
UPLOAD_ID = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "importer@test.com"; u.is_active = True
    u.role = MagicMock(); u.role.name = "esg_manager"
    return u


def _make_upload():
    up = MagicMock()
    up.id = UPLOAD_ID; up.tenant_id = TENANT_ID
    up.filename = "esg_data.csv"; up.status = "pending"
    up.file_size = 512; up.data_preview = []
    return up


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    mock_user   = _make_user()
    mock_upload = _make_upload()

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(return_value=mock_upload)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.add = MagicMock(); mock_db.commit = AsyncMock(); mock_db.refresh = AsyncMock()

    async def _db(): yield mock_db
    async def _user(): return mock_user

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestESGImportPreview:
    def test_preview_csv_non_401(self, client):
        csv = b"pillar,category,metric_name,value,unit,period_start,period_end\nenv,emissions,co2,1000,tCO2e,2025-01-01,2025-12-31\n"
        resp = client.post(
            "/api/v1/esg-import/upload-preview",
            files={"file": ("data.csv", io.BytesIO(csv), "text/csv")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_preview_no_file_422(self, client):
        resp = client.post(
            "/api/v1/esg-import/upload-preview",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_preview_invalid_type_400(self, client):
        resp = client.post(
            "/api/v1/esg-import/upload-preview",
            files={"file": ("bad.txt", io.BytesIO(b"hello"), "text/plain")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (400, 422)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post("/api/v1/esg-import/upload-preview", data={})
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


class TestESGImportExecute:
    def test_import_non_401(self, client):
        mapping = {
            "pillar": "pillar", "category": "category",
            "metric_name": "metric_name", "value_numeric": "value",
            "unit": "unit",
        }
        resp = client.post(
            f"/api/v1/esg-import/uploads/{UPLOAD_ID}/import",
            json=mapping,
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_import_invalid_upload_uuid_422(self, client):
        resp = client.post(
            "/api/v1/esg-import/uploads/not-a-uuid/import",
            json={"metric_name": "co2", "value_numeric": "value"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_import_missing_mapping_422(self, client):
        resp = client.post(
            f"/api/v1/esg-import/uploads/{UPLOAD_ID}/import",
            json={},   # metric_name and value_numeric are required
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post(f"/api/v1/esg-import/uploads/{UPLOAD_ID}/import", json={})
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401
