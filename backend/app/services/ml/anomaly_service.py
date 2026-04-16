"""
ML Anomaly Detection Service — Détection d'anomalies dans les données ESG
=========================================================================
Approche hybride :
  1. Isolation Forest (sklearn)  — anomalies multivariées contextuelles
  2. Z-score                     — détection univariée interprétable
Les deux scores sont combinés pour produire une sévérité finale
(low / medium / high) et des recommandations d'action actionnables.
"""
from __future__ import annotations

import logging
import statistics
from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry
from app.models.indicator_data import IndicatorData
from app.models.indicator import Indicator

logger = logging.getLogger(__name__)


# ── Lazy sklearn import ────────────────────────────────────────────────────────

def _try_isolation_forest():
    try:
        from sklearn.ensemble import IsolationForest
        import numpy as np
        return IsolationForest, np
    except ImportError:
        return None, None


# ─── Recommendation templates ─────────────────────────────────────────────────

_RECOMMENDATIONS: Dict[str, Dict[str, str]] = {
    "emission_spike": {
        "title":       "Pic d'émissions inhabituel",
        "action":      "Vérifier les sources d'énergie, fuites, ou événement ponctuel (arrêt/démarrage site)",
        "preventive":  "Mettre en place une alerte automatique si émissions > μ + 2σ",
    },
    "consumption_drop": {
        "title":       "Baisse brutale de consommation",
        "action":      "Confirmer que ce n'est pas une donnée manquante ou une erreur de saisie",
        "preventive":  "Configurer une validation croisée avec les factures fournisseur",
    },
    "outlier_generic": {
        "title":       "Valeur hors norme",
        "action":      "Comparer avec la période équivalente N-1 et investiguer",
        "preventive":  "Activer la vérification croisée automatique dans les paramètres de qualité",
    },
    "peer_deviation": {
        "title":       "Écart significatif par rapport aux pairs",
        "action":      "Consulter le benchmark sectoriel pour valider le positionnement",
        "preventive":  "Intégrer les KPI benchmark dans votre tableau de bord",
    },
}

def _classify_recommendation(metric_name: str, value: float, mean: float) -> str:
    name_lower = metric_name.lower()
    ratio = value / max(abs(mean), 1e-9)
    if any(k in name_lower for k in ("emission", "co2", "scope", "ghg", "carbone")):
        return "emission_spike" if value > mean else "consumption_drop"
    if ratio < 0.4 or ratio > 2.5:
        return "outlier_generic"
    return "peer_deviation"


# ─── AnomalyDetectionService ──────────────────────────────────────────────────

