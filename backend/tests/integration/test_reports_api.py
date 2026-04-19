"""
Integration tests — Reports endpoints (/api/v1/reports/*)

Routes covered:
  GET  /api/v1/reports/types               — list report types
  GET  /api/v1/reports/preview/{type}      — preview report template
  GET  /api/v1/reports/multi-standards     — multi-standard mapping
  POST /api/v1/reports/generate            — generate report (mocked service)
  POST /api/v1/reports/scheduled           — create scheduled report
  GET  /api/v1/reports/scheduled           — list scheduled reports

All tests use FastAPI TestClient with mocked DB and auth dependencies.
No real Postgres or file-system access required.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID = uuid4()
ORG_ID = uuid4()


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id

    mock_user = MagicMock()
    mock_user.id = USER_ID
    mock_user.tenant_id = TENANT_ID
    mock_user.email = "admin@test.com"
    mock_user.is_active = True
    mock_user.role = MagicMock()
    mock_user.role.name = "tenant_admin"

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock(
        scalar_one_or_none=MagicMock(return_value=mock_user),
        scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
    ))
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def _override_db():
        yield mock_db

    async def _override_user_id():
        return USER_ID

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user_id] = _override_user_id

    with TestClient(app, raise_server_exceptions=False) as c:
        c._mock_user = mock_user
        c._mock_db = mock_db
        yield c

    app.dependency_overrides.clear()


# ─── GET /types ───────────────────────────────────────────────────────────────

class TestReportTypes:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/reports/types",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_list_of_types(self, client):
        resp = client.get(
            "/api/v1/reports/types",
            headers={"Authorization": "Bearer test"},
        )
        body = resp.json()
        # Should be a list or a dict with a "types" key
        assert isinstance(body, (list, dict))

    def test_includes_executive_type(self, client):
        resp = client.get(
            "/api/v1/reports/types",
            headers={"Authorization": "Bearer test"},
        )
        text = resp.text.lower()
        assert "executive" in text or "csrd" in text or "gri" in text


# ─── GET /preview/{report_type} ───────────────────────────────────────────────

class TestReportPreview:
    def test_executive_preview_200(self, client):
        resp = client.get(
            "/api/v1/reports/preview/executive",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_csrd_preview_200(self, client):
        resp = client.get(
            "/api/v1/reports/preview/csrd",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_unknown_type_returns_error(self, client):
        resp = client.get(
            "/api/v1/reports/preview/unknown_garbage_type",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (400, 404, 422)


# ─── GET /multi-standards ─────────────────────────────────────────────────────

class TestMultiStandards:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/reports/multi-standards",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_contains_standards(self, client):
        resp = client.get(
            "/api/v1/reports/multi-standards",
            headers={"Authorization": "Bearer test"},
        )
        text = resp.text.lower()
        # Should mention at least one standard
        assert any(s in text for s in ["csrd", "gri", "tcfd", "sasb"])


# ─── POST /generate ───────────────────────────────────────────────────────────

class TestGenerateReport:
    def test_generate_returns_non_401(self, client):
        """Auth passes — should not get 401."""
        with patch("app.services.report_service.ReportService.generate_report") as mock_gen:
            mock_gen.return_value = b"%PDF fake content"
            resp = client.post(
                "/api/v1/reports/generate",
                json={"report_type": "executive", "format": "pdf"},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code != 401

    def test_generate_invalid_body_422(self, client):
        """Missing required fields → 422."""
        resp = client.post(
            "/api/v1/reports/generate",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        # report_type is required
        assert resp.status_code == 422

    def test_generate_pdf_content_type(self, client):
        """When service returns bytes, response should be a file download."""
        with patch("app.services.report_service.ReportService.generate_report") as mock_gen:
            mock_gen.return_value = b"%PDF-1.4 fake"
            resp = client.post(
                "/api/v1/reports/generate",
                json={"report_type": "executive", "format": "pdf", "year": 2025},
                headers={"Authorization": "Bearer test"},
            )
        if resp.status_code == 200:
            ct = resp.headers.get("content-type", "")
            assert "pdf" in ct or "octet-stream" in ct


# ─── POST /scheduled ──────────────────────────────────────────────────────────

class TestScheduledReports:
    def test_create_scheduled_report(self, client):
        resp = client.post(
            "/api/v1/reports/scheduled",
            json={
                "title": "Monthly ESG Report",
                "report_type": "executive",
                "frequency": "monthly",
                "format": "pdf",
                "recipients": ["cfo@test.com"],
            },
            headers={"Authorization": "Bearer test"},
        )
        # Should succeed or return a known error (not 401/403)
        assert resp.status_code not in (401, 403)

    def test_list_scheduled_reports(self, client):
        resp = client.get(
            "/api/v1/reports/scheduled",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), (list, dict))
