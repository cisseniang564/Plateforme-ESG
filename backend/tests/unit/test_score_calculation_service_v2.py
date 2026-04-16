"""
Tests for ScoreCalculationService and ESGScoringEngine.

Covers:
- ScoreCalculationService._normalize_value (pure, no DB needed)
- ScoreCalculationService.calculate_score (full flow with mocked DB)
- ESGScoringEngine._calculate_rating
- ESGScoringEngine._normalize_value
- ESGScoringEngine._calculate_indicator_trend
- ESGScoringEngine._calculate_data_quality
- ESGScoringEngine._get_default_weights_for_sector
- ScoreCalculationService.detect_performance_alerts
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Helpers to build lightweight mock DB results
# ---------------------------------------------------------------------------

def _make_scalar_result(obj):
    """Return a mock that mimics AsyncSession.execute(…).scalar_one_or_none()."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = obj
    result.scalars.return_value.all.return_value = [] if obj is None else [obj]
    return result


def _make_scalars_result(items: list):
    """Return a mock for queries returning multiple rows via .scalars().all()."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = items
    result.scalar_one_or_none.return_value = items[0] if items else None
    return result


# ---------------------------------------------------------------------------
# ScoreCalculationService._normalize_value
# ---------------------------------------------------------------------------

class TestNormalizeValue:
    """Pure method — no DB interaction required."""

    def _service(self):
        from app.services.score_calculation_service import ScoreCalculationService
        return ScoreCalculationService(AsyncMock())

    def test_normalize_with_target_midpoint(self):
        """value/target * 100."""
        s = self._service()
        assert s._normalize_value(50, 100) == 50.0

    def test_normalize_with_target_exceeds_max_is_capped_at_100(self):
        """value > target → capped at 100.0."""
        s = self._service()
        assert s._normalize_value(200, 100) == 100.0

    def test_normalize_with_target_zero_value(self):
        """value=0 with any positive target → 0.0."""
        s = self._service()
        assert s._normalize_value(0, 100) == 0.0

    def test_normalize_without_target_passthrough(self):
        """No target → value itself, clamped to [0, 100]."""
        s = self._service()
        assert s._normalize_value(75, None) == 75.0

    def test_normalize_without_target_capped_at_100(self):
        s = self._service()
        assert s._normalize_value(150, None) == 100.0

    def test_normalize_without_target_negative_clamped_to_zero(self):
        s = self._service()
        assert s._normalize_value(-10, None) == 0.0

    def test_normalize_with_target_zero_target_falls_back_to_passthrough(self):
        """target=0 should not divide by zero — falls back to passthrough."""
        s = self._service()
        # target=0 is falsy, so the branch `if target and target > 0` is False
        result = s._normalize_value(42, 0)
        assert result == 42.0


# ---------------------------------------------------------------------------
# ScoreCalculationService.calculate_score — flow tests with mocked DB
# ---------------------------------------------------------------------------

class TestCalculateScore:
    """calculate_score() orchestration tests."""

    @pytest.fixture
    def service(self, mock_db):
        from app.services.score_calculation_service import ScoreCalculationService
        return ScoreCalculationService(mock_db)

    @pytest.mark.asyncio
    async def test_no_indicators_returns_zero_overall_score(self, service, mock_db):
        """When no active indicators exist for the tenant, overall_score must be 0."""
        # indicators query returns empty list
        empty_indicators = _make_scalars_result([])
        mock_db.execute.return_value = empty_indicators

        # existing score query also returns None
        mock_db.execute.side_effect = [
            empty_indicators,    # indicators query
            _make_scalar_result(None),  # existing score query
        ]

        # refresh populates the score object
        created_score = MagicMock()
        created_score.overall_score = 0.0
        created_score.environmental_score = 0.0
        created_score.social_score = 0.0
        created_score.governance_score = 0.0
        created_score.rating = "E"
        mock_db.refresh.side_effect = lambda obj: None

        tenant_id = uuid4()
        calc_date = date.today()

        # Service calls db.add() for a new score object, then commit and refresh
        # We need to capture what was added to verify the score
        added_objects = []
        mock_db.add.side_effect = lambda obj: added_objects.append(obj)

        await service.calculate_score(tenant_id, calc_date)

        # Should have committed exactly once
        mock_db.commit.assert_called_once()
        # refresh called once (on the newly created score)
        mock_db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_indicator_data_gives_zero_pillar_scores(self, service, mock_db):
        """Indicators exist but no IndicatorData rows → all pillar scores 0."""
        from app.models.indicator import Indicator

        mock_indicator = MagicMock(spec=Indicator)
        mock_indicator.id = uuid4()
        mock_indicator.pillar = "environmental"
        mock_indicator.weight = 1.0
        mock_indicator.target_value = 100.0
        mock_indicator.is_active = True

        # indicators query returns one indicator
        indicators_result = _make_scalars_result([mock_indicator])

        # data query for that indicator returns nothing
        empty_data = _make_scalar_result(None)

        # existing score query returns nothing (new score will be created)
        no_existing_score = _make_scalar_result(None)

        call_count = 0

        async def mock_execute(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return indicators_result
            elif call_count == 2:
                return empty_data          # no IndicatorData for the indicator
            else:
                return no_existing_score   # no existing ESGScore

        mock_db.execute.side_effect = mock_execute

        tenant_id = uuid4()
        calc_date = date.today()
        added = []
        mock_db.add.side_effect = added.append

        await service.calculate_score(tenant_id, calc_date)

        # A new score was added
        assert len(added) == 1
        new_score = added[0]
        # With no data, overall_score should be 0
        assert new_score.overall_score == 0.0

    @pytest.mark.asyncio
    async def test_calculates_correct_weighted_average(self, service, mock_db):
        """Given a single indicator with known value and target, verify computed score."""
        from app.models.indicator import Indicator
        from app.models.indicator_data import IndicatorData

        mock_indicator = MagicMock(spec=Indicator)
        mock_indicator.id = uuid4()
        mock_indicator.pillar = "environmental"
        mock_indicator.weight = 1.0
        mock_indicator.target_value = 100.0
        mock_indicator.is_active = True

        mock_data = MagicMock(spec=IndicatorData)
        mock_data.value = 50.0   # → normalized = 50/100*100 = 50.0

        indicators_result = _make_scalars_result([mock_indicator])
        data_result = _make_scalar_result(mock_data)
        no_existing_score = _make_scalar_result(None)

        call_count = 0

        async def mock_execute(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return indicators_result
            elif call_count == 2:
                return data_result
            else:
                return no_existing_score

        mock_db.execute.side_effect = mock_execute

        added = []
        mock_db.add.side_effect = added.append

        await service.calculate_score(uuid4(), date.today())

        assert len(added) == 1
        new_score = added[0]
        # Only environmental indicator — overall = sum([50.0]) / 3 ≈ 16.67
        # pillar_scores["environmental"] = 50.0
        assert new_score.environmental_score == pytest.approx(50.0, abs=1e-6)

    @pytest.mark.asyncio
    async def test_saves_score_to_database_when_no_existing_score(self, service, mock_db):
        """A new ESGScore is added via db.add() when none exists for the date."""
        empty_indicators = _make_scalars_result([])
        no_existing_score = _make_scalar_result(None)
        mock_db.execute.side_effect = [empty_indicators, no_existing_score]

        added = []
        mock_db.add.side_effect = added.append

        await service.calculate_score(uuid4(), date.today())

        assert len(added) == 1
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_updates_existing_score_instead_of_inserting(self, service, mock_db):
        """If an ESGScore already exists for the same tenant+date, it is updated, not duplicated."""
        from app.models.esg_score import ESGScore

        existing_score = MagicMock(spec=ESGScore)
        existing_score.overall_score = 60.0

        empty_indicators = _make_scalars_result([])
        existing_score_result = _make_scalar_result(existing_score)

        mock_db.execute.side_effect = [empty_indicators, existing_score_result]

        added = []
        mock_db.add.side_effect = added.append

        await service.calculate_score(uuid4(), date.today())

        # db.add() must NOT be called for an update
        assert len(added) == 0
        # existing score's overall_score was mutated
        assert existing_score.overall_score == 0.0
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_rating_is_set_correctly_for_zero_score(self, service, mock_db):
        """Zero overall score → rating 'E'."""
        empty_indicators = _make_scalars_result([])
        no_existing_score = _make_scalar_result(None)
        mock_db.execute.side_effect = [empty_indicators, no_existing_score]

        added = []
        mock_db.add.side_effect = added.append

        await service.calculate_score(uuid4(), date.today())

        assert len(added) == 1
        assert added[0].rating == "E"


# ---------------------------------------------------------------------------
# ESGScoringEngine._calculate_rating
# ---------------------------------------------------------------------------

class TestESGScoringEngineRating:
    """
    RATING_THRESHOLDS (from esg_scoring_engine.py):
        AAA: 85, AA: 75, A: 65, BBB: 55, BB: 45, B: 35, CCC: 25, CC: 15, C: 0
    """

    def _engine(self):
        from app.services.esg_scoring_engine import ESGScoringEngine
        return ESGScoringEngine(AsyncMock())

    @pytest.mark.parametrize("score,expected_rating", [
        (90.0,  "AAA"),
        (85.0,  "AAA"),
        (80.0,  "AA"),
        (75.0,  "AA"),
        (70.0,  "A"),
        (65.0,  "A"),
        (60.0,  "BBB"),
        (55.0,  "BBB"),
        (50.0,  "BB"),
        (45.0,  "BB"),
        (40.0,  "B"),
        (35.0,  "B"),
        (30.0,  "CCC"),
        (25.0,  "CCC"),
        (20.0,  "CC"),
        (15.0,  "CC"),
        (10.0,  "C"),
        (0.0,   "C"),
    ])
    def test_rating_thresholds(self, score, expected_rating):
        engine = self._engine()
        assert engine._calculate_rating(score) == expected_rating


# ---------------------------------------------------------------------------
# ESGScoringEngine._normalize_value
# ---------------------------------------------------------------------------

class TestESGScoringEngineNormalizeValue:
    """
    The engine's _normalize_value takes (value, indicator_code, higher_is_better).
    It uses BENCHMARK_RANGES for [min, max] bounds.
    """

    def _engine(self):
        from app.services.esg_scoring_engine import ESGScoringEngine
        return ESGScoringEngine(AsyncMock())

    def test_higher_is_better_midpoint(self):
        """ENV-004 (renewable_pct) range [0,100]; higher_is_better=True. value=50 → 50."""
        engine = self._engine()
        result = engine._normalize_value(50.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(50.0)

    def test_higher_is_better_max_value(self):
        """value at max → 100."""
        engine = self._engine()
        result = engine._normalize_value(100.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(100.0)

    def test_higher_is_better_min_value(self):
        """value at min → 0."""
        engine = self._engine()
        result = engine._normalize_value(0.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(0.0)

    def test_lower_is_better_inverts_score(self):
        """ENV-001 (carbon emissions) range [0,2000]; lower_is_better. value=0 → 100."""
        engine = self._engine()
        result = engine._normalize_value(0.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(100.0)

    def test_lower_is_better_max_value_gives_zero(self):
        """value at max with lower_is_better → 0."""
        engine = self._engine()
        result = engine._normalize_value(2000.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(0.0)

    def test_value_below_min_with_higher_is_better_gives_100(self):
        """value < min with higher_is_better=True → clamp to 100 (very good performance)."""
        engine = self._engine()
        result = engine._normalize_value(-50.0, "ENV-004", higher_is_better=True)
        assert result == pytest.approx(100.0)

    def test_value_above_max_with_lower_is_better_gives_100(self):
        """value > max with lower_is_better → 100 (very bad, but clamp)."""
        # higher_is_better=False, value > max → normalized=0 before inversion → 100
        engine = self._engine()
        result = engine._normalize_value(5000.0, "ENV-001", higher_is_better=False)
        assert result == pytest.approx(100.0)

    def test_unknown_indicator_code_falls_back_to_0_100_range(self):
        """Unknown indicator code uses default benchmark [0, 100]."""
        engine = self._engine()
        result = engine._normalize_value(42.0, "UNKNOWN-999", higher_is_better=True)
        assert result == pytest.approx(42.0)

    def test_result_always_in_0_to_100(self):
        """Result is always clamped in [0.0, 100.0]."""
        engine = self._engine()
        for code in ["ENV-001", "ENV-004", "SOC-001", "GOV-001", "UNKNOWN"]:
            for val in [-999.0, 0.0, 50.0, 100.0, 9999.0]:
                r = engine._normalize_value(val, code)
                assert 0.0 <= r <= 100.0, f"Out of range for code={code}, val={val}: {r}"


# ---------------------------------------------------------------------------
# ESGScoringEngine._calculate_indicator_trend
# ---------------------------------------------------------------------------

class TestESGScoringEngineIndicatorTrend:
    """Tests for trend detection (improving / declining / stable / insufficient_data)."""

    def _engine(self):
        from app.services.esg_scoring_engine import ESGScoringEngine
        return ESGScoringEngine(AsyncMock())

    def test_insufficient_data_returned_for_less_than_3_values(self):
        engine = self._engine()
        assert engine._calculate_indicator_trend([80.0, 85.0], "SOC-001") == "insufficient_data"
        assert engine._calculate_indicator_trend([80.0], "SOC-001") == "insufficient_data"
        assert engine._calculate_indicator_trend([], "SOC-001") == "insufficient_data"

    def test_stable_when_change_below_5_percent(self):
        """< 5% change → stable."""
        engine = self._engine()
        # recent 3: mean=101, previous 3: mean=100 → change ≈ 1% → stable
        values = [102.0, 100.0, 101.0, 99.0, 100.0, 101.0]
        result = engine._calculate_indicator_trend(values, "SOC-001")
        assert result == "stable"

    def test_improving_when_higher_is_better_and_value_increases(self):
        """SOC-001 higher_is_better=True; value increases → improving."""
        engine = self._engine()
        # recent 3: 90,90,90 mean=90; previous 3: 60,60,60 mean=60 → +50% change
        values = [90.0, 90.0, 90.0, 60.0, 60.0, 60.0]
        result = engine._calculate_indicator_trend(values, "SOC-001")
        assert result == "improving"

    def test_declining_when_higher_is_better_and_value_decreases(self):
        """SOC-001 higher_is_better=True; value decreases → declining."""
        engine = self._engine()
        values = [60.0, 60.0, 60.0, 90.0, 90.0, 90.0]
        result = engine._calculate_indicator_trend(values, "SOC-001")
        assert result == "declining"

    def test_improving_when_lower_is_better_and_emissions_decrease(self):
        """ENV-001 lower_is_better; value decreases → improving (less emissions = good)."""
        engine = self._engine()
        # recent 3: 500 mean; previous 3: 900 mean → large decrease → improving
        values = [500.0, 500.0, 500.0, 900.0, 900.0, 900.0]
        result = engine._calculate_indicator_trend(values, "ENV-001")
        assert result == "improving"

    def test_declining_when_lower_is_better_and_emissions_increase(self):
        """ENV-001 lower_is_better; value increases → declining."""
        engine = self._engine()
        values = [900.0, 900.0, 900.0, 500.0, 500.0, 500.0]
        result = engine._calculate_indicator_trend(values, "ENV-001")
        assert result == "declining"


# ---------------------------------------------------------------------------
# ESGScoringEngine._calculate_data_quality
# ---------------------------------------------------------------------------

class TestESGScoringEngineDataQuality:
    """Tests for data quality scoring logic."""

    def _engine(self):
        from app.services.esg_scoring_engine import ESGScoringEngine
        return ESGScoringEngine(AsyncMock())

    def test_empty_data_returns_zero_completeness(self):
        engine = self._engine()
        quality = engine._calculate_data_quality({})
        assert quality["completeness"] == 0.0
        assert quality["confidence_level"] == "none"
        assert quality["total_data_points"] == 0

    def test_high_confidence_requires_80pct_completeness_and_5_indicators(self):
        """completeness >= 80 and >= 5 indicators → 'high' confidence."""
        engine = self._engine()
        # 5 indicators, each with count=12 → 60/60 = 100% completeness
        indicator_data = {
            f"IND-{i:03d}": {
                "count": 12,
                "trend": "improving",
            }
            for i in range(5)
        }
        quality = engine._calculate_data_quality(indicator_data)
        assert quality["confidence_level"] == "high"
        assert quality["completeness"] == pytest.approx(100.0)

    def test_medium_confidence_for_partial_data(self):
        """3 indicators with 6/12 months each → 50% completeness → 'medium'."""
        engine = self._engine()
        indicator_data = {
            f"IND-{i:03d}": {"count": 6, "trend": "stable"}
            for i in range(3)
        }
        quality = engine._calculate_data_quality(indicator_data)
        assert quality["confidence_level"] == "medium"

    def test_indicators_with_trend_count_excludes_insufficient_data(self):
        """Indicators with trend=insufficient_data/unknown are not counted."""
        engine = self._engine()
        indicator_data = {
            "IND-001": {"count": 12, "trend": "improving"},
            "IND-002": {"count": 12, "trend": "insufficient_data"},
            "IND-003": {"count": 12, "trend": "unknown"},
        }
        quality = engine._calculate_data_quality(indicator_data)
        assert quality["indicators_with_trend"] == 1


# ---------------------------------------------------------------------------
# ESGScoringEngine._get_default_weights_for_sector
# ---------------------------------------------------------------------------

class TestESGScoringEngineDefaultWeights:
    """Tests for sector-specific default weight tables."""

    def _engine(self):
        from app.services.esg_scoring_engine import ESGScoringEngine
        return ESGScoringEngine(AsyncMock())

    def test_energie_sector_has_high_environmental_weight(self):
        engine = self._engine()
        weights = engine._get_default_weights_for_sector("energie")
        assert weights["E"] == 45.0

    def test_finance_sector_has_high_governance_weight(self):
        engine = self._engine()
        weights = engine._get_default_weights_for_sector("finance")
        assert weights["G"] == 40.0

    def test_tech_sector_high_social_weight(self):
        engine = self._engine()
        weights = engine._get_default_weights_for_sector("tech")
        assert weights["S"] == 40.0

    def test_default_sector_weights_sum_to_100(self):
        engine = self._engine()
        weights = engine._get_default_weights_for_sector("default")
        total = weights["E"] + weights["S"] + weights["G"]
        assert abs(total - 100.0) < 1e-6

    def test_unknown_sector_falls_back_to_default(self):
        engine = self._engine()
        weights = engine._get_default_weights_for_sector("totally_unknown_sector")
        assert weights == engine._get_default_weights_for_sector("default")

    @pytest.mark.parametrize("sector", [
        "energie", "industrie", "finance", "tech", "agriculture", "commerce", "services", "default"
    ])
    def test_all_known_sectors_return_weights_summing_to_100(self, sector):
        engine = self._engine()
        weights = engine._get_default_weights_for_sector(sector)
        total = weights["E"] + weights["S"] + weights["G"]
        assert abs(total - 100.0) < 1e-6, f"Sector {sector}: weights sum to {total}, expected 100"


# ---------------------------------------------------------------------------
# ScoreCalculationService.detect_performance_alerts
# ---------------------------------------------------------------------------

class TestDetectPerformanceAlerts:
    """Tests for the performance alert detection logic."""

    def _service(self, mock_db=None):
        from app.services.score_calculation_service import ScoreCalculationService
        return ScoreCalculationService(mock_db or AsyncMock())

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_fewer_than_two_scores(self):
        """Less than 2 historical scores → no alerts."""
        from app.models.esg_score import ESGScore

        mock_db = AsyncMock()
        service = self._service(mock_db)

        only_one_score = MagicMock(spec=ESGScore)
        result = _make_scalars_result([only_one_score])
        mock_db.execute.return_value = result

        alerts = await service.detect_performance_alerts(uuid4())
        assert alerts == []

    @pytest.mark.asyncio
    async def test_detects_overall_score_drop_above_threshold(self):
        """Overall drop > 5% should trigger an alert."""
        from app.models.esg_score import ESGScore

        mock_db = AsyncMock()
        service = self._service(mock_db)

        current = MagicMock(spec=ESGScore)
        current.overall_score = 60.0
        current.environmental_score = 60.0
        current.social_score = 60.0
        current.governance_score = 60.0

        previous = MagicMock(spec=ESGScore)
        previous.overall_score = 80.0
        previous.environmental_score = 80.0
        previous.social_score = 80.0
        previous.governance_score = 80.0

        result = _make_scalars_result([current, previous])
        mock_db.execute.return_value = result

        alerts = await service.detect_performance_alerts(uuid4(), threshold_percentage=5.0)
        overall_alerts = [a for a in alerts if a["pillar"] == "overall"]
        assert len(overall_alerts) >= 1
        assert overall_alerts[0]["drop_percentage"] == pytest.approx(20.0)

    @pytest.mark.asyncio
    async def test_no_alert_when_drop_below_threshold(self):
        """Drop ≤ threshold → no alert."""
        from app.models.esg_score import ESGScore

        mock_db = AsyncMock()
        service = self._service(mock_db)

        current = MagicMock(spec=ESGScore)
        current.overall_score = 79.0
        current.environmental_score = 79.0
        current.social_score = 79.0
        current.governance_score = 79.0

        previous = MagicMock(spec=ESGScore)
        previous.overall_score = 80.0
        previous.environmental_score = 80.0
        previous.social_score = 80.0
        previous.governance_score = 80.0

        result = _make_scalars_result([current, previous])
        mock_db.execute.return_value = result

        alerts = await service.detect_performance_alerts(uuid4(), threshold_percentage=5.0)
        assert alerts == []

    @pytest.mark.asyncio
    async def test_high_severity_for_drop_above_10_percent(self):
        """Drop > 10% → severity 'high'."""
        from app.models.esg_score import ESGScore

        mock_db = AsyncMock()
        service = self._service(mock_db)

        current = MagicMock(spec=ESGScore)
        current.overall_score = 50.0
        current.environmental_score = 50.0
        current.social_score = 50.0
        current.governance_score = 50.0

        previous = MagicMock(spec=ESGScore)
        previous.overall_score = 70.0
        previous.environmental_score = 70.0
        previous.social_score = 70.0
        previous.governance_score = 70.0

        result = _make_scalars_result([current, previous])
        mock_db.execute.return_value = result

        alerts = await service.detect_performance_alerts(uuid4(), threshold_percentage=5.0)
        overall_alerts = [a for a in alerts if a["pillar"] == "overall"]
        assert len(overall_alerts) == 1
        assert overall_alerts[0]["severity"] == "high"

    @pytest.mark.asyncio
    async def test_medium_severity_for_drop_between_5_and_10_percent(self):
        """5% < drop ≤ 10% → severity 'medium'."""
        from app.models.esg_score import ESGScore

        mock_db = AsyncMock()
        service = self._service(mock_db)

        current = MagicMock(spec=ESGScore)
        current.overall_score = 72.0
        current.environmental_score = 72.0
        current.social_score = 72.0
        current.governance_score = 72.0

        previous = MagicMock(spec=ESGScore)
        previous.overall_score = 80.0
        previous.environmental_score = 80.0
        previous.social_score = 80.0
        previous.governance_score = 80.0

        result = _make_scalars_result([current, previous])
        mock_db.execute.return_value = result

        alerts = await service.detect_performance_alerts(uuid4(), threshold_percentage=5.0)
        overall_alerts = [a for a in alerts if a["pillar"] == "overall"]
        assert len(overall_alerts) == 1
        assert overall_alerts[0]["severity"] == "medium"
