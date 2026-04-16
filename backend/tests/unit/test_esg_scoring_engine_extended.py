"""
Extended unit tests for ESGScoringEngine.

Covers methods not yet tested in test_score_calculation_service_v2.py:
- _remove_outliers()         — boundary at len < 4, IQR logic, no false removals
- _get_default_weights_for_sector() — all defined sectors + unknown fallback
- _calculate_data_quality()  — completeness arithmetic, confidence levels
- _normalize_value()         — all BENCHMARK_RANGES entries, both directions
- _calculate_indicator_trend() — improving / declining / stable / insufficient_data
- _calculate_overall_score() — weighted aggregation
- _calculate_rating()        — boundary values for each rating band
"""
import pytest
from unittest.mock import AsyncMock

pytestmark = pytest.mark.unit


# ---------------------------------------------------------------------------
# Helper — build a lightweight engine with no DB I/O
# ---------------------------------------------------------------------------

def _engine():
    from app.services.esg_scoring_engine import ESGScoringEngine
    return ESGScoringEngine(db=AsyncMock())


# ===========================================================================
# _remove_outliers
# ===========================================================================

class TestRemoveOutliers:
    """Tests for the IQR-based outlier removal method."""

    def test_fewer_than_4_values_returns_unchanged(self):
        """With < 4 values the method must return them unchanged (no IQR calculation)."""
        engine = _engine()
        for values in ([], [10.0], [10.0, 20.0], [10.0, 20.0, 30.0]):
            result = engine._remove_outliers(values)
            assert result == values, f"Expected identity for {values}, got {result}"

    def test_exactly_4_values_no_outliers(self):
        """Four tightly packed values should all be retained."""
        engine = _engine()
        values = [10.0, 11.0, 12.0, 13.0]
        result = engine._remove_outliers(values)
        assert len(result) == 4

    def test_extreme_outlier_is_removed(self):
        """A single extreme outlier should be filtered out."""
        engine = _engine()
        normal = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0]
        with_outlier = normal + [10_000.0]
        result = engine._remove_outliers(with_outlier)
        assert 10_000.0 not in result
        # All normal values must be retained
        for v in normal:
            assert v in result

    def test_all_equal_values_all_retained(self):
        """When all values are identical IQR=0 → none is outside bounds."""
        engine = _engine()
        values = [50.0, 50.0, 50.0, 50.0, 50.0]
        result = engine._remove_outliers(values)
        assert result == values

    def test_negative_outlier_is_removed(self):
        """A very negative value should also be filtered out."""
        engine = _engine()
        values = [100.0, 101.0, 102.0, 103.0, 104.0, -9999.0]
        result = engine._remove_outliers(values)
        assert -9999.0 not in result

    def test_returns_list_type(self):
        """Return value must be a list."""
        engine = _engine()
        result = engine._remove_outliers([1.0, 2.0, 3.0, 4.0])
        assert isinstance(result, list)


# ===========================================================================
# _get_default_weights_for_sector
# ===========================================================================

