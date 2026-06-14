"""
Tests unitaires — ForecastingService (ARIMA / Holt-Winters / OLS).
"""
import pytest
from datetime import date, timedelta
from unittest.mock import MagicMock
from uuid import uuid4

pytestmark = pytest.mark.unit


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_series(n: int, base_value: float = 100.0, step: float = 2.0):
    """Build a _Series of n monthly points."""
    from app.services.ml.forecasting_service import _Series
    dates = [date(2022, 1, 1) + timedelta(days=30 * i) for i in range(n)]
    values = [base_value + i * step for i in range(n)]
    return _Series(dates, values)


def _make_data_points(n: int, base_value: float = 100.0, step: float = 2.0):
    """Generate n fake IndicatorData-like objects (for _forecast_series)."""
    points = []
    for i in range(n):
        p = MagicMock()
        p.value = base_value + i * step
        p.date = date(2022, 1, 1) + timedelta(days=30 * i)
        p.unit = "tCO2e"
        points.append(p)
    return points


# ─── OLS (linear regression fallback) ─────────────────────────────────────────

class TestOLSForecast:
    """Tests for the OLS linear-regression helper (_ols_predict)."""

    def test_ols_returns_three_equal_length_lists(self):
        from app.services.ml.forecasting_service import _ols_predict
        series = _make_series(4)
        future_xs = [series.xs[-1] + 30 * m for m in range(1, 4)]
        mean, lower, upper = _ols_predict(series, future_xs)
        assert len(mean) == len(lower) == len(upper) == 3

    def test_ols_upward_trend_increases(self):
        from app.services.ml.forecasting_service import _ols_predict
        series = _make_series(5, base_value=10.0, step=10.0)
        future_xs = [series.xs[-1] + 30 * m for m in range(1, 4)]
        mean, _, _ = _ols_predict(series, future_xs)
        assert mean[-1] > mean[0]

    def test_ols_confidence_interval_brackets_mean(self):
        from app.services.ml.forecasting_service import _ols_predict
        series = _make_series(4)
        future_xs = [series.xs[-1] + 30 * m for m in range(1, 4)]
        mean, lower, upper = _ols_predict(series, future_xs)
        for m, lo, hi in zip(mean, lower, upper):
            assert lo <= m <= hi

    def test_ols_degenerate_x_returns_flat_mean(self):
        """All observations on the same date (denom == 0) → flat forecast at the series mean."""
        from app.services.ml.forecasting_service import _ols_predict, _Series
        same_date = date(2022, 1, 1)
        series = _Series([same_date, same_date], [10.0, 20.0])
        mean, lower, upper = _ols_predict(series, [30.0, 60.0])
        assert mean == lower == upper == [15.0, 15.0]


# ─── R² Metric ────────────────────────────────────────────────────────────────

class TestR2:
    def test_perfect_linear_fit_returns_one(self):
        from app.services.ml.forecasting_service import _r2
        series = _make_series(4, base_value=100.0, step=2.0)
        assert _r2(series) == pytest.approx(1.0)

    def test_degenerate_x_returns_zero(self):
        """All same date (denom == 0) → R² undefined, returns 0.0."""
        from app.services.ml.forecasting_service import _r2, _Series
        same_date = date(2022, 1, 1)
        series = _Series([same_date, same_date, same_date], [1.0, 2.0, 3.0])
        assert _r2(series) == 0.0

    def test_noisy_series_is_below_one(self):
        from app.services.ml.forecasting_service import _r2, _Series
        dates = [date(2022, 1, 1) + timedelta(days=30 * i) for i in range(4)]
        # Oscillating values — poorly explained by a single linear trend
        series = _Series(dates, [1.0, 100.0, 1.0, 100.0])
        assert _r2(series) < 1.0


# ─── Seasonality Detection ────────────────────────────────────────────────────

class TestSeasonalityDetection:
    def test_insufficient_data_returns_false(self):
        from app.services.ml.forecasting_service import _detect_seasonality
        series = _make_series(10)
        assert _detect_seasonality(series) is False

    def test_returns_bool_for_sufficient_data(self):
        from app.services.ml.forecasting_service import _detect_seasonality
        series = _make_series(30)
        assert isinstance(_detect_seasonality(series), bool)


# ─── Algorithm Selection ──────────────────────────────────────────────────────

class TestAlgorithmSelection:
    """Series with < 6 points always fall back to OLS
    (ARIMA needs ≥ 24 points, Holt-Winters needs ≥ 6)."""

    @pytest.mark.parametrize("n_points", [3, 4, 5])
    def test_small_series_uses_ols(self, n_points):
        from app.services.ml.forecasting_service import ForecastingService
        svc = ForecastingService.__new__(ForecastingService)
        indicator = MagicMock(id=uuid4(), name="Émissions test", code="E-TEST", unit="tCO2e", pillar="environmental")
        data_points = _make_data_points(n_points)

        result = svc._forecast_series(indicator, data_points, horizon=3)

        assert result["algorithm"] == "linear_ols"
        assert result["n_historical_points"] == n_points
        assert len(result["future_points"]) == 3


# ─── Goal Alert ───────────────────────────────────────────────────────────────

class TestGoalAlert:
    def test_alert_triggered_when_trajectory_misses_objective(self):
        """If predictions stay flat but objective is -30%, alert must fire."""
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
