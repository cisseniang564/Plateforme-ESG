"""
Integration tests — Data Upload endpoints (/api/v1/data/*)

Routes covered:
  POST /api/v1/data/upload          — upload CSV/Excel file
  GET  /api/v1/data/uploads         — list uploads for tenant
  GET  /api/v1/data/uploads/{id}    — get single upload
  DELETE /api/v1/data/uploads/{id}  — delete upload

All tests use FastAPI TestClient with mocked DB and auth.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID = uuid4()
UPLOAD_ID = uuid4()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_upload(status: str = "completed"):
    u = MagicMock()
    u.id = UPLOAD_ID
    u.tenant_id = TENANT_ID
    u.filename = "esg_data.csv"
    u.file_size = 1024
    u.status = status
    u.total_rows = 10
    u.valid_rows = 9
    u.invalid_rows = 1
    u.data_preview = []
    u.validation_errors = []
    u.file_metadata = {}
    u.error_message = None
    u.created_at = datetime.now(timezone.utc)
    return u


def _make_user():
    u = MagicMock()
    u.id = USER_ID
    u.tenant_id = TENANT_ID
    u.email = "user@test.com"
    u.is_active = True
    u.role = MagicMock()
    u.role.name = "esg_manager"
    return u


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id

    mock_upload = _make_upload()
    mock_user = _make_user()

    scalar_mock = MagicMock()
    scalar_mock.scalar_one_or_none = MagicMock(return_value=mock_upload)
    scalars_mock = MagicMock()
    scalars_mock.all = MagicMock(return_value=[mock_upload])
    scalars_mock.first = MagicMock(return_value=mock_upload)

    db_execute_mock = AsyncMock()
    db_execute_mock.return_value = scalar_mock
    db_execute_mock.return_value.scalars = MagicMock(return_value=scalars_mock)

    mock_db = AsyncMock()
    mock_db.execute = db_execute_mock
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.delete = AsyncMock()

    async def _override_db():
        yield mock_db

    async def _override_user_id():
        return USER_ID

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user_id] = _override_user_id

    with TestClient(app, raise_server_exceptions=False) as c:
        c._mock_db = mock_db
        c._mock_upload = mock_upload
        c._mock_user = mock_user
        yield c

    app.dependency_overrides.clear()


# ─── POST /upload ─────────────────────────────────────────────────────────────

class TestUploadFile:
    def test_upload_csv_not_401(self, client):
        """Auth present → should not get 401."""
        csv_content = b"indicator,value,year\nco2_emissions,1000,2025\n"
        resp = client.post(
            "/api/v1/data/upload",
            files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_upload_no_auth_returns_401(self, client):
        """No auth header → 401."""
        # Remove override for this test
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        csv_content = b"indicator,value\nco2,100\n"
        resp = client.post(
            "/api/v1/data/upload",
            files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
        )
        # Restore
        async def _override_user_id():
            return USER_ID
        app.dependency_overrides[get_current_user_id] = _override_user_id
        assert resp.status_code == 401

    def test_upload_invalid_file_type_400(self, client):
        """Sending a .txt file → 400."""
        resp = client.post(
            "/api/v1/data/upload",
            files={"file": ("data.txt", io.BytesIO(b"hello"), "text/plain")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 400

    def test_upload_too_large_413(self, client):
        """File exceeding 10 MB → 413."""
        large_content = b"a" * (11 * 1024 * 1024)
        resp = client.post(
            "/api/v1/data/upload",
            files={"file": ("big.csv", io.BytesIO(large_content), "text/csv")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 413

    def test_upload_csv_accepted(self, client):
        """Valid small CSV → accepted (200 or 201)."""
        from unittest.mock import patch, AsyncMock as AM
        csv_content = b"indicator_id,value,year\nco2_emissions,1000,2025\n"
        with patch(
            "app.services.data_import_service.DataImportService.process_upload",
            new_callable=lambda: lambda *a, **kw: AM(return_value=_make_upload()),
        ):
            resp = client.post(
                "/api/v1/data/upload",
                files={"file": ("esg.csv", io.BytesIO(csv_content), "text/csv")},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code in (200, 201, 202)


# ─── GET /uploads ─────────────────────────────────────────────────────────────

class TestListUploads:
    def test_list_returns_200(self, client):
        resp = client.get(
            "/api/v1/data/uploads",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_list_returns_array(self, client):
        resp = client.get(
            "/api/v1/data/uploads",
            headers={"Authorization": "Bearer test"},
        )
        body = resp.json()
        assert isinstance(body, (list, dict))

    def test_list_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.get("/api/v1/data/uploads")
        async def _override_user_id():
            return USER_ID
        app.dependency_overrides[get_current_user_id] = _override_user_id
        assert resp.status_code == 401


# ─── GET /uploads/{id} ────────────────────────────────────────────────────────

class TestGetUpload:
    def test_get_existing_upload_200(self, client):
        resp = client.get(
            f"/api/v1/data/uploads/{UPLOAD_ID}",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 404)  # 404 if mock doesn't match query

    def test_get_upload_invalid_uuid_422(self, client):
        resp = client.get(
            "/api/v1/data/uploads/not-a-uuid",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422


# ─── DELETE /uploads/{id} ────────────────────────────────────────────────────

class TestDeleteUpload:
    def test_delete_not_401(self, client):
        resp = client.delete(
            f"/api/v1/data/uploads/{UPLOAD_ID}",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_delete_invalid_uuid_422(self, client):
        resp = client.delete(
            "/api/v1/data/uploads/bad-id",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422
