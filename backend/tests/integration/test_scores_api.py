"""
Integration tests — Scores endpoints (/api/v1/scores/*)

Routes covered:
  POST /api/v1/scores/calculate          — calculate ESG score
  GET  /api/v1/scores/latest             — latest score
  GET  /api/v1/scores/history            — score history
  GET  /api/v1/scores/compare-organizations — org comparison
  GET  /api/v1/scores/alerts             — score alerts
  GET  /api/v1/scores/trends             — score trends

Uses get_current_user_id from auth_middleware.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
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
    return u


def _make_score():
    s = MagicMock()
    s.id = SCORE_ID; s.tenant_id = TENANT_ID
    s.organization_id = ORG_ID
    s.score_date = date(2025, 12, 31)
    s.total_score = 72.5
    s.env_score = 68.0; s.soc_score = 75.0; s.gov_score = 76.0
    s.grade = "B"; s.created_at = datetime.now(timezone.utc)
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
    mock_db.add = MagicMock(); mock_db.commit = AsyncMock(); mock_db.refresh = AsyncMock()

    async def _db(): yield mock_db
    async def _uid(): return USER_ID

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user_id] = _uid

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


class TestScoresCalculate:
    def test_calculate_non_401(self, client):
        resp = client.post(
            "/api/v1/scores/calculate",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_calculate_with_date(self, client):
        resp = client.post(
            "/api/v1/scores/calculate?calculation_date=2025-12-31",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_no_auth_401(self, client):
        from app.main import app
        from app.middleware.auth_middleware import get_current_user_id
        del app.dependency_overrides[get_current_user_id]
        resp = client.post("/api/v1/scores/calculate")
        async def _r(): return USER_ID
        app.dependency_overrides[get_current_user_id] = _r
        assert resp.status_code == 401


class TestScoresLatest:
    def test_latest_non_401(self, client):
        resp = client.get(
            "/api/v1/scores/latest",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401

    def test_latest_returns_dict_or_null(self, client):
        resp = client.get(
            "/api/v1/scores/latest",
            headers={"Authorization": "Bearer test"},
        )
        if resp.status_code == 200:
            assert isinstance(resp.json(), (dict, type(None)))


class TestScoresHistory:
    def test_history_returns_200(self, client):
        resp = client.get(
            "/api/v1/scores/history",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_history_returns_list_or_dict(self, client):
        resp = client.get(
            "/api/v1/scores/history",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))

    def test_history_with_year_filter(self, client):
        resp = client.get(
            "/api/v1/scores/history?year=2025",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code in (200, 422)


class TestScoresCompare:
    def test_compare_non_401(self, client):
        resp = client.get(
            "/api/v1/scores/compare-organizations",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401


class TestScoresAlerts:
    def test_alerts_returns_200(self, client):
        resp = client.get(
            "/api/v1/scores/alerts",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code == 200

    def test_alerts_returns_list_or_dict(self, client):
        resp = client.get(
            "/api/v1/scores/alerts",
            headers={"Authorization": "Bearer test"},
        )
        assert isinstance(resp.json(), (list, dict))


class TestScoresTrends:
    def test_trends_non_401(self, client):
        resp = client.get(
            "/api/v1/scores/trends",
            headers={"Authorization": "Bearer test"},
        )
        assert resp.status_code != 401