class TestGetDefaultWeightsForSector:
    """Tests for sector-specific default pillar weights."""

    KNOWN_SECTORS = [
        "energie",
        "industrie",
        "finance",
        "tech",
        "agriculture",
        "commerce",
        "services",
        "default",
    ]

    def test_all_known_sectors_return_weights(self):
        engine = _engine()
        for sector in self.KNOWN_SECTORS:
            weights = engine._get_default_weights_for_sector(sector)
            assert isinstance(weights, dict), f"Expected dict for sector {sector!r}"
            assert set(weights.keys()) == {"E", "S", "G"}, f"Wrong keys for {sector!r}: {weights}"

    def test_known_sectors_weights_sum_to_100(self):
        """E + S + G must sum to 100.0 for every known sector."""
        engine = _engine()
        for sector in self.KNOWN_SECTORS:
            weights = engine._get_default_weights_for_sector(sector)
            total = weights["E"] + weights["S"] + weights["G"]
            assert abs(total - 100.0) < 0.01, f"{sector}: sum={total}"

    def test_unknown_sector_falls_back_to_default(self):
        """An unrecognised sector code must return the 'default' weights."""
        engine = _engine()
        fallback = engine._get_default_weights_for_sector("default")
        unknown = engine._get_default_weights_for_sector("unknown-xyz-sector")
        assert unknown == fallback

    def test_energie_has_highest_environmental_weight(self):
        """Energy sector must weight environment more heavily than finance."""
        engine = _engine()
        energie_env = engine._get_default_weights_for_sector("energie")["E"]
        finance_env = engine._get_default_weights_for_sector("finance")["E"]
        assert energie_env > finance_env

    def test_finance_governance_weight_above_30(self):
        """Finance sector should place notable emphasis on governance."""
        engine = _engine()
        gov_weight = engine._get_default_weights_for_sector("finance")["G"]
        assert gov_weight >= 30.0

    def test_tech_social_weight_above_35(self):
        """Tech sector should weight social dimension highly."""
        engine = _engine()
        soc_weight = engine._get_default_weights_for_sector("tech")["S"]
        assert soc_weight >= 35.0

    def test_agriculture_environmental_weight_is_highest(self):
        """Agriculture should have the highest environmental weight."""
        engine = _engine()
        agri_env = engine._get_default_weights_for_sector("agriculture")["E"]
        other_sectors = [s for s in self.KNOWN_SECTORS if s not in ("agriculture", "default")]
        for sector in other_sectors:
            other_env = engine._get_default_weights_for_sector(sector)["E"]
            assert agri_env >= other_env, f"Agriculture E={agri_env} should be >= {sector} E={other_env}"


# ===========================================================================
# _calculate_data_quality
# ===========================================================================

class TestCalculateDataQuality:
    """Tests for the data quality metrics method."""

    def test_empty_indicator_data_returns_zero_completeness(self):
        engine = _engine()
        result = engine._calculate_data_quality({})
        assert result["completeness"] == 0.0
        assert result["confidence_level"] == "none"
        assert result["total_data_points"] == 0

    def test_completeness_formula(self):
        """completeness = (total_actual / (n_indicators * 12)) * 100."""
        engine = _engine()
        # 2 indicators, each with 6 data points → 6/12 per indicator → 50%
        indicator_data = {
            "ENV-001": {"count": 6, "trend": "stable"},
            "SOC-001": {"count": 6, "trend": "improving"},
        }
        result = engine._calculate_data_quality(indicator_data)
        expected = (12 / 24) * 100.0  # 12 total / (2*12) expected = 50%
        assert abs(result["completeness"] - expected) < 0.01

    def test_completeness_capped_at_100(self):
        """If actual data exceeds expected, completeness is capped at 100%."""
        engine = _engine()
        indicator_data = {
            "ENV-001": {"count": 999, "trend": "stable"},
        }
        result = engine._calculate_data_quality(indicator_data)
        assert result["completeness"] == 100.0

    def test_high_confidence_requires_completeness_80_and_5_indicators(self):
        """High confidence: completeness >= 80 AND >= 5 indicators."""
        engine = _engine()
        # 5 indicators × 10 data points each → 50/(5*12)=~83% completeness
        indicator_data = {
            f"IND-{i:03d}": {"count": 10, "trend": "stable"}
            for i in range(5)
        }
        result = engine._calculate_data_quality(indicator_data)
        assert result["confidence_level"] == "high"

    def test_medium_confidence_at_50_percent_3_indicators(self):
        """Medium confidence: completeness >= 50 AND >= 3 indicators."""
        engine = _engine()
        # 3 indicators × 6 data points each → 18/(3*12)=50%
        indicator_data = {
            f"IND-{i:03d}": {"count": 6, "trend": "stable"}
            for i in range(3)
        }
        result = engine._calculate_data_quality(indicator_data)
        assert result["confidence_level"] in ("medium", "high")

    def test_very_low_confidence_at_minimal_data(self):
        """Very low confidence: completeness < 20%."""
        engine = _engine()
        # 1 indicator, 1 data point → 1/12 = ~8.3%
        indicator_data = {
            "ENV-001": {"count": 1, "trend": "insufficient_data"},
        }
        result = engine._calculate_data_quality(indicator_data)
        assert result["confidence_level"] in ("very_low", "low")

    def test_indicators_with_trend_count(self):
        """Count of indicators that have a valid trend (not insufficient/unknown)."""
        engine = _engine()
        indicator_data = {
            "IND-001": {"count": 3, "trend": "improving"},
            "IND-002": {"count": 3, "trend": "declining"},
            "IND-003": {"count": 1, "trend": "insufficient_data"},
            "IND-004": {"count": 3, "trend": "unknown"},
        }
        result = engine._calculate_data_quality(indicator_data)
        # IND-001 and IND-002 have valid trends
        assert result["indicators_with_trend"] == 2

    def test_total_indicators_count(self):
        engine = _engine()
        indicator_data = {f"X-{i}": {"count": 1, "trend": "stable"} for i in range(7)}
        result = engine._calculate_data_quality(indicator_data)
        assert result["indicators_total"] == 7


