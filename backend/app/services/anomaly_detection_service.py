"""
ML-based anomaly detection for ESG data entries.

Combines several techniques — light statistical methods catch the obvious
cases (unit confusion, sign flips, period jumps), scikit-learn's Isolation
Forest handles multivariate patterns that single-column z-scores miss.

This complements (does not replace) the static rules in `data_validation.py`
(missing source, stale entries, manually flagged). The output integrates
with the existing ``QualityIssue`` shape so the UI keeps working without
schema changes.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from uuid import UUID

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────────────
# In-memory TTL cache
# ────────────────────────────────────────────────────────────────────────────
# Detection is O(N * detectors) on a tenant's full 2-year dataset — too slow
# to run on every /quality/issues page load. We cache the result per
# (tenant_id, lookback_days, min_confidence) for 5 minutes. The dedicated
# /quality/anomalies endpoint bypasses the cache when explicitly refreshed.
_CACHE_TTL_SECONDS = 300
_cache: Dict[Tuple, Tuple[datetime, List["Anomaly"]]] = {}


def _cache_get(key: Tuple) -> Optional[List["Anomaly"]]:
    entry = _cache.get(key)
    if not entry:
        return None
    ts, value = entry
    if (datetime.utcnow() - ts).total_seconds() > _CACHE_TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: Tuple, value: List["Anomaly"]) -> None:
    # Bound the cache to ~500 entries (LRU-ish: drop oldest first)
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda kv: kv[1][0])[:100]
        for k, _ in oldest:
            _cache.pop(k, None)
    _cache[key] = (datetime.utcnow(), value)


def invalidate_cache(tenant_id: Optional[UUID] = None) -> int:
    """Drop cached entries (all, or scoped to one tenant). Returns count dropped."""
    if tenant_id is None:
        n = len(_cache)
        _cache.clear()
        return n
    keys_to_drop = [k for k in _cache if k[0] == tenant_id]
    for k in keys_to_drop:
        _cache.pop(k, None)
    return len(keys_to_drop)


# ────────────────────────────────────────────────────────────────────────────
# Data classes
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class Anomaly:
    """A single anomaly detected on a DataEntry."""
    entry_id: str
    metric_name: str
    value: float
    period_start: Optional[str]
    anomaly_type: str        # z_score | iqr | magnitude | yoy_delta | sign_flip | isolation_forest
    severity: str            # low | medium | high | critical
    confidence: float        # 0..1
    reason_fr: str
    expected_range: Optional[tuple] = None   # (low, high) historically normal range
    suggested_value: Optional[float] = None  # if we can suggest a likely-correct value

    def to_dict(self) -> dict:
        d = asdict(self)
        if self.expected_range is not None:
            d["expected_range"] = list(self.expected_range)
        return d


# ────────────────────────────────────────────────────────────────────────────
# Severity helpers
# ────────────────────────────────────────────────────────────────────────────

def _severity_from_zscore(z: float) -> str:
    az = abs(z)
    if az >= 6:   return "critical"
    if az >= 4.5: return "high"
    if az >= 3.5: return "medium"
    return "low"


# ────────────────────────────────────────────────────────────────────────────
# Per-method detectors
# ────────────────────────────────────────────────────────────────────────────

def _zscore_outliers(rows: List[DataEntry]) -> List[Anomaly]:
    """Flag entries whose value sits >3.5σ from the metric's distribution."""
    out: List[Anomaly] = []
    by_metric: Dict[str, List[DataEntry]] = {}
    for e in rows:
        if e.value_numeric is None or not e.metric_name:
            continue
        by_metric.setdefault(e.metric_name, []).append(e)

    for metric, items in by_metric.items():
        values = np.array([float(e.value_numeric) for e in items if e.value_numeric is not None])
        if len(values) < 5:
            continue
        mean = values.mean()
        std = values.std(ddof=0)
        if std == 0:
            continue
        for e in items:
            v = float(e.value_numeric)
            z = (v - mean) / std
            if abs(z) >= 3.5:
                out.append(Anomaly(
                    entry_id=str(e.id),
                    metric_name=metric,
                    value=v,
                    period_start=str(e.period_start) if e.period_start else None,
                    anomaly_type="z_score",
                    severity=_severity_from_zscore(z),
                    confidence=min(1.0, abs(z) / 6),
                    reason_fr=(
                        f"Valeur à {abs(z):.1f}σ de la moyenne historique pour « {metric} » "
                        f"(moyenne ≈ {mean:.1f}, écart-type ≈ {std:.1f})."
                    ),
                    expected_range=(round(mean - 2*std, 2), round(mean + 2*std, 2)),
                    suggested_value=round(mean, 2),
                ))
    return out


