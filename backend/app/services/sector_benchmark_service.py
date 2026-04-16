# backend/app/services/sector_benchmark_service.py
from typing import Dict, List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import Organization
from app.models.esg_score import ESGScore


class SectorBenchmarkService:
    """Service de calcul des benchmarks par secteur"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_sector_benchmarks(
        self,
        sector: str,
        year: Optional[int] = None
    ) -> Dict:
        """Calcule les benchmarks pour un secteur"""

        companies = await self._get_companies_by_sector(sector)

        if not companies:
            return {}

        scores: List[float] = []
        for company in companies:
            score = await self._get_latest_score(str(company.id), year)
            if score is not None:
                scores.append(score)

        if not scores:
            return {}

        scores.sort()
        n = len(scores)

        def percentile(p: float) -> float:
            idx = int(n * p)
            return scores[min(idx, n - 1)]

        return {
            "sector": sector,
            "year": year or "latest",
            "p25": round(percentile(0.25), 1),
            "p50": round(percentile(0.50), 1),
            "p75": round(percentile(0.75), 1),
            "average": round(sum(scores) / n, 1),
            "min": scores[0],
            "max": scores[-1],
            "companies_count": n,
            # Aliases attendus par le frontend (top25 / top10)
            "top25": round(percentile(0.75), 1),
            "top10": round(percentile(0.90), 1),
        }

    async def get_company_position(
        self,
        company_id: str,
        sector: str
    ) -> Optional[Dict]:
        """Détermine la position d'une entreprise dans son secteur"""

        company_score_val = await self._get_latest_score(company_id)
        if company_score_val is None:
            return None

        benchmarks = await self.get_sector_benchmarks(sector)
        if not benchmarks:
            return None

        score = company_score_val
        avg = benchmarks["average"]
        p25 = benchmarks["p25"]
        p50 = benchmarks["p50"]
        p75 = benchmarks["p75"]

        if score <= p25:
            quartile, position = 4, "below_average"
        elif score <= p50:
            quartile, position = 3, "average"
        elif score <= p75:
            quartile, position = 2, "above_average"
        else:
            quartile, position = 1, "top"

        percentile_rank = self._calculate_percentile(score, benchmarks)

        return {
            "company_score": score,
            "sector_average": avg,
            "quartile": quartile,
            "position": position,
            "percentile": percentile_rank,
        }

    # ── Private helpers ────────────────────────────────────────────────────

    async def _get_companies_by_sector(self, sector: str) -> List:
        """Récupère toutes les organisations du secteur donné"""
        result = await self.db.execute(
            select(Organization).where(
                Organization.industry.ilike(f"%{sector}%")
            )
        )
        return result.scalars().all()

    async def _get_latest_score(
        self,
        company_id: str,
        year: Optional[int] = None
    ) -> Optional[float]:
        """Récupère le dernier score global d'une organisation"""
        query = (
            select(ESGScore.overall_score)
            .where(ESGScore.organization_id == company_id)
        )
        if year:
            query = query.where(
                func.extract("year", ESGScore.calculation_date) == year
            )
        query = query.order_by(ESGScore.calculation_date.desc()).limit(1)

        result = await self.db.execute(query)
        row = result.scalar_one_or_none()
        return float(row) if row is not None else None

    @staticmethod
    def _calculate_percentile(score: float, benchmarks: Dict) -> int:
        """Estime le percentile d'un score dans les benchmarks du secteur"""
        mn = benchmarks.get("min", 0)
        mx = benchmarks.get("max", 100)
        if mx == mn:
            return 50
        raw = (score - mn) / (mx - mn) * 100
        return max(1, min(99, round(raw)))
