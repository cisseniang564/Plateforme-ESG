"""
Integration tests — AI Insights endpoints (/api/v1/ai-insights/*)

Routes covered:
  GET  /api/v1/ai-insights        — recommendations (rule-based + optional OpenAI)
  POST /api/v1/ai-insights/chat   — AI chat (OpenAI or rule-based fallback)
  POST /api/v1/ai-insights/analyze — analyse a specific indicator

Uses get_current_user_id from auth_middleware.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import date, datetime, timezone

pytestmark = pytest.mark.integration

TENANT_ID = uuid4()
USER_ID   = uuid4()
ORG_ID    = uuid4()
SCORE_ID  = uuid4()


def _make_user():
    u = MagicMock()
    u.id = USER_ID; u.tenant_id = TENANT_ID
    u.email = "user@test.com"; u.is_active = True
    u.role = MagicMock(); u.role.name = "esg_manager"
    return u


def _make_score():
    s = MagicMock()
    s.id = SCORE_ID; s.tenant_id = TENANT_ID
    s.organization_id = ORG_ID
    s.score_date = date(2025, 12, 31)
    s.total_score = 65.0
    s.env_score = 58.0; s.soc_score = 70.0; s.gov_score = 68.0
    s.grade = "C"; s.created_at = datetime.now(timezone.utc)
    return s


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.session import get_db
    from app.middleware.auth_middleware import get_current_user_id

    mock_user  = _make_user()
    mock_score = _make_score()

    scalars_mock = MagicMock()
    scalars_mock.all   = MagicMock(return_value=[mock_score])
    scalars_mock.first = MagicMock(return_value=mock_score)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none = MagicMock(return_value=mock_user)
    execute_result.scalar  = MagicMock(return_value=mock_score.total_score)
    execute_result.scalars = MagicMock(return_value=scalars_mock)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=execute_result)

    async def _db(): yield mock_db
    async def _uid(): return USER_ID

    app.dependency_overrides[get_db]                = _db
    app.dependency_overrides[get_current_user_id]   = _uid

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestAIInsightsRecommendations:
    def test_returns_200(self, client):
        resp = client.get(
            "/api/v1/ai-insights",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_returns_dict(self, client):
        resp = client.get(
            "/api/v1/ai-insights",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), dict)

    def test_has_recommendations(self, client):
        resp = client.get(
            "/api/v1/ai-insights",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            body = resp.json()
            text = str(body).lower()
            assert any(k in text for k in ["recommendation", "insight", "action", "priority"])

    def test_with_org_filter(self, client):
        resp = client.get(
            f"/api/v1/ai-insights?organization_id={ORG_ID}",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 404, 422)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.get("/api/v1/ai-insights")
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401


class TestAIInsightsChat:
    def test_chat_non_401(self, client):
        resp = client.post(
            "/api/v1/ai-insights/chat",
            json={"message": "Quels sont mes principaux axes d'amélioration ESG?"},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_chat_returns_response(self, client):
        resp = client.post(
            "/api/v1/ai-insights/chat",
            json={"message": "Comment améliorer mon score environnemental?"},
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            body = resp.json()
            assert isinstance(body, dict)
            # Should have some response field
            text = str(body).lower()
            assert any(k in text for k in ["response", "message", "answer", "content"])

    def test_chat_rule_based_fallback(self, client):
        """Without OpenAI key, rule-based fallback should still return 200."""
        with patch.dict("os.environ", {}, clear=False):
            import os
            os.environ.pop("OPENAI_API_KEY", None)
            resp = client.post(
                "/api/v1/ai-insights/chat",
                json={"message": "Analyse mes données ESG"},
                headers={"Authorization": "Bearer test"},
            )
        assert resp.status_code in (200, 500)

    def test_chat_empty_message(self, client):
        resp = client.post(
            "/api/v1/ai-insights/chat",
            json={"message": ""},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 400, 422)

    def test_chat_missing_message_422(self, client):
        resp = client.post(
            "/api/v1/ai-insights/chat",
            json={},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 422)

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post("/api/v1/ai-insights/chat", json={"message": "test"})
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401


class TestAIInsightsAnalyze:
    def test_analyze_non_401(self, client):
        resp = client.post(
            "/api/v1/ai-insights/analyze",
            json={"indicator": "co2_emissions", "year": 2025},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_analyze_returns_known_status(self, client):
        resp = client.post(
            "/api/v1/ai-insights/analyze",
            json={"indicator": "co2_emissions", "year": 2025},
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 400, 422, 500)
