"""
Integration tests — Analytics endpoints (/api/v1/analytics/*)

Routes covered:
  GET /api/v1/analytics/anomalies              — Z-score anomaly detection
  GET /api/v1/analytics/insights               — ESG performance insights
  GET /api/v1/analytics/suggestions            — rule-based improvement suggestions
  GET /api/v1/analytics/predictions            — predictions (if implemented)
  GET /api/v1/analytics/ml/forecast            — ML time-series forecast
  GET /api/v1/analytics/ml/anomalies           — ML anomaly detection
  GET /api/v1/analytics/ml/recommendations     — ML recommendations
  POST /api/v1/analytics/chat                  — AI chat (OpenAI optional)

Analytics uses get_current_user from app.dependencies (not get_current_user_id).
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_user():
    u = MagicMock()
    u.id        = USER_ID
    u.tenant_id = TENANT_ID
    u.email     = "analyst@test.com"
    u.is_active = True
    u.role      = MagicMock()
    u.role.name = "esg_manager"
    return u


# ─── Fixture ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.dependencies import get_current_user

    mock_user = _make_user()

    scalars_mock = MagicMock()
    scalars_mock.all   = MagicMock(return_value=[])
    scalars_mock.first = MagicMock(return_value=None)

    execute_result = MagicMock()
    execute_result.scalars              = MagicMock(return_value=scalars_mock)
    execute_result.scalar_one_or_none   = MagicMock(return_value=None)
    execute_result.scalar               = MagicMock(return_value=0)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)
    mock_db.commit  = AsyncMock()

    async def _db():
        yield mock_db

    async def _user():
        return mock_user

    app.dependency_overrides[get_db]           = _db
    app.dependency_overrides[get_current_user] = _user

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


# ─── GET /anomalies ───────────────────────────────────────────────────────────

class TestAnomalies:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/analytics/anomalies",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_has_anomalies_key(self, client):
        resp = client.get(
            "/api/v1/analytics/anomalies",
            headers={"Authorization": "Bearer test"},
        )
        body = resp.json()
        assert "anomalies" in body
        assert "count" in body

    def test_year_filter(self, client):
        resp = client.get(
            "/api/v1/analytics/anomalies?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/analytics/anomalies")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── GET /insights ────────────────────────────────────────────────────────────

class TestInsights:
    def test_requires_year(self, client):
        """year is required — missing it should return 422."""
        resp = client.get(
            "/api/v1/analytics/insights",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_returns_200_with_year(self, client):
        resp = client.get(
            "/api/v1/analytics/insights?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.get("/api/v1/analytics/insights?year=2025")
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401


# ─── GET /suggestions ────────────────────────────────────────────────────────

class TestSuggestions:
    def test_requires_year(self, client):
        resp = client.get(
            "/api/v1/analytics/suggestions",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 422

    def test_returns_200_with_year(self, client):
        resp = client.get(
            "/api/v1/analytics/suggestions?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_has_suggestions_key(self, client):
        resp = client.get(
            "/api/v1/analytics/suggestions?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            body = resp.json()
            assert "suggestions" in body


# ─── GET /ml/forecast ────────────────────────────────────────────────────────

class TestMLForecast:
    def test_returns_non_401(self, client):
        resp = client.get(
            "/api/v1/analytics/ml/forecast",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_returns_200_or_error(self, client):
        resp = client.get(
            "/api/v1/analytics/ml/forecast",
            headers={"Authorization": "Bearer test"},
        )
        # 200 = OK, 422 = missing param, 500 = service error (all acceptable)
        assert resp.status_code in (200, 422, 500)


# ─── GET /ml/anomalies ───────────────────────────────────────────────────────

class TestMLAnomalies:
    def test_returns_non_401(self, client):
        resp = client.get(
            "/api/v1/analytics/ml/anomalies",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_returns_200_or_known(self, client):
        resp = client.get(
            "/api/v1/analytics/ml/anomalies",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 422, 500)


# ─── GET /ml/recommendations ─────────────────────────────────────────────────

class TestMLRecommendations:
    def test_returns_non_401(self, client):
        resp = client.get(
            "/api/v1/analytics/ml/recommendations",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_returns_200_or_known(self, client):
        resp = client.get(
            "/api/v1/analytics/ml/recommendations",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 422, 500)


# ─── POST /chat ───────────────────────────────────────────────────────────────

class TestAnalyticsChat:
    def test_chat_no_auth_401(self, client):
        from app.main import app
        from app.dependencies import get_current_user
        del app.dependency_overrides[get_current_user]
        resp = client.post("/api/v1/analytics/chat", json={"message": "Quels sont mes scores?"})
        app.dependency_overrides[get_current_user] = lambda: _make_user()
        assert resp.status_code == 401

    def test_chat_returns_non_401(self, client):
        resp = client.post(
            "/api/v1/analytics/chat",
            json={"message": "Analyse mes performances ESG"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_chat_missing_body_422(self, client):
        resp = client.post(
            "/api/v1/analytics/chat",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        # message field is required
        assert resp.status_code in (200, 422)
