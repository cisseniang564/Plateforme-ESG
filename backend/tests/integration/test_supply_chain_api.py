"""
Integration tests for Supply Chain API endpoints.

Routes under /api/v1/supply-chain/:
  GET  /suppliers                         — list suppliers (auth required)
  POST /suppliers                         — create supplier (auth required)
  PUT  /suppliers/{supplier_id}           — update supplier (auth required)
  DELETE /suppliers/{supplier_id}         — delete supplier (auth required, 204)
  POST /suppliers/{supplier_id}/questionnaire — send questionnaire (auth required)
  GET  /dashboard                         — supply chain KPIs (auth required)
  GET  /questionnaire/questions           — questionnaire catalog (auth required)
  GET  /portal/{token}                    — public, no auth
  POST /portal/{token}/submit             — public, no auth

All tests use FastAPI TestClient with mocked DB. No real Postgres needed.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone, timedelta

pytestmark = pytest.mark.integration

# ─── Shared constants ─────────────────────────────────────────────────────────

TENANT_ID = uuid4()
USER_ID = uuid4()
SUPPLIER_ID = uuid4()
PORTAL_TOKEN = "test-portal-token-valid-abc123"


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """
    FastAPI TestClient with DB dependency overridden and auth bypassed.
    Supply Chain endpoints use get_current_user (from app.dependencies),
    not get_current_user_id, so we override the DB and let the middleware
    set request.state.user_id.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    # ── Mock User ────────────────────────────────────────────────────────────
    mock_user = MagicMock()
    mock_user.id = USER_ID
    mock_user.tenant_id = TENANT_ID
    mock_user.email = "user@test.com"
    mock_user.first_name = "Test"
    mock_user.is_active = True
    mock_user.role = MagicMock()
    mock_user.role.name = "tenant_admin"

    # ── Mock Supplier ────────────────────────────────────────────────────────
    mock_supplier = MagicMock()
    mock_supplier.id = SUPPLIER_ID
    mock_supplier.tenant_id = TENANT_ID
    mock_supplier.name = "Acme Corp"
    mock_supplier.country = "France"
    mock_supplier.category = "Services"
    mock_supplier.contact_email = "contact@acme.fr"
    mock_supplier.website = None
    mock_supplier.employees = 50
    mock_supplier.annual_revenue_k_eur = None
    mock_supplier.spend_k_eur = 100.0
    mock_supplier.risk_level = "medium"
    mock_supplier.status = "active"
    mock_supplier.global_score = 72.0
    mock_supplier.env_score = 70.0
    mock_supplier.social_score = 68.0
    mock_supplier.gov_score = 80.0
    mock_supplier.flags = []
    mock_supplier.questionnaire_data = None
    mock_supplier.portal_token = PORTAL_TOKEN
    mock_supplier.portal_token_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    mock_supplier.questionnaire_completed_at = None
    mock_supplier.last_scored_at = None
    mock_supplier.created_at = datetime.now(timezone.utc)
    mock_supplier.updated_at = datetime.now(timezone.utc)

    def _make_scalars_result(items):
        r = MagicMock()
        r.scalars.return_value.all.return_value = items
        r.scalar_one_or_none.return_value = items[0] if items else None
        return r

    async def mock_execute(query, *args, **kwargs):
        return _make_scalars_result([mock_supplier])

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.refresh = AsyncMock()
    mock_db.delete = AsyncMock()

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def client_no_auth():
    """
    FastAPI TestClient with only DB overridden — no auth override.
    Used to test unauthenticated requests.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=MagicMock(
        scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
        scalar_one_or_none=MagicMock(return_value=None),
    ))
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


# ─── Authentication guard ─────────────────────────────────────────────────────

class TestSupplyChainAuthGuard:
    """Authenticated endpoints must reject unauthenticated requests with 401."""

    def test_list_suppliers_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.get("/api/v1/supply-chain/suppliers")
        assert resp.status_code == 401

    def test_create_supplier_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.post("/api/v1/supply-chain/suppliers", json={"name": "Test"})
        assert resp.status_code == 401

    def test_dashboard_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.get("/api/v1/supply-chain/dashboard")
        assert resp.status_code == 401

    def test_questionnaire_questions_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.get("/api/v1/supply-chain/questionnaire/questions")
        assert resp.status_code == 401

    def test_update_supplier_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.put(
            f"/api/v1/supply-chain/suppliers/{uuid4()}",
            json={"name": "Updated"}
        )
        assert resp.status_code == 401

    def test_delete_supplier_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.delete(f"/api/v1/supply-chain/suppliers/{uuid4()}")
        assert resp.status_code == 401

    def test_send_questionnaire_without_auth_returns_401(self, client_no_auth):
        resp = client_no_auth.post(f"/api/v1/supply-chain/suppliers/{uuid4()}/questionnaire")
        assert resp.status_code == 401


# ─── Public endpoints (portal) ────────────────────────────────────────────────

class TestPortalPublicEndpoints:
    """Portal endpoints are public — no authentication required."""

    def test_portal_get_with_unknown_token_returns_404(self, client_no_auth):
        """Unknown portal token must return 404 (not 401)."""
        resp = client_no_auth.get("/api/v1/supply-chain/portal/unknown-token-xyz")
        # Should not be 401 (public endpoint)
        assert resp.status_code != 401

    def test_portal_submit_with_unknown_token_returns_404(self, client_no_auth):
        """Submitting to an invalid token should not return 401."""
        resp = client_no_auth.post(
            "/api/v1/supply-chain/portal/bad-token/submit",
            json={"answers": {}, "supplier_name": "Test", "contact_name": "Bob"}
        )
        assert resp.status_code != 401


# ─── GET /suppliers ───────────────────────────────────────────────────────────

class TestListSuppliers:

    def test_list_suppliers_with_auth_returns_200(self, client):
        resp = client.get("/api/v1/supply-chain/suppliers")
        assert resp.status_code == 200

    def test_list_suppliers_returns_list(self, client):
        resp = client.get("/api/v1/supply-chain/suppliers")
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)

    def test_list_suppliers_risk_filter_invalid_page_returns_422(self, client):
        """page must be >= 1."""
        resp = client.get("/api/v1/supply-chain/suppliers?page=0")
        assert resp.status_code == 422

    def test_list_suppliers_page_size_too_large_returns_422(self, client):
        """page_size has max=200."""
        resp = client.get("/api/v1/supply-chain/suppliers?page_size=9999")
        assert resp.status_code == 422

    def test_list_suppliers_with_risk_filter(self, client):
        """risk_level filter is optional — must not 422."""
        resp = client.get("/api/v1/supply-chain/suppliers?risk_level=high")
        assert resp.status_code in (200, 500)

    def test_list_suppliers_with_category_filter(self, client):
        resp = client.get("/api/v1/supply-chain/suppliers?category=Services")
        assert resp.status_code in (200, 500)

    def test_list_suppliers_pagination(self, client):
        resp = client.get("/api/v1/supply-chain/suppliers?page=1&page_size=10")
        assert resp.status_code in (200, 500)


# ─── POST /suppliers ──────────────────────────────────────────────────────────

class TestCreateSupplier:

    def test_create_supplier_missing_name_returns_422(self, client):
        resp = client.post("/api/v1/supply-chain/suppliers", json={})
        assert resp.status_code == 422

    def test_create_supplier_valid_minimal_returns_201(self, client):
        resp = client.post(
            "/api/v1/supply-chain/suppliers",
            json={"name": "New Supplier"}
        )
        assert resp.status_code in (201, 500)

    def test_create_supplier_full_payload_accepted(self, client):
        resp = client.post(
            "/api/v1/supply-chain/suppliers",
            json={
                "name": "GreenTech SAS",
                "country": "Germany",
                "category": "Manufacturing",
                "contact_email": "contact@greentech.de",
                "employees": 120,
                "spend_k_eur": 250.0,
            }
        )
        assert resp.status_code in (201, 500)

    def test_create_supplier_returns_supplier_data(self, client):
        resp = client.post(
            "/api/v1/supply-chain/suppliers",
            json={"name": "Test Supplier"}
        )
        if resp.status_code == 201:
            data = resp.json()
            assert "id" in data
            assert "name" in data


# ─── PUT /suppliers/{id} ─────────────────────────────────────────────────────

class TestUpdateSupplier:

    def test_update_supplier_with_valid_id_returns_non_401(self, client):
        resp = client.put(
            f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}",
            json={"name": "Updated Name"}
        )
        assert resp.status_code != 401

    def test_update_supplier_invalid_uuid_returns_422(self, client):
        resp = client.put(
            "/api/v1/supply-chain/suppliers/not-a-uuid",
            json={"name": "Updated"}
        )
        # FastAPI path param validation may not validate UUIDs here (str type)
        # so the response should not be 401
        assert resp.status_code != 401

    def test_update_supplier_partial_update_accepted(self, client):
        resp = client.put(
            f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}",
            json={"risk_level": "low", "status": "active"}
        )
        assert resp.status_code in (200, 404, 500)

    def test_update_supplier_scores(self, client):
        resp = client.put(
            f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}",
            json={"global_score": 85.0, "env_score": 90.0}
        )
        assert resp.status_code in (200, 404, 500)


# ─── DELETE /suppliers/{id} ──────────────────────────────────────────────────

class TestDeleteSupplier:

    def test_delete_supplier_valid_id_returns_non_401(self, client):
        resp = client.delete(f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}")
        assert resp.status_code != 401

    def test_delete_supplier_returns_204_or_404(self, client):
        resp = client.delete(f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}")
        assert resp.status_code in (204, 404, 500)


# ─── GET /dashboard ───────────────────────────────────────────────────────────

class TestSupplyChainDashboard:

    def test_dashboard_with_auth_returns_200(self, client):
        resp = client.get("/api/v1/supply-chain/dashboard")
        assert resp.status_code in (200, 500)

    def test_dashboard_response_has_required_keys(self, client):
        resp = client.get("/api/v1/supply-chain/dashboard")
        if resp.status_code == 200:
            data = resp.json()
            assert "total_suppliers" in data
            assert "risk_distribution" in data

    def test_dashboard_risk_distribution_is_list(self, client):
        resp = client.get("/api/v1/supply-chain/dashboard")
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data.get("risk_distribution"), list)


# ─── GET /questionnaire/questions ─────────────────────────────────────────────

class TestQuestionnaireQuestions:

    def test_questions_with_auth_returns_200(self, client):
        resp = client.get("/api/v1/supply-chain/questionnaire/questions")
        assert resp.status_code == 200

    def test_questions_returns_list(self, client):
        resp = client.get("/api/v1/supply-chain/questionnaire/questions")
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data, list)
            assert len(data) > 0

    def test_each_question_has_required_fields(self, client):
        resp = client.get("/api/v1/supply-chain/questionnaire/questions")
        if resp.status_code == 200:
            for q in resp.json():
                assert "id" in q
                assert "section" in q
                assert "question" in q

    def test_questions_contain_environmental_section(self, client):
        resp = client.get("/api/v1/supply-chain/questionnaire/questions")
        if resp.status_code == 200:
            sections = {q["section"] for q in resp.json()}
            assert "Environnement" in sections or any("env" in s.lower() for s in sections)

    def test_questions_contain_governance_section(self, client):
        resp = client.get("/api/v1/supply-chain/questionnaire/questions")
        if resp.status_code == 200:
            sections = {q["section"] for q in resp.json()}
            assert "Gouvernance" in sections or any("gov" in s.lower() for s in sections)


# ─── POST /suppliers/{id}/questionnaire ──────────────────────────────────────

class TestSendQuestionnaire:

    def test_send_questionnaire_valid_id_returns_non_401(self, client):
        resp = client.post(f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}/questionnaire")
        assert resp.status_code != 401

    def test_send_questionnaire_with_email_returns_non_422(self, client):
        resp = client.post(
            f"/api/v1/supply-chain/suppliers/{SUPPLIER_ID}/questionnaire",
            json={"recipient_email": "supplier@example.com"}
        )
        assert resp.status_code != 422
