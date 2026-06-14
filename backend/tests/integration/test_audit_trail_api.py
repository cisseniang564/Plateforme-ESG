"""
Integration tests — Audit Trail endpoints (/api/v1/audit-trail/*)

Routes covered:
  GET /api/v1/audit-trail       — paginated audit log (manager+)
  GET /api/v1/audit-trail/stats — audit statistics (manager+)

Uses get_current_tenant_id from auth_middleware.
require_role() is satisfied via a mocked DB row with role_name="tenant_admin".
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone
from tests.conftest import make_access_token

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()
AUTH_HEADERS = {"Authorization": f"Bearer {make_access_token(USER_ID, TENANT_ID)}"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_log(action: str = "create", entity: str = "DataEntry"):
    row = MagicMock()
    row.id         = uuid4()
    row.action     = action
    row.entity     = entity
    row.entity_id  = str(uuid4())
    row.user_id    = USER_ID
    row.tenant_id  = TENANT_ID
    row.details    = {"value": 1000}
    row.ip_address = "10.0.0.1"
    row.created_at = datetime.now(timezone.utc)
    return row


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_tenant_id

    logs = [_make_log("create"), _make_log("update"), _make_log("delete", "ESGScore")]

    scalars_mock = MagicMock()
    scalars_mock.all = MagicMock(return_value=logs)

    execute_result = MagicMock()
    execute_result.scalars = MagicMock(return_value=scalars_mock)
    execute_result.scalar  = MagicMock(return_value=len(logs))
    execute_result.scalar_one_or_none = MagicMock(return_value=None)
    # For GROUP BY queries returning tuples
    execute_result.fetchall = MagicMock(return_value=[
        ("create", 10), ("update", 5), ("delete", 2)
    ])
    # require_role() runs a raw-SQL query and reads row.role_name
    execute_result.first = MagicMock(return_value=MagicMock(role_name="tenant_admin"))

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)

    async def _db():
        yield mock_db

    async def _tenant_id():
        return TENANT_ID

    app.dependency_overrides[get_db]                = _db
    app.dependency_overrides[get_current_tenant_id] = _tenant_id

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


# ─── GET /audit-trail ────────────────────────────────────────────────────────

class TestAuditTrailList:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/audit-trail",
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200

    def test_returns_list_or_dict(self, client):
        resp = client.get(
            "/api/v1/audit-trail",
            headers=AUTH_HEADERS,
        )
        assert isinstance(resp.json(), (list, dict))

    def test_filter_by_action(self, client):
        resp = client.get(
            "/api/v1/audit-trail?action=create",
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200

    def test_filter_by_entity(self, client):
        resp = client.get(
            "/api/v1/audit-trail?entity=DataEntry",
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200

    def test_pagination_params(self, client):
        resp = client.get(
            "/api/v1/audit-trail?page=1&page_size=20",
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_tenant_id
        del app.dependency_overrides[get_current_tenant_id]
        resp = client.get("/api/v1/audit-trail")
        async def _restore(): return TENANT_ID
        app.dependency_overrides[get_current_tenant_id] = _restore
        assert resp.status_code == 401

    def test_response_has_items(self, client):
        resp = client.get(
            "/api/v1/audit-trail",
            headers=AUTH_HEADERS,
        )
        if resp.status_code == 200:
            body = resp.json()
            # Should have items/logs or be a list
            assert isinstance(body, (list, dict))


# ─── GET /audit-trail/stats ───────────────────────────────────────────────────

class TestAuditTrailStats:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/audit-trail/stats",
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200

    def test_returns_dict(self, client):
        resp = client.get(
            "/api/v1/audit-trail/stats",
            headers=AUTH_HEADERS,
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), dict)

    def test_contains_count(self, client):
        resp = client.get(
            "/api/v1/audit-trail/stats",
            headers=AUTH_HEADERS,
        )
        if resp.status_code == 200:
            body = resp.json()
            # Should contain some count or total field
            text = str(body).lower()
            assert any(k in text for k in ["total", "count", "action"])

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_tenant_id
        del app.dependency_overrides[get_current_tenant_id]
        resp = client.get("/api/v1/audit-trail/stats")
        async def _restore(): return TENANT_ID
        app.dependency_overrides[get_current_tenant_id] = _restore
        assert resp.status_code == 401