# ===========================================================================
# _normalize_value
# ===========================================================================

class TestNormalizeValue:
    """Tests for the 0-100 normalisation method with BENCHMARK_RANGES."""

    def test_value_at_min_higher_is_better_returns_0(self):
        """Value at benchmark min → score = 0 (worst performance, higher_is_better=True)."""
        engine = _engine()
        # ENV-001: min=0, max=2000, higher_is_better=False (lower emissions = better)
        # Use GOV-001 (higher_is_better=True): min=0, max=100
        result = engine._normalize_value(0.0, "GOV-001", higher_is_better=True)
        assert result == 0.0

    def test_value_at_max_higher_is_better_returns_100(self):
        """Value at benchmark max → score = 100 (best performance)."""
        engine = _engine()
        result = engine._normalize_value(100.0, "GOV-001", higher_is_better=True)
        assert result == 100.0

    def test_midpoint_value_returns_50(self):
        """Value exactly at midpoint of range → score = 50."""
        engine = _engine()
        # GOV-001: min=0, max=100 → midpoint=50
        result = engine._normalize_value(50.0, "GOV-001", higher_is_better=True)
        assert abs(result - 50.0) < 0.01

    def test_lower_is_better_inverts_score(self):
        """For indicators where lower_is_better, max value → score = 0."""
        engine = _engine()
        # ENV-001 (carbon emissions): lower is better → at max (2000) score should be 0
        result = engine._normalize_value(2000.0, "ENV-001", higher_is_better=False)
        assert result == 0.0

    def test_lower_is_better_at_zero_gives_100(self):
        """Zero emissions → perfect score = 100."""
        engine = _engine()
        result = engine._normalize_value(0.0, "ENV-001", higher_is_better=False)
        assert result == 100.0

    def test_value_below_min_clamped(self):
        """Value below benchmark min is clamped, not negative."""
        engine = _engine()
        result = engine._normalize_value(-100.0, "GOV-001", higher_is_better=True)
        assert result >= 0.0

    def test_value_above_max_clamped_at_100(self):
        """Value above benchmark max is clamped at 100 (or 0 for lower_is_better)."""
        engine = _engine()
        result = engine._normalize_value(99999.0, "GOV-001", higher_is_better=True)
        assert result <= 100.0

    def test_unknown_indicator_defaults_to_min0_max100(self):
        """Unknown indicator code → default range 0-100, passthrough."""
        engine = _engine()
        result = engine._normalize_value(75.0, "UNKNOWN-CODE", higher_is_better=True)
        assert abs(result - 75.0) < 0.01

    def test_all_benchmark_range_indicators_are_normalised(self):
        """Every code in BENCHMARK_RANGES must normalise to [0, 100]."""
        engine = _engine()
        for code, bm in engine.BENCHMARK_RANGES.items():
            mid = (bm["min"] + bm["max"]) / 2.0
            higher = engine.INDICATOR_DIRECTION.get(code, True)
            result = engine._normalize_value(mid, code, higher_is_better=higher)
            assert 0.0 <= result <= 100.0, f"Out of range for {code}: {result}"

    def test_env004_renewable_higher_is_better(self):
        """ENV-004 (renewable energy %) — higher is better."""
        engine = _engine()
        low = engine._normalize_value(0.0, "ENV-004", higher_is_better=True)
        high = engine._normalize_value(100.0, "ENV-004", higher_is_better=True)
        assert high > low

    def test_soc003_turnover_lower_is_better(self):
        """SOC-003 (turnover %) — lower turnover is better score."""
        engine = _engine()
        low_turnover = engine._normalize_value(0.0, "SOC-003", higher_is_better=False)
        high_turnover = engine._normalize_value(30.0, "SOC-003", higher_is_better=False)
        assert low_turnover > high_turnover


