"""
Production-grade sector benchmarking service.

Combines two data sources:
  1. **Real cross-tenant aggregates** — when a sector has ≥ ``MIN_COHORT_SIZE``
     organizations contributing scores. We aggregate at the score-level only
     (no organization IDs returned) so individual companies are never exposed.
  2. **Public reference baselines** (``benchmark_baselines.py``) — CDP/MSCI/ADEME
     published sector medians used as fallback for smaller cohorts and for
     reference indicators (carbon intensity, gender pay gap, etc.).

Anonymization (k-anonymity):
  Real aggregates are only returned when the cohort contains at least 5
  organizations from at least 3 distinct tenants. This protects individual
  companies' data even on small platforms.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.data.benchmark_baselines import (
    MIN_COHORT_SIZE,
    SECTOR_BASELINES,
    get_baseline,
    normalize_sector,
)


# Minimum distinct tenants in a cohort — defends against single-customer
# datasets being identifiable.
MIN_DISTINCT_TENANTS = 3


class SectorBenchmarkService:
    """Service de calcul des benchmarks par secteur."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ────────────────────────────────────────────────────────────────────
    # Public API
    # ────────────────────────────────────────────────────────────────────

    async def get_sector_benchmarks(
        self,
        sector: str,
        year: Optional[int] = None,
    ) -> Dict:
        """
        Return benchmarks for a sector.

        Output shape::

            {
              "sector":            "tech",
              "sector_label":      "Tech / Logiciels",
              "source":            "cross_tenant" | "public_reference",
              "cohort_size":       12,                    # only when source=cross_tenant
              "distinct_tenants":  4,                     # only when source=cross_tenant
              "computed_at":       "2026-05-23T08:15:00Z",
              "year":              "latest",
              "overall":      {p25, median, p75, top10},
              "environmental":{p25, median, p75, top10},
              "social":       {p25, median, p75, top10},
              "governance":   {p25, median, p75, top10},
              "indicators":   {carbon_intensity_per_revenue, ...},
              "anonymization": {
                  "k_anonymity_threshold": MIN_COHORT_SIZE,
                  "tenant_diversity_threshold": MIN_DISTINCT_TENANTS,
                  "data_returned": "aggregate_only",
              },
            }
        """
        sector_key = normalize_sector(sector)
        baseline = get_baseline(sector_key)

        # Try real cohort aggregation first
        real = await self._aggregate_cross_tenant(sector_key, year)
        if real:
            real.update({
                "sector":         sector_key,
                "sector_label":   baseline["label"],
                "source":         "cross_tenant",
                "computed_at":    datetime.utcnow().isoformat() + "Z",
                "year":           year or "latest",
                # Reference indicators always come from public baselines
                # (we don't store per-indicator data in esg_scores).
                "indicators":     baseline["indicators"],
                "anonymization":  {
                    "k_anonymity_threshold":     MIN_COHORT_SIZE,
                    "tenant_diversity_threshold": MIN_DISTINCT_TENANTS,
                    "data_returned":             "aggregate_only",
                },
                # Backwards-compat aliases used by existing UI code paths
                "p25":         real["overall"]["p25"],
                "p50":         real["overall"]["median"],
                "p75":         real["overall"]["p75"],
                "average":     real["overall"]["median"],
                "top25":       real["overall"]["p75"],
                "top10":       real["overall"]["top10"],
                "companies_count": real["cohort_size"],
            })
            return real

        # Fallback: public reference
        return {
            "sector":         sector_key,
            "sector_label":   baseline["label"],
            "source":         "public_reference",
            "reference_source": baseline["source"],
            "cohort_size":    None,
            "computed_at":    datetime.utcnow().isoformat() + "Z",
            "year":           year or "latest",
            "overall":        baseline["overall"],
            "environmental":  baseline["environmental"],
            "social":         baseline["social"],
            "governance":     baseline["governance"],
            "indicators":     baseline["indicators"],
            "anonymization":  {
                "k_anonymity_threshold":     MIN_COHORT_SIZE,
                "tenant_diversity_threshold": MIN_DISTINCT_TENANTS,
                "data_returned":             "public_baseline",
                "note": (
                    f"Cohorte cross-tenant insuffisante (< {MIN_COHORT_SIZE} orgs ou "
                    f"< {MIN_DISTINCT_TENANTS} tenants distincts) — référentiel "
                    f"public {baseline['source']} utilisé en remplacement."
                ),
            },
            # Backwards-compat aliases
            "p25":   baseline["overall"]["p25"],
            "p50":   baseline["overall"]["median"],
            "p75":   baseline["overall"]["p75"],
            "average": baseline["overall"]["median"],
            "top25": baseline["overall"]["p75"],
            "top10": baseline["overall"]["top10"],
            "companies_count": 0,
        }

    async def get_company_position(
        self,
        company_id: str,
        sector: str,
        year: Optional[int] = None,
    ) -> Optional[Dict]:
        """Compare a single organization's latest score to the sector benchmarks."""
        score = await self._get_latest_score(company_id, year)
        if score is None:
            return None

        benchmarks = await self.get_sector_benchmarks(sector, year)
        if not benchmarks:
            return None

        overall = benchmarks["overall"]
        p25, p50, p75 = overall["p25"], overall["median"], overall["p75"]

        if score <= p25:
            quartile, position = 4, "below_average"
        elif score <= p50:
            quartile, position = 3, "average"
        elif score <= p75:
            quartile, position = 2, "above_average"
        else:
            quartile, position = 1, "top"

        # Estimate percentile using a piecewise-linear interpolation through
        # the published p25/p50/p75/top10 anchors. More accurate than a flat
        # (score - min) / (max - min) when scores are skewed.
        percentile_rank = self._interpolate_percentile(score, overall)

        return {
            "company_score":   round(score, 1),
            "sector_average":  p50,
            "quartile":        quartile,
            "position":        position,
            "percentile":      percentile_rank,
            "benchmark_source": benchmarks["source"],
            "sector_label":    benchmarks.get("sector_label"),
        }

    # ────────────────────────────────────────────────────────────────────
    # Internals
    # ────────────────────────────────────────────────────────────────────

    async def _aggregate_cross_tenant(
        self,
        sector_key: str,
        year: Optional[int],
    ) -> Optional[Dict]:
        """
        Aggregate scores across all tenants for a sector key.

        Uses raw SQL with explicit ``app.current_tenant_id = ''`` to bypass
        Row-Level Security (anonymized aggregation only — no organization IDs
        ever leak from this query).

        Returns ``None`` if the cohort doesn't meet k-anonymity thresholds.
        """
        baseline = get_baseline(sector_key)
        naf_prefixes: List[str] = baseline.get("naf_codes", [])

        # Build the WHERE clause: match by industry label keyword OR by NAF code
        # prefix on Organization.naf_code if it exists.
        # We keep it simple: ILIKE on industry. If naf codes are available, OR
        # them in too.
        like_keys = self._sector_keywords(sector_key)
        if not like_keys:
            return None

        # Year filter (optional)
        year_clause = ""
        params: Dict = {}
        if year:
            year_clause = "AND EXTRACT(YEAR FROM s.calculation_date) = :year"
            params["year"] = year

        # Like patterns
        like_conditions = " OR ".join([f"LOWER(o.industry) LIKE :kw{i}" for i in range(len(like_keys))])
        for i, kw in enumerate(like_keys):
            params[f"kw{i}"] = f"%{kw.lower()}%"

        # Latest score per organization (avoid double-counting historical recalcs)
        sql = text(f"""
            WITH latest_scores AS (
                SELECT DISTINCT ON (s.organization_id)
                    s.organization_id,
                    s.tenant_id,
                    s.overall_score,
                    s.environmental_score,
                    s.social_score,
                    s.governance_score,
                    s.calculation_date
                FROM esg_scores s
                JOIN organizations o ON o.id = s.organization_id
                WHERE ({like_conditions})
                  {year_clause}
                ORDER BY s.organization_id, s.calculation_date DESC
            )
            SELECT
                overall_score, environmental_score, social_score, governance_score,
                tenant_id
            FROM latest_scores
        """)

        # Set a session GUC to bypass RLS for this aggregation. We never
        # return organization IDs — only aggregated quartiles — so this is
        # safe for anonymization.
        try:
            await self.db.execute(text("SET LOCAL row_security = off"))
        except Exception as exc:
            # Permission may be denied on hosted DBs; the query may still
            # work via the application-level RLS bypass pattern used
            # elsewhere in the codebase.
            logger.debug("Could not disable row_security GUC: %s — relying on application-level RLS bypass", exc)

        try:
            rows = (await self.db.execute(sql, params)).all()
        except Exception as exc:
            # Query failed (RLS, schema mismatch on shared DB, etc.) — fall
            # back to public baselines silently. The caller handles the
            # ``None`` return value.
            logger.warning("Cross-tenant aggregation failed for sector=%s: %s — falling back to public baseline", sector_key, exc)
            return None

        # K-anonymity check
        if len(rows) < MIN_COHORT_SIZE:
            return None
        distinct_tenants = len({r.tenant_id for r in rows})
        if distinct_tenants < MIN_DISTINCT_TENANTS:
            return None

        # Compute percentiles per pillar
        overall = np.array([float(r.overall_score) for r in rows])
        env = np.array([float(r.environmental_score) for r in rows])
        soc = np.array([float(r.social_score) for r in rows])
        gov = np.array([float(r.governance_score) for r in rows])

        def quartiles(values: np.ndarray) -> Dict[str, float]:
            return {
                "p25":    round(float(np.percentile(values, 25)), 1),
                "median": round(float(np.percentile(values, 50)), 1),
                "p75":    round(float(np.percentile(values, 75)), 1),
                "top10":  round(float(np.percentile(values, 90)), 1),
            }

        return {
            "cohort_size":      len(rows),
            "distinct_tenants": distinct_tenants,
            "overall":       quartiles(overall),
            "environmental": quartiles(env),
            "social":        quartiles(soc),
            "governance":    quartiles(gov),
        }

    async def _get_latest_score(
        self,
        company_id: str,
        year: Optional[int] = None,
    ) -> Optional[float]:
        """Latest overall_score for a single organization (tenant-scoped, RLS applies)."""
        from sqlalchemy import select, func
        from app.models.esg_score import ESGScore

        query = select(ESGScore.overall_score).where(ESGScore.organization_id == company_id)
        if year:
            query = query.where(func.extract("year", ESGScore.calculation_date) == year)
        query = query.order_by(ESGScore.calculation_date.desc()).limit(1)

        result = await self.db.execute(query)
        row = result.scalar_one_or_none()
        return float(row) if row is not None else None

    @staticmethod
    def _sector_keywords(sector_key: str) -> List[str]:
        """Return the SQL ILIKE patterns to match this sector key in organizations.industry."""
        # Reuse the same lists baked into normalize_sector (kept inline here to
        # avoid coupling the SQL builder to the normalization regex).
        keywords_map = {
            "tech":         ["tech", "software", "logiciel", "saas", "informat", "digital", "édition"],
            "finance":      ["finance", "bank", "banque", "assur", "insurance", "fintech"],
            "industry":     ["industr", "manufact", "fabric", "automotive", "automobil"],
            "retail":       ["retail", "commerc", "distribut", "vente", "magasin", "consumer"],
            "construction": ["constru", "btp", "immobil", "real estate", "bâtim"],
            "transport":    ["transport", "logistique", "logistic", "fret", "shipping"],
            "energy":       ["énergie", "energie", "energy", "utilit", "électric", "pétrole"],
            "healthcare":   ["santé", "sante", "health", "pharma", "médical", "biotech"],
            "services":     ["conseil", "consult", "service", "audit", "avocat", "advisory"],
        }
        return keywords_map.get(sector_key, [])

    @staticmethod
    def _interpolate_percentile(score: float, anchors: Dict[str, float]) -> int:
        """Piecewise-linear interpolation between known percentile anchors."""
        p25, p50, p75, top10 = anchors["p25"], anchors["median"], anchors["p75"], anchors["top10"]
        if score <= p25:
            # Below p25 — extrapolate down to 1
            if p25 <= 0:
                return 10
            pct = max(1, int(25 * score / p25))
            return min(pct, 25)
        if score <= p50:
            if p50 == p25:
                return 38
            return int(25 + 25 * (score - p25) / (p50 - p25))
        if score <= p75:
            if p75 == p50:
                return 63
            return int(50 + 25 * (score - p50) / (p75 - p50))
        if score <= top10:
            if top10 == p75:
                return 88
            return int(75 + 15 * (score - p75) / (top10 - p75))
        # Above top10
        if top10 >= 100:
            return 99
        extra = (score - top10) / (100 - top10)
        return min(99, 90 + int(9 * extra))


# Convenience for the endpoint when it wants the list of supported sectors
def list_available_sectors() -> List[Dict]:
    """Return all sector keys with their human labels — used by UI selectors."""
    return [
        {"code": k, "label": v["label"], "source": v["source"]}
        for k, v in SECTOR_BASELINES.items() if k != "default"
    ]
