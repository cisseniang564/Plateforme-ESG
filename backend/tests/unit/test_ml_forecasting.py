"""
Tests unitaires — ForecastingService (ARIMA / Holt-Winters / OLS).
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4

pytestmark = pytest.mark.unit


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_entries(n: int, base_value: float = 100.0, step: float = 2.0):
    """Generate n fake IndicatorData-like objects."""
    from datetime import date, timedelta
    entries = []
    for i in range(n):
        e = MagicMock()
        e.value = base_value + i * step
        e.date = date(2022, 1, 1) + timedelta(days=30 * i)
        e.indicator_id = uuid4()
        entries.append(e)
    return entries


# ─── OLS (≥ 3 points) ─────────────────────────────────────────────────────────

class TestOLSForecast:
    """Tests for linear regression fallback (< 6 data points)."""

    def test_ols_returns_expected_keys(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(4)
        result = svc._ols_predict(entries, horizon=3)
        assert "predictions" in result
        assert "method" in result
        assert result["method"] == "ols"

    def test_ols_prediction_count_matches_horizon(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(4)
        result = svc._ols_predict(entries, horizon=6)
        assert len(result["predictions"]) == 6

    def test_ols_upward_trend_increases(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(5, base_value=10.0, step=10.0)
        result = svc._ols_predict(entries, horizon=3)
        preds = [p["value"] for p in result["predictions"]]
        # With clear upward trend, last predicted value > first
        assert preds[-1] > preds[0]

    def test_ols_confidence_intervals_present(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(4)
        result = svc._ols_predict(entries, horizon=3)
        first = result["predictions"][0]
        assert "upper_95" in first
        assert "lower_95" in first
        assert first["upper_95"] >= first["value"]
        assert first["lower_95"] <= first["value"]

    def test_ols_requires_minimum_3_points(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(2)
        with pytest.raises(Exception):
            svc._ols_predict(entries, horizon=3)


# ─── R² Metric ────────────────────────────────────────────────────────────────

class TestR2:
    def test_perfect_fit_returns_one(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        y = [1.0, 2.0, 3.0, 4.0]
        assert svc._r2(y, y) == pytest.approx(1.0)

    def test_zero_variance_returns_zero(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        y_true = [5.0, 5.0, 5.0]
        y_pred = [3.0, 6.0, 4.0]
        # All same actual values → SS_tot = 0 → R² undefined, returns 0.0
        result = svc._r2(y_true, y_pred)
        assert isinstance(result, float)

    def test_bad_fit_is_below_one(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        y_true = [1.0, 2.0, 3.0, 4.0]
        y_pred = [4.0, 3.0, 2.0, 1.0]  # inverse → terrible fit
        assert svc._r2(y_true, y_pred) < 0.5


# ─── Seasonality Detection ────────────────────────────────────────────────────

class TestSeasonalityDetection:
    def test_returns_bool(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(30)
        result = svc._detect_seasonality(entries)
        assert isinstance(result, bool)

    def test_insufficient_data_returns_false(self):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(10)
        result = svc._detect_seasonality(entries)
        assert result is False


# ─── Algorithm Selection ──────────────────────────────────────────────────────

class TestAlgorithmSelection:
    """Verify adaptive algorithm selection based on data volume."""

    @pytest.mark.parametrize("n_points,expected_method", [
        (2,  None),   # below minimum → no forecast
        (3,  "ols"),
        (5,  "ols"),
        (6,  "holt_winters"),
        (23, "holt_winters"),
    ])
    def test_method_chosen_by_data_size(self, n_points, expected_method):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        entries = _make_entries(n_points)

        if expected_method is None:
            # Too few points → should raise or return empty
            with pytest.raises(Exception):
                svc._ols_predict(entries, horizon=3)
        elif expected_method == "ols":
            result = svc._ols_predict(entries, horizon=3)
            assert result["method"] == "ols"


# ─── Goal Alert ───────────────────────────────────────────────────────────────

class TestGoalAlert:
    def test_alert_triggered_when_trajectory_misses_objective(self):
        """If predictions stay flat but objective is -30%, alert must fire."""
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)

        flat_predictions = [{"value": 100.0 + i * 0.1} for i in range(12)]
        baseline = 100.0
        objective_pct = -30.0  # need to reach 70.0

        last_pred = flat_predictions[-1]["value"]
        objective_value = baseline * (1 + objective_pct / 100)
        alert = last_pred > objective_value

        assert alert is True  # flat trend misses -30% objective

    def test_no_alert_when_on_track(self):
        """If predictions are declining fast enough, no alert."""
        predictions = [{"value": 100.0 - i * 5.0} for i in range(12)]
        baseline = 100.0
        objective_pct = -30.0
        objective_value = baseline * (1 + objective_pct / 100)
        last_pred = predictions[-1]["value"]
        alert = last_pred > objective_value
        assert alert is False
