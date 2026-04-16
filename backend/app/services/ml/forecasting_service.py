"""
ML Forecasting Service — Prédiction des émissions futures
=========================================================
Algorithme adaptatif selon la quantité de données disponibles :
  • ≥ 24 points → ARIMA(1,1,1) via statsmodels (saisonnalité + tendance)
  • 6 – 23 pts  → Holt-Winters (lissage exponentiel)
  •  3 – 5 pts  → Régression linéaire OLS avec intervalles de prédiction
Retourne 12 mois de prédictions avec intervalles de confiance à 95 %
et déclenche une alerte si la projection dépasse l'objectif fixé.
"""
from __future__ import annotations

import logging
import math
import statistics
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.esg_score import ESGScore

logger = logging.getLogger(__name__)

# ── Lazy imports (ML libs may not be present in all envs) ─────────────────────

def _try_import_statsmodels():
    try:
        from statsmodels.tsa.arima.model import ARIMA
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        return ARIMA, ExponentialSmoothing
    except ImportError:
        return None, None

def _try_import_numpy():
    try:
        import numpy as np
        return np
    except ImportError:
        return None


# ─── Data class for a single series ───────────────────────────────────────────

class _Series:
    """Wrapper for a time-ordered sequence of (date, value) pairs."""

    def __init__(self, dates: List[date], values: List[float]) -> None:
        assert len(dates) == len(values)
        self.dates = dates
        self.values = values
        self.n = len(dates)

    @property
    def xs(self) -> List[float]:
        """Days since first observation (used by OLS)."""
        t0 = self.dates[0]
        return [(d - t0).days for d in self.dates]


# ─── Core forecasting logic ────────────────────────────────────────────────────

def _ols_predict(series: _Series, future_xs: List[float]) -> Tuple[List[float], List[float], List[float]]:
    """
    Simple OLS linear regression with prediction intervals (95 %).
    Returns (fitted, lower, upper).
    """
    n = series.n
    xs = series.xs
    ys = series.values

    sx  = sum(xs)
    sy  = sum(ys)
    sxy = sum(x * y for x, y in zip(xs, ys))
    sx2 = sum(x * x for x in xs)
    denom = n * sx2 - sx ** 2

    if denom == 0:
        mean = statistics.mean(ys)
        return [mean] * len(future_xs), [mean] * len(future_xs), [mean] * len(future_xs)

    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n

    # Residual standard error
    residuals = [y - (intercept + slope * x) for x, y in zip(xs, ys)]
    ss_res = sum(r ** 2 for r in residuals)
    se = math.sqrt(ss_res / max(n - 2, 1))

    x_mean = sx / n

    fitted_future = [intercept + slope * x for x in future_xs]
    # 95 % prediction interval width
    width = [
        1.96 * se * math.sqrt(1 + 1 / n + (x - x_mean) ** 2 / max(sx2 - sx ** 2 / n, 1e-9))
        for x in future_xs
    ]

    lower = [f - w for f, w in zip(fitted_future, width)]
    upper = [f + w for f, w in zip(fitted_future, width)]
    return fitted_future, lower, upper


def _r2(series: _Series) -> float:
    xs, ys = series.xs, series.values
    n = len(xs)
    sx, sy = sum(xs), sum(ys)
    sxy = sum(x * y for x, y in zip(xs, ys))
    sx2 = sum(x * x for x in xs)
    denom = n * sx2 - sx ** 2
    if denom == 0:
        return 0.0
    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n
    y_mean = sy / n
    ss_tot = sum((y - y_mean) ** 2 for y in ys)
    ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, ys))
    return round(1 - ss_res / max(ss_tot, 1e-9), 4)


def _arima_forecast(series: _Series, horizon: int) -> Optional[Tuple[List[float], List[float], List[float]]]:
    """Try ARIMA(1,1,1) — needs statsmodels and ≥ 24 points."""
    ARIMA_cls, _ = _try_import_statsmodels()
    if ARIMA_cls is None or series.n < 24:
        return None
    np = _try_import_numpy()
    if np is None:
        return None
    try:
        model = ARIMA_cls(series.values, order=(1, 1, 1))
        fit = model.fit()
        forecast = fit.get_forecast(steps=horizon)
        mean = forecast.predicted_mean.tolist()
        ci   = forecast.conf_int(alpha=0.05)
        lower = ci[:, 0].tolist()
        upper = ci[:, 1].tolist()
        return mean, lower, upper
    except Exception as exc:
        logger.warning("ARIMA failed for series len=%d: %s", series.n, exc)
        return None


