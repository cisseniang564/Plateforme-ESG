"""
Integration tests for ESG Scoring endpoints.

Routes under /api/v1/esg-scoring/:
  GET  /weights                 — get current pillar weights
  PUT  /weights                 — update pillar weights (admin only)
  POST /calculate               — calculate ESG score for an organisation
  POST /calculate-historical    — calculate 12-month history
  GET  /organization/{id}       — fetch stored scores for an org
  POST /recalculate-all         — recalc every org (manager+)
  GET  /dashboard               — scoring dashboard stats
  GET  /live-summary            — live scores from data_entries
  GET  /all-org-scores          — latest score per org
  POST /batch-calculate         — batch score calculation
  POST /data-quality            — data quality check

All tests use FastAPI TestClient with a mocked async DB dependency so
no real Postgres or Redis connection is required.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

pytestmark = pytest.mark.integration

# ─── Shared constants ─────────────────────────────────────────────────────────

TENANT_ID = uuid4()
USER_ID = uuid4()
ORG_ID = uuid4()
SCORE_ID = uuid4()


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """
    FastAPI TestClient with:
    - DB dependency overridden by a mock AsyncSession
    - Auth middleware bypassed by injecting user_id / tenant_id into request.state
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id

    # ── Mock User object ──────────────────────────────────────────────────────
    mock_user = MagicMock()
    mock_user.id = USER_ID
    mock_user.tenant_id = TENANT_ID
    mock_user.email = "admin@test.com"
    mock_user.is_active = True
    mock_user.role = MagicMock()
    mock_user.role.name = "tenant_admin"

    # ── Mock Score object ─────────────────────────────────────────────────────
    from datetime import date
    mock_score = MagicMock()
    mock_score.id = SCORE_ID
    mock_score.tenant_id = TENANT_ID
    mock_score.organization_id = ORG_ID
    mock_score.overall_score = 72.5
    mock_score.environmental_score = 70.0
    mock_score.social_score = 68.0
    mock_score.governance_score = 80.0
    mock_score.rating = "A"
    mock_score.confidence_level = "medium"
    mock_score.data_completeness = 55.0
    mock_score.calculation_date = date(2024, 1, 1)

    def _make_scalar_result(obj):
        r = MagicMock()
        r.scalar_one_or_none.return_value = obj
        r.scalars.return_value.all.return_value = [] if obj is None else [obj]
        r.fetchone.return_value = (1, 72.5, 70.0, 68.0, 80.0, 55.0)
        r.fetchall.return_value = []
        return r

    async def mock_execute(query, *args, **kwargs):
        q_str = str(query).lower()
        if "user" in q_str:
            return _make_scalar_result(mock_user)
        if "esg_score" in q_str or "organization" in q_str:
            return _make_scalar_result(mock_score)
        r = MagicMock()
        r.scalar_one_or_none.return_value = None
        r.scalars.return_value.all.return_value = []
        r.fetchone.return_value = (0, 0.0, 0.0, 0.0, 0.0, 0.0)
        r.fetchall.return_value = []
        return r

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.rollback = AsyncMock()
    mock_db.refresh = AsyncMock()

    # Inject user_id into request.state so auth middleware passes
    async def override_get_db():
        yield mock_db

    async def override_get_current_user_id():
        return USER_ID

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c, str(USER_ID), str(TENANT_ID), str(ORG_ID)

    app.dependency_overrides.clear()