# ===========================================================================
# _calculate_indicator_trend
# ===========================================================================

class TestCalculateIndicatorTrend:
    """Tests for the trend direction calculation."""

    def test_fewer_than_3_values_returns_insufficient_data(self):
        engine = _engine()
        for values in ([], [1.0], [1.0, 2.0]):
            result = engine._calculate_indicator_trend(values, "GOV-001")
            assert result == "insufficient_data", f"Expected insufficient for {values}"

    def test_stable_trend_small_change(self):
        """Less than 5% change between recent and previous → stable."""
        engine = _engine()
        # recent avg ≈ 100, previous ≈ 101.5 → < 5% change
        values = [100.0, 100.0, 100.0, 101.0, 102.0, 103.0]
        result = engine._calculate_indicator_trend(values, "GOV-001")
        assert result == "stable"

    def test_improving_higher_is_better_value_increases(self):
        """Value increases for higher_is_better indicator → improving."""
        engine = _engine()
        # recent (first 3) > previous (last 3)
        values = [80.0, 80.0, 80.0, 50.0, 50.0, 50.0]
        result = engine._calculate_indicator_trend(values, "GOV-001")  # higher_is_better
        assert result == "improving"

    def test_declining_higher_is_better_value_decreases(self):
        """Value decreases for higher_is_better indicator → declining."""
        engine = _engine()
        values = [40.0, 40.0, 40.0, 80.0, 80.0, 80.0]
        result = engine._calculate_indicator_trend(values, "GOV-001")
        assert result == "declining"

    def test_lower_is_better_value_decreasing_is_improving(self):
        """For lower_is_better (e.g. emissions), recent < previous → improving."""
        engine = _engine()
        # Recent avg drops from 80 to 40 → emissions going down = improving
        values = [40.0, 40.0, 40.0, 80.0, 80.0, 80.0]
        result = engine._calculate_indicator_trend(values, "ENV-001")  # lower_is_better
        assert result == "improving"

    def test_lower_is_better_value_increasing_is_declining(self):
        """Emissions going up → declining."""
        engine = _engine()
        values = [80.0, 80.0, 80.0, 40.0, 40.0, 40.0]
        result = engine._calculate_indicator_trend(values, "ENV-001")
        assert result == "declining"

    def test_previous_zero_returns_stable(self):
        """Previous avg = 0 → guard against zero division → stable."""
        engine = _engine()
        values = [10.0, 10.0, 10.0, 0.0, 0.0, 0.0]
        result = engine._calculate_indicator_trend(values, "GOV-001")
        assert result == "stable"

    def test_returns_string(self):
        engine = _engine()
        result = engine._calculate_indicator_trend([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], "GOV-001")
        assert isinstance(result, str)