def _holt_winters_forecast(series: _Series, horizon: int) -> Optional[Tuple[List[float], List[float], List[float]]]:
    """Holt-Winters double exponential smoothing — needs ≥ 6 points."""
    _, ES_cls = _try_import_statsmodels()
    if ES_cls is None or series.n < 6:
        return None
    np = _try_import_numpy()
    try:
        model = ES_cls(series.values, trend="add", damped_trend=True)
        fit = model.fit(optimized=True, remove_bias=True)
        mean = fit.forecast(horizon)
        if hasattr(mean, "tolist"):
            mean = mean.tolist()
        # Approximate 95% CI from residual std
        resid_std = (fit.resid ** 2).mean() ** 0.5 if np else statistics.stdev(series.values) * 0.5
        width = [1.96 * resid_std] * horizon
        lower = [m - w for m, w in zip(mean, width)]
        upper = [m + w for m, w in zip(mean, width)]
        return mean, lower, upper
    except Exception as exc:
        logger.warning("Holt-Winters failed for series len=%d: %s", series.n, exc)
        return None


def _build_future_dates(last_date: date, horizon: int) -> List[date]:
    """Return list of approximately monthly future dates."""
    result = []
    for m in range(1, horizon + 1):
        # Add ~30 days per month
        result.append(last_date + timedelta(days=30 * m))
    return result


def _detect_seasonality(series: _Series) -> bool:
    """Crude seasonality heuristic: seasonal if n >= 24 and std of monthly diffs is high."""
    if series.n < 24:
        return False
    monthly_diffs = [abs(series.values[i] - series.values[i - 1]) for i in range(1, series.n)]
    return statistics.stdev(monthly_diffs) > statistics.mean(monthly_diffs) * 0.5


# ─── ForecastingService ────────────────────────────────────────────────────────