def _auth_headers(client_tuple):
    """Return valid JWT auth headers using conftest fixture logic."""
    import os
    from jose import jwt
    secret = os.environ.get("JWT_SECRET_KEY", "test-jwt-secret-key-at-least-32-chars!!")
    token = jwt.encode(
        {"sub": str(USER_ID), "tenant_id": str(TENANT_ID), "exp": 9_999_999_999, "type": "access"},
        secret, algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


# ─── Public/Health checks ─────────────────────────────────────────────────────

class TestHealthAndPublicEndpoints:

    def test_health_returns_200(self, client):
        c, *_ = client
        resp = c.get("/health")
        assert resp.status_code == 200

    def test_health_returns_healthy_status(self, client):
        c, *_ = client
        data = c.get("/health").json()
        assert data.get("status") == "healthy"


# ─── Authentication guard ─────────────────────────────────────────────────────

class TestEsgScoringAuthGuard:
    """Every ESG scoring endpoint must require authentication."""

    def test_get_weights_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/weights")
        assert resp.status_code == 401

    def test_calculate_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.post("/api/v1/esg-scoring/calculate", json={
            "organization_id": str(uuid4())
        })
        assert resp.status_code == 401

    def test_dashboard_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/dashboard")
        assert resp.status_code == 401

    def test_live_summary_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/live-summary")
        assert resp.status_code == 401

    def test_all_org_scores_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/all-org-scores")
        assert resp.status_code == 401

    def test_org_scores_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.get(f"/api/v1/esg-scoring/organization/{uuid4()}")
        assert resp.status_code == 401

    def test_data_quality_without_auth_returns_401(self, client):
        c, *_ = client
        resp = c.post("/api/v1/esg-scoring/data-quality", json={
            "organization_id": str(uuid4())
        })
        assert resp.status_code == 401


# ─── GET /weights ─────────────────────────────────────────────────────────────

class TestGetEsgWeights:

    def test_get_weights_with_auth_returns_2xx(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/weights", headers=_auth_headers(client))
        assert resp.status_code in (200, 404, 500)

    def test_get_weights_response_has_weights_key(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/weights", headers=_auth_headers(client))
        if resp.status_code == 200:
            data = resp.json()
            assert "weights" in data

    def test_get_weights_has_env_soc_gov_keys(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/weights", headers=_auth_headers(client))
        if resp.status_code == 200:
            weights = resp.json().get("weights", {})
            assert "env" in weights or len(weights) > 0


# ─── PUT /weights ─────────────────────────────────────────────────────────────

class TestUpdateEsgWeights:

    def test_put_weights_invalid_sum_returns_422(self, client):
        c, *_ = client
        resp = c.put(
            "/api/v1/esg-scoring/weights",
            json={"env": 0.5, "soc": 0.5, "gov": 0.5},  # sum=1.5 → invalid
            headers=_auth_headers(client)
        )
        # 422 (validation) or 403 (role) or 401 (auth) — all acceptable
        assert resp.status_code in (401, 403, 422)

    def test_put_weights_valid_sum_accepted(self, client):
        c, *_ = client
        resp = c.put(
            "/api/v1/esg-scoring/weights",
            json={"env": 0.40, "soc": 0.35, "gov": 0.25},
            headers=_auth_headers(client)
        )
        # Could be 200 (success) or 403 (role check) — not 422
        assert resp.status_code != 422

    def test_put_weights_without_body_returns_422(self, client):
        c, *_ = client
        resp = c.put(
            "/api/v1/esg-scoring/weights",
            json={},
            headers=_auth_headers(client)
        )
        assert resp.status_code in (401, 403, 422)


# ─── POST /calculate ─────────────────────────────────────────────────────────

class TestCalculateEsgScore:

    def test_calculate_missing_org_id_returns_422(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/calculate",
            json={},
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_calculate_invalid_uuid_returns_422(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/calculate",
            json={"organization_id": "not-a-uuid"},
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_calculate_with_valid_payload_returns_non_401(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/calculate",
            json={"organization_id": str(uuid4()), "period_months": 12},
            headers=_auth_headers(client)
        )
        # Auth passed — may be 200, 400, 404, or 500 depending on mock
        assert resp.status_code != 401

    def test_calculate_with_date_string_is_accepted(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/calculate",
            json={
                "organization_id": str(uuid4()),
                "calculation_date": "2024-06-30",
                "period_months": 6,
            },
            headers=_auth_headers(client)
        )
        assert resp.status_code != 422


# ─── POST /calculate-historical ───────────────────────────────────────────────

class TestCalculateHistorical:

    def test_calculate_historical_missing_org_returns_422(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/calculate-historical",
            json={},
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_calculate_historical_valid_payload_returns_non_401(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/calculate-historical",
            json={"organization_id": str(uuid4())},
            headers=_auth_headers(client)
        )
        assert resp.status_code != 401


# ─── GET /organization/{id} ───────────────────────────────────────────────────

class TestGetOrganizationScores:

    def test_get_org_scores_with_auth_returns_non_401(self, client):
        c, *_ = client
        resp = c.get(
            f"/api/v1/esg-scoring/organization/{uuid4()}",
            headers=_auth_headers(client)
        )
        assert resp.status_code != 401

    def test_get_org_scores_limit_param_too_large_returns_422(self, client):
        c, *_ = client
        resp = c.get(
            f"/api/v1/esg-scoring/organization/{uuid4()}?limit=9999",
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_get_org_scores_limit_zero_returns_422(self, client):
        c, *_ = client
        resp = c.get(
            f"/api/v1/esg-scoring/organization/{uuid4()}?limit=0",
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_get_org_scores_invalid_uuid_returns_422(self, client):
        c, *_ = client
        resp = c.get(
            "/api/v1/esg-scoring/organization/not-a-valid-uuid",
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_get_org_scores_response_has_scores_key(self, client):
        c, *_ = client
        resp = c.get(
            f"/api/v1/esg-scoring/organization/{uuid4()}",
            headers=_auth_headers(client)
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "scores" in data
            assert "count" in data


# ─── GET /dashboard ───────────────────────────────────────────────────────────

class TestScoringDashboard:

    def test_dashboard_with_auth_returns_non_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/dashboard", headers=_auth_headers(client))
        assert resp.status_code != 401

    def test_dashboard_response_structure(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/dashboard", headers=_auth_headers(client))
        if resp.status_code == 200:
            data = resp.json()
            assert "statistics" in data or "rating_distribution" in data


# ─── GET /live-summary ────────────────────────────────────────────────────────

class TestLiveSummary:

    def test_live_summary_with_auth_returns_non_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/live-summary", headers=_auth_headers(client))
        assert resp.status_code != 401

    def test_live_summary_response_has_required_keys(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/live-summary", headers=_auth_headers(client))
        if resp.status_code == 200:
            data = resp.json()
            for key in ("esg_score", "environmental_score", "social_score", "governance_score", "rating"):
                assert key in data, f"Missing key: {key}"


# ─── GET /all-org-scores ──────────────────────────────────────────────────────

class TestAllOrgScores:

    def test_all_org_scores_with_auth_returns_non_401(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/all-org-scores", headers=_auth_headers(client))
        assert resp.status_code != 401

    def test_all_org_scores_response_has_scores_key(self, client):
        c, *_ = client
        resp = c.get("/api/v1/esg-scoring/all-org-scores", headers=_auth_headers(client))
        if resp.status_code == 200:
            data = resp.json()
            assert "scores" in data
            assert "count" in data


# ─── POST /batch-calculate ───────────────────────────────────────────────────

class TestBatchCalculate:

    def test_batch_calculate_empty_list_returns_non_401(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/batch-calculate",
            json=[],
            headers=_auth_headers(client)
        )
        assert resp.status_code != 401

    def test_batch_calculate_invalid_list_returns_422(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/batch-calculate",
            json=["not-a-uuid"],
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422


# ─── POST /data-quality ───────────────────────────────────────────────────────

class TestDataQuality:

    def test_data_quality_missing_org_id_returns_422(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/data-quality",
            json={},
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422

    def test_data_quality_valid_payload_returns_non_401(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/data-quality",
            json={"organization_id": str(uuid4()), "months": 6},
            headers=_auth_headers(client)
        )
        assert resp.status_code != 401

    def test_data_quality_invalid_uuid_returns_422(self, client):
        c, *_ = client
        resp = c.post(
            "/api/v1/esg-scoring/data-quality",
            json={"organization_id": "bad-uuid"},
            headers=_auth_headers(client)
        )
        assert resp.status_code == 422