class AnomalyDetectionService:
    """
    Detect anomalies in ESG data using Isolation Forest + Z-score.

    Usage::
        svc = AnomalyDetectionService(db)
        result = await svc.detect_anomalies(tenant_id, pillar="environmental")
    """

    # Contamination fraction for Isolation Forest
    IF_CONTAMINATION = 0.10        # expect ~10 % anomalies
    Z_LOW_THRESHOLD  = 2.0
    Z_MED_THRESHOLD  = 2.5
    Z_HIGH_THRESHOLD = 3.0

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Public API ─────────────────────────────────────────────────────────────

    async def detect_anomalies(
        self,
        tenant_id: UUID,
        pillar:    Optional[str] = None,
        year:      Optional[int] = None,
        limit:     int = 20,
    ) -> Dict[str, Any]:
        """
        Run anomaly detection and return enriched anomaly list.

        Parameters
        ----------
        pillar : optional filter ("environmental" / "social" / "governance")
        year   : optional filter on period_start year
        limit  : max number of anomalies returned
        """
        entries = await self._load_entries(tenant_id, pillar, year)

        if len(entries) < 3:
            return {
                "anomalies":       [],
                "count":           0,
                "algorithm_used":  "n/a — données insuffisantes (< 3 points)",
                "summary":         {"high": 0, "medium": 0, "low": 0},
            }

        # ── Z-score anomalies ─────────────────────────────────────────────────
        zscore_anomalies = self._zscore_detect(entries)

        # ── Isolation Forest anomalies ────────────────────────────────────────
        if_anomalies: Dict[str, float] = {}
        algo_used = "z_score"

        IF_cls, np = _try_isolation_forest()
        if IF_cls is not None and np is not None and len(entries) >= 10:
            if_anomalies = self._isolation_forest_detect(entries, IF_cls, np)
            algo_used = "isolation_forest + z_score"

        # ── Merge results ─────────────────────────────────────────────────────
        merged = self._merge_anomalies(entries, zscore_anomalies, if_anomalies)

        # Sort: high → medium → low
        severity_order = {"high": 0, "medium": 1, "low": 2}
        merged.sort(key=lambda a: (severity_order[a["severity"]], -a["z_score"]))

        summary = {
            "high":   sum(1 for a in merged if a["severity"] == "high"),
            "medium": sum(1 for a in merged if a["severity"] == "medium"),
            "low":    sum(1 for a in merged if a["severity"] == "low"),
        }

        return {
            "anomalies":       merged[:limit],
            "count":           len(merged),
            "total_detected":  len(merged),
            "algorithm_used":  algo_used,
            "summary":         summary,
        }

    # ── Internal ───────────────────────────────────────────────────────────────

    async def _load_entries(
        self,
        tenant_id: UUID,
        pillar:    Optional[str],
        year:      Optional[int],
    ) -> List[DataEntry]:
        q = select(DataEntry).where(DataEntry.tenant_id == tenant_id)
        if pillar:
            q = q.where(DataEntry.pillar == pillar)
        if year:
            q = q.where(extract("year", DataEntry.period_start) == year)

        result = await self.db.execute(q)
        return [e for e in result.scalars().all() if e.value_numeric is not None]

    def _zscore_detect(self, entries: List[DataEntry]) -> Dict[str, Dict[str, float]]:
        """
        Per-metric Z-score.
        Returns dict[entry_id → {z_score, mean, stdev}].
        """
        # Group values per metric
        metric_stats: Dict[str, Dict[str, Any]] = {}
        for e in entries:
            key = e.metric_name
            metric_stats.setdefault(key, {"values": []})
            metric_stats[key]["values"].append(e.value_numeric)

        # Compute stats
        for key, data in metric_stats.items():
            vals = data["values"]
            if len(vals) < 3:
                data["mean"] = data["stdev"] = None
                continue
            data["mean"]  = statistics.mean(vals)
            data["stdev"] = statistics.stdev(vals) if len(vals) > 1 else 0.0

        # Flag anomalies
        flagged: Dict[str, Dict[str, float]] = {}
        for e in entries:
            stats = metric_stats.get(e.metric_name, {})
            mean  = stats.get("mean")
            stdev = stats.get("stdev")
            if mean is None or stdev is None or stdev == 0:
                continue
            z = abs((e.value_numeric - mean) / stdev)
            if z >= self.Z_LOW_THRESHOLD:
                flagged[str(e.id)] = {
                    "z_score": round(z, 3),
                    "mean":    round(mean, 4),
                    "stdev":   round(stdev, 4),
                }
        return flagged

    def _isolation_forest_detect(
        self,
        entries: List[DataEntry],
        IF_cls:  Any,
        np:      Any,
    ) -> Dict[str, float]:
        """
        Isolation Forest on the numeric values (1-D feature).
        Returns dict[entry_id → anomaly_score (0-1, higher = more anomalous)].
        """
        ids    = [str(e.id) for e in entries]
        values = np.array([[e.value_numeric] for e in entries], dtype=float)

        clf = IF_cls(
            n_estimators=100,
            contamination=self.IF_CONTAMINATION,
            random_state=42,
            n_jobs=-1,
        )
        clf.fit(values)
        # score_samples returns negative anomaly score; more negative = more anomalous
        raw_scores = clf.score_samples(values)
        # Normalise to [0, 1] where 1 = most anomalous
        min_s, max_s = raw_scores.min(), raw_scores.max()
        span = max_s - min_s if max_s != min_s else 1.0
        scores_norm = 1 - (raw_scores - min_s) / span

        # Predictions: -1 = anomaly, 1 = normal
        predictions = clf.predict(values)

        out: Dict[str, float] = {}
        for eid, score, pred in zip(ids, scores_norm, predictions):
            if pred == -1:
                out[eid] = round(float(score), 4)
        return out

    def _merge_anomalies(
        self,
        entries:         List[DataEntry],
        zscore_flags:    Dict[str, Dict[str, float]],
        if_scores:       Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Combine both detectors and build enriched anomaly records."""
        entry_map = {str(e.id): e for e in entries}
        seen_ids  = set(zscore_flags) | set(if_scores)

        results: List[Dict[str, Any]] = []
        for eid in seen_ids:
            e     = entry_map.get(eid)
            if e is None:
                continue
            zinfo = zscore_flags.get(eid, {})
            z     = zinfo.get("z_score", 0.0)
            mean  = zinfo.get("mean", e.value_numeric)
            stdev = zinfo.get("stdev", 0.0)
            ifscore = if_scores.get(eid, 0.0)

            # ── Severity: combine Z-score + IF score ──────────────────────────
            severity = self._combined_severity(z, ifscore)

            # ── Recommendation ────────────────────────────────────────────────
            rec_key  = _classify_recommendation(e.metric_name, e.value_numeric, mean)
            rec      = _RECOMMENDATIONS.get(rec_key, _RECOMMENDATIONS["outlier_generic"])

            results.append({
                "id":              eid,
                "metric_name":     e.metric_name,
                "value":           round(e.value_numeric, 4),
                "unit":            getattr(e, "unit", ""),
                "mean":            round(mean, 4) if mean is not None else None,
                "expected_range":  (
                    f"{mean - 2 * stdev:.1f} — {mean + 2 * stdev:.1f}"
                    if mean is not None and stdev
                    else "n/a"
                ),
                "z_score":         round(z, 3),
                "isolation_score": round(ifscore, 3),
                "deviation":       f"{z:.1f}σ" if z else "—",
                "severity":        severity,
                "pillar":          e.pillar or "—",
                "category":        e.category or "—",
                "period":          e.period_start.isoformat() if e.period_start else None,
                "recommendation": {
                    "title":      rec["title"],
                    "action":     rec["action"],
                    "preventive": rec["preventive"],
                },
                "algorithms_triggered": (
                    ["z_score"]
                    + (["isolation_forest"] if ifscore > 0 else [])
                ),
            })

        return results

    def _combined_severity(self, z_score: float, if_score: float) -> str:
        """
        Map combined signal to severity label.
        - high   : Z ≥ 3   OR (Z ≥ 2.5 AND IF > 0.75)
        - medium : Z ≥ 2.5 OR (Z ≥ 2   AND IF > 0.60)
        - low    : otherwise
        """
        if z_score >= self.Z_HIGH_THRESHOLD:
            return "high"
        if z_score >= self.Z_MED_THRESHOLD and if_score > 0.75:
            return "high"
        if z_score >= self.Z_MED_THRESHOLD:
            return "medium"
        if z_score >= self.Z_LOW_THRESHOLD and if_score > 0.60:
            return "medium"
        return "low"
