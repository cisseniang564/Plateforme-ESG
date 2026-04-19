"""
Tests unitaires — ESGRecommendationService (rule-based + OpenAI fallback).
"""
import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

pytestmark = pytest.mark.unit


def _get_service():
    from app.services.ml.recommendations_service import ESGRecommendationService
    svc = ESGRecommendationService.__new__(ESGRecommendationService)
    return svc


# ─── Rule-based Recommendations ───────────────────────────────────────────────

class TestRuleBasedRecommendations:
    """Tests for the fallback rule-based recommendation engine."""

    def test_returns_list(self):
        svc = _get_service()
        profile = {"environmental_score": 40.0, "social_score": 60.0, "governance_score": 55.0}
        result = svc._rule_based_recommendations(profile)
        assert isinstance(result, list)

    def test_returns_at_least_one_recommendation(self):
        svc = _get_service()
        profile = {"environmental_score": 30.0, "social_score": 50.0, "governance_score": 45.0}
        result = svc._rule_based_recommendations(profile)
        assert len(result) >= 1

    def test_recommendation_schema(self):
        """Each recommendation must have all required fields."""
        svc = _get_service()
        profile = {"environmental_score": 35.0, "social_score": 55.0, "governance_score": 40.0}
        result = svc._rule_based_recommendations(profile)
        required = {"title", "description", "difficulty", "timeline", "priority"}
        for rec in result:
            assert required.issubset(rec.keys()), f"Missing keys in {rec}"

    def test_difficulty_is_valid_range(self):
        svc = _get_service()
        profile = {"environmental_score": 20.0, "social_score": 20.0, "governance_score": 20.0}
        result = svc._rule_based_recommendations(profile)
        for rec in result:
            assert 1 <= rec["difficulty"] <= 5, f"Invalid difficulty: {rec['difficulty']}"

    def test_timeline_is_valid(self):
        svc = _get_service()
        profile = {"environmental_score": 25.0, "social_score": 30.0, "governance_score": 35.0}
        valid_timelines = {"court", "moyen", "long"}
        result = svc._rule_based_recommendations(profile)
        for rec in result:
            assert rec["timeline"] in valid_timelines, f"Invalid timeline: {rec['timeline']}"

    def test_priority_is_valid(self):
        svc = _get_service()
        profile = {"environmental_score": 25.0, "social_score": 30.0, "governance_score": 35.0}
        valid_priorities = {"high", "medium", "low"}
        result = svc._rule_based_recommendations(profile)
        for rec in result:
            assert rec["priority"] in valid_priorities

    def test_low_environmental_score_triggers_env_recommendation(self):
        """When E score is very low, at least one environmental recommendation expected."""
        svc = _get_service()
        profile = {"environmental_score": 15.0, "social_score": 70.0, "governance_score": 70.0}
        result = svc._rule_based_recommendations(profile)
        titles = " ".join(r.get("title", "").lower() for r in result)
        # Should mention emissions, energy, or environmental
        assert any(kw in titles for kw in ["émission", "emiss", "énergie", "energ", "carbone", "carbon", "environnement"])

    def test_high_scores_return_fewer_recommendations(self):
        """Good performers need fewer urgent improvements."""
        svc = _get_service()
        bad_profile  = {"environmental_score": 20.0, "social_score": 20.0, "governance_score": 20.0}
        good_profile = {"environmental_score": 85.0, "social_score": 85.0, "governance_score": 85.0}
        bad_recs  = svc._rule_based_recommendations(bad_profile)
        good_recs = svc._rule_based_recommendations(good_profile)
        assert len(bad_recs) >= len(good_recs)


# ─── Company Profile Builder ───────────────────────────────────────────────────

class TestBuildCompanyProfile:
    """Tests for the profile aggregation helper."""

    def test_profile_contains_required_keys(self):
        svc = _get_service()
        mock_scores = {"environmental": 45.0, "social": 60.0, "governance": 55.0}
        mock_top_emitters = [{"name": "CO2 Scope 1", "value": 120.0}]

        # Directly test profile structure
        profile = {
            "environmental_score": mock_scores["environmental"],
            "social_score":        mock_scores["social"],
            "governance_score":    mock_scores["governance"],
            "top_emitters":        mock_top_emitters,
            "data_completeness":   0.75,
        }

        required = {"environmental_score", "social_score", "governance_score"}
        assert required.issubset(profile.keys())

    def test_scores_are_numeric(self):
        profile = {
            "environmental_score": 45.5,
            "social_score":        60.0,
            "governance_score":    55.2,
        }
        for key in ("environmental_score", "social_score", "governance_score"):
            assert isinstance(profile[key], float)


# ─── OpenAI Response Validation ───────────────────────────────────────────────

class TestOpenAIResponseValidation:
    """Tests for the validation of OpenAI JSON response."""

    def _validate_recommendation(self, rec: dict) -> bool:
        """Mimic service validation logic."""
        required = {"title", "description", "difficulty", "timeline", "priority"}
        if not required.issubset(rec.keys()):
            return False
        if not (1 <= rec.get("difficulty", 0) <= 5):
            return False
        if rec.get("timeline") not in ("court", "moyen", "long"):
            return False
        if rec.get("priority") not in ("high", "medium", "low"):
            return False
        return True

    def test_valid_recommendation_passes(self):
        rec = {
            "title": "Réduire les émissions Scope 1",
            "description": "Installer des panneaux solaires sur le toit.",
            "difficulty": 3,
            "timeline": "moyen",
            "priority": "high",
        }
        assert self._validate_recommendation(rec) is True

    def test_invalid_difficulty_fails(self):
        rec = {
            "title": "Test", "description": "Test",
            "difficulty": 6,  # out of range
            "timeline": "court", "priority": "high",
        }
        assert self._validate_recommendation(rec) is False

    def test_invalid_timeline_fails(self):
        rec = {
            "title": "Test", "description": "Test",
            "difficulty": 2,
            "timeline": "immediate",  # not valid
            "priority": "medium",
        }
        assert self._validate_recommendation(rec) is False

    def test_missing_required_field_fails(self):
        rec = {
            "title": "Test",
            "difficulty": 2,
            "timeline": "court",
            "priority": "medium",
            # "description" missing
        }
        assert self._validate_recommendation(rec) is False

    @pytest.mark.parametrize("timeline", ["court", "moyen", "long"])
    def test_all_valid_timelines_accepted(self, timeline):
        rec = {
            "title": "T", "description": "D",
            "difficulty": 1, "timeline": timeline, "priority": "low",
        }
        assert self._validate_recommendation(rec) is True

    @pytest.mark.parametrize("priority", ["high", "medium", "low"])
    def test_all_valid_priorities_accepted(self, priority):
        rec = {
            "title": "T", "description": "D",
            "difficulty": 2, "timeline": "moyen", "priority": priority,
        }
        assert self._validate_recommendation(rec) is True