def _iqr_outliers(rows: List[DataEntry]) -> List[Anomaly]:
    """IQR-based outliers — robust to extreme values (unlike z-score)."""
    out: List[Anomaly] = []
    by_metric: Dict[str, List[DataEntry]] = {}
    for e in rows:
        if e.value_numeric is None or not e.metric_name:
            continue
        by_metric.setdefault(e.metric_name, []).append(e)

    for metric, items in by_metric.items():
        values = np.array([float(e.value_numeric) for e in items if e.value_numeric is not None])
        if len(values) < 8:
            continue
        q1, q3 = np.percentile(values, [25, 75])
        iqr = q3 - q1
        low = q1 - 1.5 * iqr
        high = q3 + 1.5 * iqr
        median = float(np.median(values))
        for e in items:
            v = float(e.value_numeric)
            if v < low or v > high:
                # avoid double-flagging the same entry-id if z-score already caught it
                out.append(Anomaly(
                    entry_id=str(e.id),
                    metric_name=metric,
                    value=v,
                    period_start=str(e.period_start) if e.period_start else None,
                    anomaly_type="iqr",
                    severity="medium" if v > q3 + 3 * iqr or v < q1 - 3 * iqr else "low",
                    confidence=0.7,
                    reason_fr=(
                        f"Valeur hors de l'intervalle interquartile pour « {metric} » "
                        f"(plage normale ≈ {low:.1f} – {high:.1f})."
                    ),
                    expected_range=(round(low, 2), round(high, 2)),
                    suggested_value=round(median, 2),
                ))
    return out


def _magnitude_shifts(rows: List[DataEntry]) -> List[Anomaly]:
    """Detect values that are 10× or 0.1× the historical median — typical unit-confusion bugs (kWh vs MWh, kg vs t)."""
    out: List[Anomaly] = []
    by_metric: Dict[str, List[DataEntry]] = {}
    for e in rows:
        if e.value_numeric is None or e.value_numeric <= 0 or not e.metric_name:
            continue
        by_metric.setdefault(e.metric_name, []).append(e)

    for metric, items in by_metric.items():
        values = np.array([float(e.value_numeric) for e in items if e.value_numeric and e.value_numeric > 0])
        if len(values) < 5:
            continue
        median = float(np.median(values))
        if median <= 0:
            continue
        for e in items:
            v = float(e.value_numeric)
            ratio = v / median
            if ratio >= 8 or ratio <= 0.125:
                shift = "×1000" if ratio >= 800 else ("×100" if ratio >= 80 else ("×10" if ratio >= 8 else ("÷10" if ratio <= 0.125 else "÷100")))
                out.append(Anomaly(
                    entry_id=str(e.id),
                    metric_name=metric,
                    value=v,
                    period_start=str(e.period_start) if e.period_start else None,
                    anomaly_type="magnitude",
                    severity="high",
                    confidence=0.85,
                    reason_fr=(
                        f"Valeur {shift} la médiane historique de « {metric} » — "
                        f"erreur d'unité probable (kWh/MWh, kg/t, €/k€)."
                    ),
                    expected_range=(round(median * 0.3, 2), round(median * 3, 2)),
                    suggested_value=round(median, 2),
                ))
    return out


def _sign_flips(rows: List[DataEntry]) -> List[Anomaly]:
    """Negative values for metrics that have always been positive."""
    out: List[Anomaly] = []
    by_metric: Dict[str, List[DataEntry]] = {}
    for e in rows:
        if e.value_numeric is None or not e.metric_name:
            continue
        by_metric.setdefault(e.metric_name, []).append(e)

    for metric, items in by_metric.items():
        values = [float(e.value_numeric) for e in items if e.value_numeric is not None]
        if len(values) < 3:
            continue
        positives = sum(1 for v in values if v > 0)
        if positives < 0.8 * len(values):
            continue  # metric isn't reliably positive
        for e in items:
            if e.value_numeric is not None and float(e.value_numeric) < 0:
                out.append(Anomaly(
                    entry_id=str(e.id),
                    metric_name=metric,
                    value=float(e.value_numeric),
                    period_start=str(e.period_start) if e.period_start else None,
                    anomaly_type="sign_flip",
                    severity="high",
                    confidence=0.95,
                    reason_fr=(
                        f"Valeur négative pour « {metric} » alors que toutes les saisies "
                        f"historiques sont positives — saisie inversée ?"
                    ),
                    suggested_value=round(abs(float(e.value_numeric)), 2),
                ))
    return out


def _yoy_deltas(rows: List[DataEntry]) -> List[Anomaly]:
    """Year-over-year jumps > 50% on the same metric+organization (likely missing/incorrect period)."""
    out: List[Anomaly] = []
    grouped: Dict[tuple, List[DataEntry]] = {}
    for e in rows:
        if e.value_numeric is None or not e.metric_name or e.period_start is None:
            continue
        key = (e.metric_name, e.organization_id)
        grouped.setdefault(key, []).append(e)

    for key, items in grouped.items():
        items.sort(key=lambda x: x.period_start)
        for i in range(1, len(items)):
            prev, curr = items[i-1], items[i]
            try:
                pv, cv = float(prev.value_numeric), float(curr.value_numeric)
            except (TypeError, ValueError):
                continue
            if pv == 0:
                continue
            delta = (cv - pv) / abs(pv)
            if abs(delta) > 0.5:
                out.append(Anomaly(
                    entry_id=str(curr.id),
                    metric_name=curr.metric_name,
                    value=cv,
                    period_start=str(curr.period_start),
                    anomaly_type="yoy_delta",
                    severity="medium" if abs(delta) <= 1.0 else "high",
                    confidence=min(1.0, abs(delta)),
                    reason_fr=(
                        f"Variation de {delta*100:+.0f}% par rapport à la période précédente "
                        f"({prev.period_start}: {pv:.1f} → {curr.period_start}: {cv:.1f}). "
                        f"Vérifiez la cohérence (changement de scope, fusion/cession, erreur d'unité)."
                    ),
                    suggested_value=round(pv, 2),
                ))
    return out


