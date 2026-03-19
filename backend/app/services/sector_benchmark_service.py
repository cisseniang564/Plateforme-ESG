# backend/app/services/sector_benchmark_service.py
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.indicator import Indicator
from app.models.esg_score import ESGScore

class SectorBenchmarkService:
    """Service de calcul des benchmarks par secteur"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_sector_benchmarks(
        self, 
        sector: str,
        year: Optional[int] = None
    ) -> Dict:
        """Calcule les benchmarks pour un secteur"""
        
        # Récupérer toutes les entreprises du secteur
        companies = await self._get_companies_by_sector(sector)
        
        if not companies:
            return {}
        
        # Calculer les percentiles
        scores = []
        for company in companies:
            score = await self._get_latest_score(company.id, year)
            if score:
                scores.append(score.total_score)
        
        if not scores:
            return {}
        
        scores.sort()
        
        return {
            "sector": sector,
            "year": year or "latest",
            "p25": scores[int(len(scores) * 0.25)],
            "p50": scores[int(len(scores) * 0.5)],
            "p75": scores[int(len(scores) * 0.75)],
            "average": sum(scores) / len(scores),
            "min": scores[0],
            "max": scores[-1],
            "companies_count": len(scores)
        }
    
    async def get_company_position(
        self,
        company_id: str,
        sector: str
    ) -> Dict:
        """Détermine la position d'une entreprise dans son secteur"""
        
        company_score = await self._get_latest_score(company_id)
        if not company_score:
            return None
        
        benchmarks = await self.get_sector_benchmarks(sector)
        if not benchmarks:
            return None
        
        # Déterminer le quartile
        if company_score.total_score <= benchmarks["p25"]:
            quartile = 4  # Bottom 25%
            position = "below_average"
        elif company_score.total_score <= benchmarks["p50"]:
            quartile = 3  # 25-50%
            position = "average"
        elif company_score.total_score <= benchmarks["p75"]:
            quartile = 2  # 50-75%
            position = "above_average"
        else:
            quartile = 1  # Top 25%
            position = "top"
        
        return {
            "company_score": company_score.total_score,
            "sector_average": benchmarks["average"],
            "quartile": quartile,
            "position": position,
            "percentile": self._calculate_percentile(
                company_score.total_score, 
                benchmarks
            )
        }