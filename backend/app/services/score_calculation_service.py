"""
Score Calculation Service - Calculate ESG scores from indicator data.
"""
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime, timedelta
from collections import defaultdict

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.esg_score import ESGScore
from app.models.organization import Organization


class ScoreCalculationService:
    """Service for calculating ESG scores."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_score(
        self,
        tenant_id: UUID,
        calculation_date: date,
        organization_id: Optional[UUID] = None,
    ) -> ESGScore:
        """Calculate ESG score for a specific date."""
        
        indicators_query = select(Indicator).where(
            Indicator.tenant_id == tenant_id,
            Indicator.is_active == True
        )
        indicators_result = await self.db.execute(indicators_query)
        indicators = list(indicators_result.scalars().all())
        
        pillar_indicators = defaultdict(list)
        for ind in indicators:
            pillar_indicators[ind.pillar].append(ind)
        
        pillar_scores = {}
        total_data_points = 0
        
        for pillar, inds in pillar_indicators.items():
            if not inds:
                pillar_scores[pillar] = 0.0
                continue
            
            weighted_sum = 0.0
            total_weight = 0.0
            
            for ind in inds:
                data_query = select(IndicatorData).where(
                    IndicatorData.indicator_id == ind.id,
                    IndicatorData.tenant_id == tenant_id,
                    IndicatorData.date <= calculation_date
                )
                
                if organization_id:
                    data_query = data_query.where(
                        IndicatorData.organization_id == organization_id
                    )
                
                data_query = data_query.order_by(IndicatorData.date.desc()).limit(1)
                
                data_result = await self.db.execute(data_query)
                latest_data = data_result.scalar_one_or_none()
                
                if latest_data:
                    normalized_value = self._normalize_value(
                        latest_data.value,
                        ind.target_value
                    )
                    
                    weight = ind.weight or 1.0
                    weighted_sum += normalized_value * weight
                    total_weight += weight
                    total_data_points += 1
            
            if total_weight > 0:
                pillar_scores[pillar] = weighted_sum / total_weight
            else:
                pillar_scores[pillar] = 0.0
        
        overall = sum(pillar_scores.values()) / 3 if pillar_scores else 0.0

        # Derive letter rating from overall score
        if overall >= 80:   rating = "A"
        elif overall >= 65: rating = "B"
        elif overall >= 50: rating = "C"
        elif overall >= 35: rating = "D"
        else:               rating = "E"

        existing_query = select(ESGScore).where(
            ESGScore.tenant_id == tenant_id,
            ESGScore.calculation_date == calculation_date
        )

        if organization_id:
            existing_query = existing_query.where(
                ESGScore.organization_id == organization_id
            )
        else:
            existing_query = existing_query.where(
                ESGScore.organization_id.is_(None)
            )
        
        existing_result = await self.db.execute(existing_query)
        existing_score = existing_result.scalar_one_or_none()
        
        if existing_score:
            existing_score.overall_score = overall
            existing_score.environmental_score = pillar_scores.get('environmental', 0.0)
            existing_score.social_score = pillar_scores.get('social', 0.0)
            existing_score.governance_score = pillar_scores.get('governance', 0.0)
            existing_score.rating = rating
            existing_score.data_completeness = round(total_data_points / max(total_data_points, 1), 2)
            score = existing_score
        else:
            score = ESGScore(
                tenant_id=tenant_id,
                organization_id=organization_id,
                calculation_date=calculation_date,
                overall_score=overall,
                environmental_score=pillar_scores.get('environmental', 0.0),
                social_score=pillar_scores.get('social', 0.0),
                governance_score=pillar_scores.get('governance', 0.0),
                rating=rating,
                calculation_method='weighted_average',
                data_completeness=round(total_data_points / max(total_data_points, 1), 2),
            )
            self.db.add(score)
        
        await self.db.commit()
        await self.db.refresh(score)
        
        return score
    
    def _normalize_value(self, value: float, target: Optional[float]) -> float:
        """Normalize indicator value to 0-100 scale."""
        if target and target > 0:
            normalized = (value / target) * 100
            return min(100.0, max(0.0, normalized))
        
        return min(100.0, max(0.0, value))
    
    async def get_score_history(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[ESGScore]:
        """Get historical scores."""
        
        query = select(ESGScore).where(ESGScore.tenant_id == tenant_id)
        
        if organization_id:
            query = query.where(ESGScore.organization_id == organization_id)
        else:
            query = query.where(ESGScore.organization_id.is_(None))
        
        if start_date:
            query = query.where(ESGScore.calculation_date >= start_date)
        
        if end_date:
            query = query.where(ESGScore.calculation_date <= end_date)
        
        query = query.order_by(ESGScore.calculation_date)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def compare_organizations(
        self,
        tenant_id: UUID,
        calculation_date: date,
    ) -> List[dict]:
        """Compare scores across all organizations."""
        
        # Get all organizations for this tenant
        orgs_query = select(Organization).where(Organization.tenant_id == tenant_id)
        orgs_result = await self.db.execute(orgs_query)
        organizations = list(orgs_result.scalars().all())
        
        # Get or calculate scores for each organization
        comparison = []
        
        for org in organizations:
            # Try to get existing score
            score_query = select(ESGScore).where(
                ESGScore.tenant_id == tenant_id,
                ESGScore.organization_id == org.id,
                ESGScore.calculation_date == calculation_date
            )
            score_result = await self.db.execute(score_query)
            score = score_result.scalar_one_or_none()
            
            # Calculate if doesn't exist
            if not score:
                score = await self.calculate_score(tenant_id, calculation_date, org.id)
            
            comparison.append({
                'organization_id': str(org.id),
                'organization_name': org.name,
                'overall_score': score.overall_score,
                'environmental_score': score.environmental_score,
                'social_score': score.social_score,
                'governance_score': score.governance_score,
                'grade': score.rating,
            })
        
        # Sort by overall score descending
        comparison.sort(key=lambda x: x['overall_score'], reverse=True)
        
        return comparison
    
    async def detect_performance_alerts(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
        threshold_percentage: float = 5.0,
    ) -> List[dict]:
        """Detect performance drops that exceed threshold."""
        
        # Get last 2 scores
        query = select(ESGScore).where(ESGScore.tenant_id == tenant_id)
        
        if organization_id:
            query = query.where(ESGScore.organization_id == organization_id)
        else:
            query = query.where(ESGScore.organization_id.is_(None))
        
        query = query.order_by(ESGScore.calculation_date.desc()).limit(2)
        
        result = await self.db.execute(query)
        scores = list(result.scalars().all())
        
        if len(scores) < 2:
            return []
        
        current = scores[0]
        previous = scores[1]
        
        alerts = []
        
        # Check overall score
        overall_drop = previous.overall_score - current.overall_score
        if overall_drop > threshold_percentage:
            alerts.append({
                'type': 'overall',
                'pillar': 'overall',
                'previous_score': round(previous.overall_score, 2),
                'current_score': round(current.overall_score, 2),
                'drop_percentage': round(overall_drop, 2),
                'severity': 'high' if overall_drop > 10 else 'medium',
                'message': f'Overall score dropped by {overall_drop:.1f}%'
            })
        
        # Check each pillar
        pillars = {
            'environmental': (previous.environmental_score, current.environmental_score),
            'social': (previous.social_score, current.social_score),
            'governance': (previous.governance_score, current.governance_score),
        }
        
        for pillar, (prev_score, curr_score) in pillars.items():
            drop = prev_score - curr_score
            if drop > threshold_percentage:
                alerts.append({
                    'type': 'pillar',
                    'pillar': pillar,
                    'previous_score': round(prev_score, 2),
                    'current_score': round(curr_score, 2),
                    'drop_percentage': round(drop, 2),
                    'severity': 'high' if drop > 10 else 'medium',
                    'message': f'{pillar.capitalize()} score dropped by {drop:.1f}%'
                })
        
        return alerts