def _isolation_forest_scores(rows: List[DataEntry]) -> List[Anomaly]:
    """Multivariate anomaly detection — catches patterns single-column methods miss."""
    out: List[Anomaly] = []
    # Group by metric: per-metric model is more meaningful than a global one.
    by_metric: Dict[str, List[DataEntry]] = {}
    for e in rows:
        if e.value_numeric is None or not e.metric_name:
            continue
        by_metric.setdefault(e.metric_name, []).append(e)

    try:
        from sklearn.ensemble import IsolationForest
    except ImportError:
        return out

    for metric, items in by_metric.items():
        if len(items) < 20:
            continue  # not enough samples to train
        features = np.array([
            [
                float(e.value_numeric),
                # period-of-year as feature (catches seasonal anomalies)
                (e.period_start.month if e.period_start else 6) / 12,
            ]
            for e in items
        ])
        try:
            model = IsolationForest(
                contamination=0.05,   # expect ~5% anomalies
                random_state=42,
                n_estimators=100,
            )
            model.fit(features)
            preds = model.predict(features)
            scores = model.score_samples(features)  # lower = more anomalous
        except Exception as exc:
            logger.warning("IsolationForest failed for metric=%s (n=%d): %s", metric, len(items), exc)
            continue
        for e, pred, score in zip(items, preds, scores):
            if pred == -1:  # IF marks anomalies as -1
                # normalize score to confidence: typical anomaly scores are -0.5 to -0.1
                confidence = min(1.0, max(0.3, abs(score) * 1.5))
                out.append(Anomaly(
                    entry_id=str(e.id),
                    metric_name=metric,
                    value=float(e.value_numeric),
                    period_start=str(e.period_start) if e.period_start else None,
                    anomaly_type="isolation_forest",
                    severity="medium",
                    confidence=round(confidence, 2),
                    reason_fr=(
                        f"Motif inhabituel détecté par le modèle Isolation Forest pour « {metric} » "
                        f"— combinaison valeur × saisonnalité atypique."
                    ),
                ))
    return out


# ────────────────────────────────────────────────────────────────────────────
# Orchestrator
# ────────────────────────────────────────────────────────────────────────────

async def detect_anomalies(
    db: AsyncSession,
    tenant_id: UUID,
    lookback_days: int = 730,
    min_confidence: float = 0.3,
    use_cache: bool = True,
) -> List[Anomaly]:
    """
    Run all detectors on the tenant's recent DataEntry rows.

    Deduplicates so a single entry is reported once with the highest-severity
    finding (severities ranked: critical > high > medium > low).

    Parameters
    ----------
    lookback_days
        How far back to pull entries. 2 years by default — long enough for YoY
        comparisons, short enough to keep the working set reasonable.
    min_confidence
        Drop anomalies below this confidence threshold (default 0.3 = keep
        most low-severity findings, filter pure noise).
    use_cache
        When True (default), serve from a 5-minute in-memory cache keyed by
        (tenant, lookback_days, min_confidence). Set to False to force a
        fresh computation (e.g., user-triggered "Refresh" in the UI).
    """
    cache_key = (tenant_id, lookback_days, round(min_confidence, 2))
    if use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    cutoff = datetime.utcnow() - timedelta(days=lookback_days)
    q = (
        select(DataEntry)
        .where(
            DataEntry.tenant_id == tenant_id,
            DataEntry.created_at >= cutoff,
            DataEntry.value_numeric.isnot(None),
        )
    )
    rows = list((await db.execute(q)).scalars().all())
    if not rows:
        _cache_set(cache_key, [])
        return []

    all_anomalies: List[Anomaly] = []
    all_anomalies += _zscore_outliers(rows)
    all_anomalies += _iqr_outliers(rows)
    all_anomalies += _magnitude_shifts(rows)
    all_anomalies += _sign_flips(rows)
    all_anomalies += _yoy_deltas(rows)
    all_anomalies += _isolation_forest_scores(rows)

    # Deduplicate by entry_id — keep highest severity per entry.
    SEV_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    best: Dict[str, Anomaly] = {}
    for a in all_anomalies:
        if a.confidence < min_confidence:
            continue
        prev = best.get(a.entry_id)
        if not prev or SEV_RANK.get(a.severity, 0) > SEV_RANK.get(prev.severity, 0):
            best[a.entry_id] = a

    # Sort by severity (critical first), then confidence
    result = sorted(
        best.values(),
        key=lambda a: (-SEV_RANK.get(a.severity, 0), -a.confidence),
    )
    _cache_set(cache_key, result)
    return result
