"""
ESG Scoring endpoints - Calcul et consultation des scores ESG.
"""
from uuid import UUID
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.esg_score import ESGScore
from app.services.esg_scoring_engine import ESGScoringEngine
from app.services.data_quality_service import DataQualityService

router = APIRouter()


class CalculateScoreRequest(BaseModel):
    organization_id: UUID
    calculation_date: Optional[str] = None
    period_months: int = 12


class DataQualityRequest(BaseModel):
    organization_id: UUID
    months: int = 12


@router.post("/calculate")
async def calculate_esg_score(
    data: CalculateScoreRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculer le score ESG d'une organisation.
    
    **Méthode:**
    1. Collecte des données des 12 derniers mois
    2. Normalisation sur échelle 0-100
    3. Pondération sectorielle
    4. Agrégation par pilier (E, S, G)
    5. Score global et rating
    """
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Parse date si fournie
    calc_date = date.fromisoformat(data.calculation_date) if data.calculation_date else None
    
    engine = ESGScoringEngine(db)
    
    try:
        result = await engine.calculate_organization_score(
            tenant_id=user.tenant_id,
            organization_id=data.organization_id,
            calculation_date=calc_date,
            period_months=data.period_months
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@router.post("/calculate-historical")
async def calculate_historical_scores(
    data: CalculateScoreRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculer l'historique des scores ESG (12 derniers mois).
    
    Permet de visualiser l'évolution du score dans le temps.
    """
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    engine = ESGScoringEngine(db)
    
    try:
        result = await engine.calculate_historical_scores(
            tenant_id=user.tenant_id,
            organization_id=data.organization_id,
            months=12
        )
        
        return {
            'organization_id': str(data.organization_id),
            'scores': result,
            'count': len(result)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Historical calculation failed: {str(e)}")


@router.get("/organization/{organization_id}")
async def get_organization_scores(
    organization_id: UUID,
    limit: int = Query(12, ge=1, le=100),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les scores historiques d'une organisation."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(ESGScore).where(
        ESGScore.tenant_id == user.tenant_id,
        ESGScore.organization_id == organization_id
    ).order_by(ESGScore.calculation_date.desc()).limit(limit)
    
    result = await db.execute(query)
    scores = list(result.scalars().all())
    
    return {
        'organization_id': str(organization_id),
        'scores': [{
            'id': str(s.id),
            'date': s.calculation_date.isoformat(),
            'overall_score': s.overall_score,
            'rating': s.rating,
            'environmental_score': s.environmental_score,
            'social_score': s.social_score,
            'governance_score': s.governance_score,
            'confidence_level': s.confidence_level,
            'data_completeness': s.data_completeness,
        } for s in scores],
        'count': len(scores)
    }
@router.post("/recalculate-all")
async def recalculate_all_scores(
    period_months: int = Query(12, ge=1, le=24),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Recalculer tous les scores ESG pour toutes les organisations du tenant.
    
    **Usage:**
    - Après import massif de données
    - Modification des paramètres de scoring
    - Mise à jour périodique automatique
    
    **Retour:**
    - total: Nombre total d'organisations
    - successful: Nombre de calculs réussis
    - failed: Nombre d'échecs
    - details: Détails par organisation
    """
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Récupérer toutes les organisations du tenant
    from app.models.organization import Organization
    
    orgs_query = select(Organization).where(
        Organization.tenant_id == user.tenant_id
    )
    orgs_result = await db.execute(orgs_query)
    organizations = list(orgs_result.scalars().all())
    
    if not organizations:
        return {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'message': 'Aucune organisation trouvée',
            'details': []
        }
    
    engine = ESGScoringEngine(db)
    
    results = {
        'total': len(organizations),
        'successful': 0,
        'failed': 0,
        'details': []
    }
    
    for org in organizations:
        try:
            score = await engine.calculate_organization_score(
                tenant_id=user.tenant_id,
                organization_id=org.id,
                calculation_date=None,
                period_months=period_months
            )
            
            results['successful'] += 1
            results['details'].append({
                'organization_id': str(org.id),
                'organization_name': org.name,
                'success': True,
                'overall_score': score['overall_score'],
                'rating': score['rating'],
                'confidence': score['confidence_level'],
                'completeness': score['data_completeness']
            })
        
        except ValueError as e:
            # Pas de données pour cette organisation
            results['failed'] += 1
            results['details'].append({
                'organization_id': str(org.id),
                'organization_name': org.name,
                'success': False,
                'error': 'Aucune donnée disponible'
            })
        
        except Exception as e:
            results['failed'] += 1
            results['details'].append({
                'organization_id': str(org.id),
                'organization_name': org.name,
                'success': False,
                'error': str(e)
            })
    
    return results


@router.get("/dashboard")
async def get_scoring_dashboard(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupérer le tableau de bord des scores ESG.
    
    **Retour:**
    - Statistiques globales
    - Distribution des ratings
    - Top/Bottom performers
    - Tendances par pilier
    """
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from sqlalchemy import text, func
    
    # Statistiques globales
    stats_query = text("""
        SELECT 
            COUNT(DISTINCT organization_id) as total_orgs,
            AVG(overall_score) as avg_score,
            AVG(environmental_score) as avg_env,
            AVG(social_score) as avg_soc,
            AVG(governance_score) as avg_gov,
            AVG(data_completeness) as avg_completeness
        FROM esg_scores
        WHERE tenant_id = :tenant_id
            AND calculation_date = (
                SELECT MAX(calculation_date)
                FROM esg_scores s2
                WHERE s2.organization_id = esg_scores.organization_id
            )
    """)
    
    result = await db.execute(stats_query, {"tenant_id": str(user.tenant_id)})
    stats = result.fetchone()
    
    # Distribution des ratings
    rating_query = text("""
        SELECT 
            rating,
            COUNT(*) as count
        FROM esg_scores
        WHERE tenant_id = :tenant_id
            AND calculation_date = (
                SELECT MAX(calculation_date)
                FROM esg_scores s2
                WHERE s2.organization_id = esg_scores.organization_id
            )
        GROUP BY rating
        ORDER BY 
            CASE rating
                WHEN 'AAA' THEN 1
                WHEN 'AA' THEN 2
                WHEN 'A' THEN 3
                WHEN 'BBB' THEN 4
                WHEN 'BB' THEN 5
                WHEN 'B' THEN 6
                WHEN 'CCC' THEN 7
                WHEN 'CC' THEN 8
                WHEN 'C' THEN 9
                ELSE 10
            END
    """)
    
    result = await db.execute(rating_query, {"tenant_id": str(user.tenant_id)})
    ratings = [{'rating': r[0], 'count': r[1]} for r in result.fetchall()]
    
    # Top performers
    top_query = text("""
        SELECT 
            o.id,
            o.name,
            s.overall_score,
            s.rating,
            s.environmental_score,
            s.social_score,
            s.governance_score
        FROM esg_scores s
        JOIN organizations o ON s.organization_id = o.id
        WHERE s.tenant_id = :tenant_id
            AND s.calculation_date = (
                SELECT MAX(calculation_date)
                FROM esg_scores s2
                WHERE s2.organization_id = s.organization_id
            )
        ORDER BY s.overall_score DESC
        LIMIT 5
    """)
    
    result = await db.execute(top_query, {"tenant_id": str(user.tenant_id)})
    top_performers = [
        {
            'id': str(r[0]),
            'name': r[1],
            'score': r[2],
            'rating': r[3],
            'environmental': r[4],
            'social': r[5],
            'governance': r[6]
        }
        for r in result.fetchall()
    ]
    
    return {
        'statistics': {
            'total_organizations': stats[0] or 0,
            'average_score': round(stats[1] or 0, 2),
            'average_environmental': round(stats[2] or 0, 2),
            'average_social': round(stats[3] or 0, 2),
            'average_governance': round(stats[4] or 0, 2),
            'average_completeness': round(stats[5] or 0, 2)
        },
        'rating_distribution': ratings,
        'top_performers': top_performers
    }


@router.post("/batch-calculate")
async def batch_calculate_scores(
    organization_ids: list[UUID],
    period_months: int = Query(12, ge=1, le=24),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculer les scores pour un lot d'organisations spécifiques.
    
    **Usage:**
    - Calcul ciblé après mise à jour de données
    - Recalcul sélectif
    """
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    engine = ESGScoringEngine(db)
    
    results = []
    
    for org_id in organization_ids:
        try:
            score = await engine.calculate_organization_score(
                tenant_id=user.tenant_id,
                organization_id=org_id,
                calculation_date=None,
                period_months=period_months
            )
            
            results.append({
                'organization_id': str(org_id),
                'success': True,
                'score': score
            })
        
        except Exception as e:
            results.append({
                'organization_id': str(org_id),
                'success': False,
                'error': str(e)
            })
    
    successful = sum(1 for r in results if r['success'])
    failed = sum(1 for r in results if not r['success'])
    
    return {
        'total': len(organization_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }

@router.post("/data-quality")
async def check_data_quality(
    data: DataQualityRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Vérifier la qualité des données d'une organisation.
    
    **Métriques:**
    - Complétude: % de données présentes vs attendues
    - Cohérence: Variations anormales détectées
    - Précision: % de données vérifiées
    - Fraîcheur: Âge des données les plus récentes
    """
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = DataQualityService(db)
    
    try:
        result = await service.calculate_organization_data_quality(
            tenant_id=user.tenant_id,
            organization_id=data.organization_id,
            months=data.months
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality check failed: {str(e)}")
