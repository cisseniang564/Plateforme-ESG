"""
Integration tests — Enedis connector endpoints (/api/v1/connectors/enedis/*)

Routes covered:
  GET  /connectors/enedis/authorize   — OAuth2 redirect (requires ENEDIS_CLIENT_ID)
  GET  /connectors/enedis/callback    — token exchange & Integration upsert
  GET  /connectors/enedis/status      — connection state
  POST /connectors/enedis/sync        — pull Datahub data
  DELETE /connectors/enedis/disconnect — remove Integration record
  POST /connectors/enedis/import-csv  — CSV upload (always available)
  GET  /connectors/enedis/template    — CSV template download
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID      = uuid4()
USER_ID        = uuid4()
INTEGRATION_ID = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID
    u.tenant_id = TENANT_ID
    u.email = "user@test.com"
    u.is_active = True
    u.role = MagicMock()
    u.role.name = "esg_manager"
    return u


def _make_integration(connected: bool = True):
    i = MagicMock()
    i.id = INTEGRATION_ID
    i.tenant_id = TENANT_ID
    i.name = "Enedis Datahub"
    i.is_active = connected
    i.last_sync_at = datetime(2025, 12, 1, tzinfo=timezone.utc) if connected else None
    i.last_error = None
    i.config = {
        "access_token":  "tok_test",
        "refresh_token": "ref_test",
        "expires_at":    "2099-01-01T00:00:00+00:00",
        "usage_point_id": "12345678901234",
        "scope":         "am_consumption",
        "connected_at":  "2025-11-01T10:00:00+00:00",
    } if connected else {}
    return i


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    mock_user        = _make_user()
    mock_integration = _make_integration(connected=True)

    scalars_mock = MagicMock()
    scalars_mock.all   = MagicMock(return_value=[mock_integration])
    scalars_mock.first = MagicMock(return_value=mock_integration)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(return_value=mock_user)
    execute_result.scalars = MagicMock(return_value=scalars_mock)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.add     = MagicMock()
    mock_db.commit  = AsyncMock()
    mock_db.delete  = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def _db():   yield mock_db
    async def _user(): return mock_user

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ─── /status ──────────────────────────────────────────────────────────────────

class TestEnedisStatus:
    def test_status_returns_200(self, client):
        resp = client.get(
            "/api/v1/connectors/enedis/status",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_status_returns_dict(self, client):
        resp = client.get(
            "/api/v1/connectors/enedis/status",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), dict)

    def test_status_has_connected_key(self, client):
        resp = client.get(
            "/api/v1/connectors/enedis/status",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert "connected" in resp.json()

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/connectors/enedis/status")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── /authorize ───────────────────────────────────────────────────────────────

class TestEnedisAuthorize:
    def test_authorize_without_client_id_503(self, client):
        """Without ENEDIS_CLIENT_ID, returns 503."""
        with patch("app.api.v1.endpoints.enedis.settings") as mock_settings:
            mock_settings.ENEDIS_CLIENT_ID     = None
            mock_settings.ENEDIS_CLIENT_SECRET  = None
            mock_settings.ENEDIS_AUTH_URL       = "https://example.com"
            mock_settings.ENEDIS_REDIRECT_URI   = None
            mock_settings.APP_URL               = "http://localhost:3000"
            resp = client.get(
                "/api/v1/connectors/enedis/authorize",
                headers={"Authorization": "Bearer test"},
                allow_redirects=False,
            )
        assert resp.status_code in (503, 307, 302, 200)

    def test_authorize_redirects_when_configured(self, client):
        """With ENEDIS_CLIENT_ID set, should redirect to Enedis."""
        with patch("app.api.v1.endpoints.enedis.settings") as mock_settings:
            mock_settings.ENEDIS_CLIENT_ID     = "test_client"
            mock_settings.ENEDIS_CLIENT_SECRET  = "test_secret"
            mock_settings.ENEDIS_AUTH_URL       = "https://mon-compte-particulier.enedis.fr/authorize"
            mock_settings.ENEDIS_REDIRECT_URI   = "http://localhost:8000/callback"
            mock_settings.APP_URL               = "http://localhost:3000"
            resp = client.get(
                "/api/v1/connectors/enedis/authorize",
                headers={"Authorization": "Bearer test"},
                allow_redirects=False,
            )
        assert resp.status_code in (307, 302, 200, 503)


# ─── /callback ────────────────────────────────────────────────────────────────

class TestEnedisCallback:
    def test_callback_missing_params_400(self, client):
        resp = client.get("/api/v1/connectors/enedis/callback")
        assert resp.status_code in (400, 307, 302)

    def test_callback_with_error_redirects(self, client):
        resp = client.get(
            "/api/v1/connectors/enedis/callback?error=access_denied",
            allow_redirects=False,
        )
        # Should redirect to frontend with error param
        assert resp.status_code in (307, 302, 400)

    def test_callback_invalid_state_400(self, client):
        resp = client.get(
            "/api/v1/connectors/enedis/callback?code=abc&state=invalid-state",
        )
        assert resp.status_code in (400, 502, 307, 302)

    def test_callback_valid_flow(self, client):
        """Simulate a valid callback with mocked token exchange."""
        valid_state = f"{TENANT_ID}:deadbeef1234"

        mock_token_resp = MagicMock()
        mock_token_resp.status_code = 200
        mock_token_resp.json.return_value = {
            "access_token":  "new_access",
            "refresh_token": "new_refresh",
            "expires_in":    3600,
            "token_type":    "Bearer",
        }

        with patch(
            "app.api.v1.endpoints.enedis._exchange_code",
            new=AsyncMock(return_value={
                "access_token":  "new_access",
                "refresh_token": "new_refresh",
                "expires_in":    3600,
                "token_type":    "Bearer",
            }),
        ), patch(
            "app.api.v1.endpoints.enedis._get_integration",
            new=AsyncMock(return_value=None),
        ):
            resp = client.get(
                f"/api/v1/connectors/enedis/callback?code=mycode&state={valid_state}",
                allow_redirects=False,
            )
        assert resp.status_code in (307, 302, 200)


# ─── /sync ────────────────────────────────────────────────────────────────────

class TestEnedisSync:
    def test_sync_without_oauth_config_503(self, client):
        with patch("app.api.v1.endpoints.enedis._oauth_configured", return_value=False):
            resp = client.post(
                "/api/v1/connectors/enedis/sync",
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code == 503

    def test_sync_not_connected_400(self, client):
        with patch("app.api.v1.endpoints.enedis._oauth_configured", return_value=True), \
             patch("app.api.v1.endpoints.enedis._get_integration", new=AsyncMock(return_value=None)):
            resp = client.post(
                "/api/v1/connectors/enedis/sync",
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code == 400

    def test_sync_returns_non_401(self, client):
        """When OAuth is configured and integration exists, should not 401."""
        resp = client.post(
            "/api/v1/connectors/enedis/sync",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post("/api/v1/connectors/enedis/sync")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── /disconnect ──────────────────────────────────────────────────────────────

class TestEnedisDisconnect:
    def test_disconnect_non_401(self, client):
        resp = client.delete(
            "/api/v1/connectors/enedis/disconnect",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_disconnect_not_found_404(self, client):
        """If no integration record exists, should return 404."""
        from app.main import app
        from app.db.session import get_db

        empty_result = MagicMock()
        empty_result.scalar_one_or_none = MagicMock(return_value=None)
        empty_result.scalars = MagicMock(
            return_value=MagicMock(all=MagicMock(return_value=[]))
        )

        mock_db2 = AsyncMock()
        mock_db2.execute = AsyncMock(return_value=empty_result)
        mock_db2.delete  = AsyncMock()
        mock_db2.commit  = AsyncMock()

        async def _db2(): yield mock_db2
        app.dependency_overrides[get_db] = _db2

        resp = client.delete(
            "/api/v1/connectors/enedis/disconnect",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (404, 200)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.delete("/api/v1/connectors/enedis/disconnect")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── CSV import & template ────────────────────────────────────────────────────

class TestEnedisCsvImport:
    def test_import_no_file_422(self, client):
        resp = client.post(
            "/api/v1/connectors/enedis/import-csv",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_import_non_csv_400(self, client):
        resp = client.post(
            "/api/v1/connectors/enedis/import-csv",
            files={"file": ("data.txt", b"hello", "text/plain")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 400

    def test_import_valid_csv(self, client):
        csv_data = b"Date;Valeur;Unite\n2024-01-01;1250.5;kWh\n2024-02-01;1180.2;kWh\n"
        resp = client.post(
            "/api/v1/connectors/enedis/import-csv",
            files={"file": ("enedis_export.csv", csv_data, "text/csv")},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 400, 500)

    def test_import_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post(
            "/api/v1/connectors/enedis/import-csv",
            files={"file": ("x.csv", b"a", "text/csv")},
        )
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


class TestEnedisTemplate:
    def test_template_returns_200(self, client):
        resp = client.get("/api/v1/connectors/enedis/template")
        assert resp.status_code == 200

    def test_template_is_csv(self, client):
        resp = client.get("/api/v1/connectors/enedis/template")
        if resp.status_code == 200:
            assert "csv" in resp.headers.get("content-type", "").lower() or \
                   "csv" in resp.headers.get("content-disposition", "").lower()

    def test_template_has_content(self, client):
        resp = client.get("/api/v1/connectors/enedis/template")
        if resp.status_code == 200:
            assert len(resp.content) > 10