class ForecastingService:
    """
    Forecasting service for ESG indicator time series.

    Usage::
        svc = ForecastingService(db)
        result = await svc.forecast_all(tenant_id, horizon_months=12, objective_target_pct=-30.0)
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Public API ─────────────────────────────────────────────────────────────

    async def forecast_all(
        self,
        tenant_id: UUID,
        horizon_months: int = 12,
        objective_target_pct: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Forecast all indicators with ≥ 3 historical data points.

        Parameters
        ----------
        objective_target_pct:
            If set (e.g. -30.0 means −30 %), an alert is raised when the
            12-month forecast exceeds (or does not meet) this relative
            change from the current value.
        """
        rows = await self._load_series(tenant_id)
        results: List[Dict[str, Any]] = []

        for indicator, data_points in rows.items():
            if len(data_points) < 3:
                continue
            forecast_result = self._forecast_series(
                indicator=indicator,
                data_points=data_points,
                horizon=horizon_months,
                objective_target_pct=objective_target_pct,
            )
            results.append(forecast_result)

        # Sort by reliability (r2) then by n_points
        results.sort(key=lambda r: (r["r2_score"], r["n_historical_points"]), reverse=True)

        return {
            "horizon_months": horizon_months,
            "objective_target_pct": objective_target_pct,
            "methodology_used": self._describe_methodology(),
            "forecasts": results[:15],          # Top 15 most reliable
            "total_indicators_forecasted": len(results),
        }

    async def forecast_indicator(
        self,
        tenant_id: UUID,
        indicator_id: UUID,
        horizon_months: int = 12,
        objective_value: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Forecast a single specific indicator."""
        rows = await self._load_series(tenant_id, indicator_id=indicator_id)
        for indicator, data_points in rows.items():
            return self._forecast_series(
                indicator=indicator,
                data_points=data_points,
                horizon=horizon_months,
                objective_value=objective_value,
            )
        return {"error": "Aucune donnée disponible pour cet indicateur"}

    # ── Internal ───────────────────────────────────────────────────────────────

    async def _load_series(
        self,
        tenant_id: UUID,
        indicator_id: Optional[UUID] = None,
    ) -> Dict[Indicator, List[IndicatorData]]:
        """Load indicator time-series grouped by indicator, ordered by date."""
        q = (
            select(IndicatorData)
            .join(Indicator, IndicatorData.indicator_id == Indicator.id)
            .where(IndicatorData.tenant_id == tenant_id)
            .order_by(Indicator.code, IndicatorData.date)
        )
        if indicator_id is not None:
            q = q.where(IndicatorData.indicator_id == indicator_id)

        result = await self.db.execute(q)
        all_data = result.scalars().all()

        grouped: Dict[str, Dict] = {}
        for d in all_data:
            key = str(d.indicator_id)
            if key not in grouped:
                grouped[key] = {"indicator": None, "points": []}
            grouped[key]["points"].append(d)
            if grouped[key]["indicator"] is None and hasattr(d, "indicator"):
                grouped[key]["indicator"] = d.indicator

        # Build Indicator → points mapping
        out: Dict[Any, List[IndicatorData]] = {}
        for key, val in grouped.items():
            ind = val["indicator"] or key
            out[ind] = val["points"]
        return out

    def _forecast_series(
        self,
        indicator: Any,
        data_points: List[IndicatorData],
        horizon: int,
        objective_target_pct: Optional[float] = None,
        objective_value: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Run the best available algorithm on a single series."""
        dates  = [p.date for p in data_points]
        values = [p.value for p in data_points]
        series = _Series(dates, values)

        # ── Select algorithm ──────────────────────────────────────────────────
        algo_used = "linear_ols"
        mean_forecast = lower_bound = upper_bound = None

        # 1. Try ARIMA
        arima_result = _arima_forecast(series, horizon)
        if arima_result:
            mean_forecast, lower_bound, upper_bound = arima_result
            algo_used = "arima_1_1_1"
        else:
            # 2. Try Holt-Winters
            hw_result = _holt_winters_forecast(series, horizon)
            if hw_result:
                mean_forecast, lower_bound, upper_bound = hw_result
                algo_used = "holt_winters"

        # 3. OLS fallback
        if mean_forecast is None:
            last_x = series.xs[-1]
            future_xs = [last_x + 30 * m for m in range(1, horizon + 1)]
            mean_forecast, lower_bound, upper_bound = _ols_predict(series, future_xs)
            algo_used = "linear_ols"

        # ── Build future points list ──────────────────────────────────────────
        future_dates = _build_future_dates(dates[-1], horizon)
        future_points = [
            {
                "date":            d.isoformat(),
                "predicted_value": round(float(v), 4),
                "lower_95":        round(float(lo), 4),
                "upper_95":        round(float(hi), 4),
                "confidence":      round(max(0.30, min(0.95, _r2(series) - 0.04 * m)), 3),
            }
            for m, (d, v, lo, hi) in enumerate(
                zip(future_dates, mean_forecast, lower_bound, upper_bound), start=1
            )
        ]

        # ── Trend direction ───────────────────────────────────────────────────
        slope = (mean_forecast[-1] - mean_forecast[0]) / max(horizon, 1)
        if   slope >  0.01: trend = "increasing"
        elif slope < -0.01: trend = "decreasing"
        else:               trend = "stable"

        # ── Goal alert ────────────────────────────────────────────────────────
        current_val   = float(values[-1])
        predicted_12m = float(mean_forecast[min(11, horizon - 1)])
        goal_alert: Optional[Dict[str, Any]] = None

        if objective_value is not None:
            gap = predicted_12m - objective_value
            if abs(gap) > 0.01:
                direction = "dépasse" if gap > 0 else "sera en-dessous de"
                goal_alert = {
                    "triggered": True,
                    "message":   f"Projection à 12 mois ({predicted_12m:.1f}) {direction} l'objectif ({objective_value:.1f})",
                    "gap":       round(gap, 2),
                    "severity":  "high" if abs(gap / max(objective_value, 1e-9)) > 0.15 else "medium",
                }
        elif objective_target_pct is not None and current_val != 0:
            target_val = current_val * (1 + objective_target_pct / 100)
            actual_pct = (predicted_12m - current_val) / abs(current_val) * 100
            if abs(actual_pct - objective_target_pct) > 2:
                on_track = actual_pct <= objective_target_pct if objective_target_pct < 0 else actual_pct >= objective_target_pct
                goal_alert = {
                    "triggered":        not on_track,
                    "target_value":     round(target_val, 2),
                    "predicted_value":  round(predicted_12m, 2),
                    "objective_pct":    objective_target_pct,
                    "projected_pct":    round(actual_pct, 1),
                    "message": (
                        f"Projection : {actual_pct:+.1f} % vs objectif {objective_target_pct:+.1f} %. "
                        + ("✅ En bonne voie." if on_track else "⚠️ Écart à combler.")
                    ),
                    "severity": "low" if on_track else ("high" if abs(actual_pct - objective_target_pct) > 10 else "medium"),
                }

        # ── Seasonality flag ──────────────────────────────────────────────────
        has_seasonality = _detect_seasonality(series)

        # ── Indicator metadata ────────────────────────────────────────────────
        ind_name = getattr(indicator, "name", "Indicateur")
        ind_code = getattr(indicator, "code", "—")
        ind_unit = getattr(indicator, "unit", data_points[-1].unit or "")
        ind_pillar = getattr(indicator, "pillar", "—")

        return {
            "indicator_id":         str(getattr(indicator, "id", indicator)),
            "indicator_name":       ind_name,
            "indicator_code":       ind_code,
            "indicator_unit":       ind_unit,
            "indicator_pillar":     ind_pillar,
            "n_historical_points":  series.n,
            "algorithm":            algo_used,
            "r2_score":             _r2(series),
            "trend":                trend,
            "has_seasonality":      has_seasonality,
            "current_value":        round(current_val, 4),
            "predicted_next_month": round(float(mean_forecast[0]), 4) if mean_forecast else None,
            "predicted_next_year":  round(predicted_12m, 4),
            "future_points":        future_points,
            "goal_alert":           goal_alert,
        }

    @staticmethod
    def _describe_methodology() -> str:
        ARIMA_cls, _ = _try_import_statsmodels()
        if ARIMA_cls:
            return "ARIMA(1,1,1) / Holt-Winters / OLS — intervalles de confiance 95%"
        return "Régression linéaire OLS avec intervalles de prédiction 95%"