# ===========================================================================
# _calculate_overall_score
# ===========================================================================

class TestCalculateOverallScore:
    """Tests for the overall score aggregation."""

    def test_equal_weights_and_equal_pillar_scores(self):
        """33.33% each, all pillars = 60 → overall ≈ 60."""
        engine = _engine()
        pillar_scores = {"environmental": 60.0, "social": 60.0, "governance": 60.0}
        weights = {"environmental_weight": 33.33, "social_weight": 33.33, "governance_weight": 33.34}
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert abs(result - 60.0) < 0.1

    def test_zero_pillar_scores_give_zero_overall(self):
        engine = _engine()
        pillar_scores = {"environmental": 0.0, "social": 0.0, "governance": 0.0}
        weights = {"environmental_weight": 40.0, "social_weight": 35.0, "governance_weight": 25.0}
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert result == 0.0

    def test_perfect_pillar_scores_give_perfect_overall(self):
        """100 on all pillars → 100 overall."""
        engine = _engine()
        pillar_scores = {"environmental": 100.0, "social": 100.0, "governance": 100.0}
        weights = {"environmental_weight": 40.0, "social_weight": 35.0, "governance_weight": 25.0}
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert abs(result - 100.0) < 0.01

    def test_weighted_calculation_is_correct(self):
        """Verify the exact arithmetic: 70*0.4 + 60*0.35 + 80*0.25 = 70.0."""
        engine = _engine()
        pillar_scores = {"environmental": 70.0, "social": 60.0, "governance": 80.0}
        weights = {"environmental_weight": 40.0, "social_weight": 35.0, "governance_weight": 25.0}
        result = engine._calculate_overall_score(pillar_scores, weights)
        expected = (70.0 * 40.0 + 60.0 * 35.0 + 80.0 * 25.0) / 100.0
        assert abs(result - expected) < 0.01

    def test_returns_float(self):
        engine = _engine()
        pillar_scores = {"environmental": 50.0, "social": 50.0, "governance": 50.0}
        weights = {"environmental_weight": 33.33, "social_weight": 33.33, "governance_weight": 33.34}
        result = engine._calculate_overall_score(pillar_scores, weights)
        assert isinstance(result, float)


# ===========================================================================
# _calculate_rating (boundary tests)
# ===========================================================================

class TestCalculateRatingBoundaries:
    """Tests for all rating boundary values."""

    @pytest.mark.parametrize("score,expected_rating", [
        (100.0, "AAA"),
        (85.0, "AAA"),
        (84.9, "AA"),
        (75.0, "AA"),
        (74.9, "A"),
        (65.0, "A"),
        (64.9, "BBB"),
        (55.0, "BBB"),
        (54.9, "BB"),
        (45.0, "BB"),
        (44.9, "B"),
        (35.0, "B"),
        (34.9, "CCC"),
        (25.0, "CCC"),
        (24.9, "CC"),
        (15.0, "CC"),
        (14.9, "C"),
        (0.0, "C"),
    ])
    def test_rating_boundary(self, score, expected_rating):
        engine = _engine()
        result = engine._calculate_rating(score)
        assert result == expected_rating, f"score={score}: expected {expected_rating}, got {result}"

    def test_rating_returns_string(self):
        engine = _engine()
        assert isinstance(engine._calculate_rating(50.0), str)

    def test_all_possible_ratings_are_valid(self):
        """Every returned rating must be one of the 9 standard ESG ratings."""
        engine = _engine()
        valid_ratings = {"AAA", "AA", "A", "BBB", "BB", "B", "CCC", "CC", "C"}
        for score in range(0, 101, 5):
            rating = engine._calculate_rating(float(score))
            assert rating in valid_ratings, f"Invalid rating {rating!r} for score={score}"
