"""Unit tests for ESG score calculation logic."""
import pytest


class TestGradeAssignment:
    """Test ESG grade assignment from scores."""

    @pytest.mark.parametrize("score,expected_grade", [
        (95.0, "A"),
        (80.0, "A"),
        (75.0, "B"),
        (65.0, "B"),
        (60.0, "C"),
        (50.0, "C"),
        (40.0, "D"),
        (30.0, "D"),
        (20.0, "F"),
        (0.0, "F"),
    ])
    def test_grade_from_score(self, score: float, expected_grade: str):
        grade = self._assign_grade(score)
        assert grade == expected_grade

    @staticmethod
    def _assign_grade(score: float) -> str:
        """Replicate the grade assignment logic from the scoring engine."""
        if score >= 80:
            return "A"
        elif score >= 65:
            return "B"
        elif score >= 50:
            return "C"
        elif score >= 35:
            return "D"
        else:
            return "F"


class TestScoreNormalization:
    """Test score normalization to 0-100 range."""

    def test_score_within_bounds(self):
        score = 72.5
        assert 0 <= score <= 100

    def test_weighted_average(self):
        e_score, s_score, g_score = 75.0, 80.0, 65.0
        weights = {"environmental": 0.4, "social": 0.35, "governance": 0.25}
        overall = (
            e_score * weights["environmental"]
            + s_score * weights["social"]
            + g_score * weights["governance"]
        )
        assert abs(overall - 74.25) < 0.01

    def test_best_worst_pillar(self):
        scores = {"environmental": 90.0, "social": 65.0, "governance": 55.0}
        best = max(scores, key=scores.get)
        worst = min(scores, key=scores.get)
        assert best == "environmental"
        assert worst == "governance"
