"""
ESG Scoring endpoints - Calcul et consultation des scores ESG.
"""
from uuid import UUID, uuid4
from typing import Optional
from datetime import date, timedelta
import random

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.esg_score import ESGScore
from app.services.esg_scoring_engine import ESGScoringEngine
from app.services.data_quality_service import DataQualityService
from app.core.permissions import require_role, Roles

router = APIRouter()

# ─── Redis helper ─────────────────────────────────────────────────────────────

def _get_redis():
    try:
        import redis as _redis
        from app.config import settings
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception:
        return None

DEFAULT_WEIGHTS = {"env": 0.40, "soc": 0.35, "gov": 0.25}

def _load_weights(tenant_id) -> dict:
    """Load pillar weights from Redis, fall back to defaults."""
    import json
    r = _get_redis()
    if r:
        try:
            raw = r.get(f"esg_weights:{tenant_id}")
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    return DEFAULT_WEIGHTS.copy()


class ESGWeightsPayload(BaseModel):
    env: float
    soc: float
    gov: float


@router.get("/weights")
async def get_esg_weights(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retourne les pondérations ESG actuelles du tenant (env/soc/gov, somme = 1.0)."""
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    weights = _load_weights(str(user.tenant_id))
    return {"weights": weights, "source": "custom" if weights != DEFAULT_WEIGHTS else "default"}


@router.put("/weights")
async def update_esg_weights(
    payload: ESGWeightsPayload,
    _: None = Depends(require_role(*Roles.ADMIN_OR_ABOVE)),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour les pondérations ESG du tenant. Réservé aux esg_admin / tenant_admin."""
    import json
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    total = round(payload.env + payload.soc + payload.gov, 4)
    if abs(total - 1.0) > 0.01:
        raise HTTPException(status_code=422, detail=f"La somme des pondérations doit être 1.0 (actuellement {total})")
    weights = {"env": round(payload.env, 4), "soc": round(payload.soc, 4), "gov": round(payload.gov, 4)}
    r = _get_redis()
    if r:
        try:
            r.setex(f"esg_weights:{user.tenant_id}", 86400 * 365, json.dumps(weights))
        except Exception:
            pass
    return {"weights": weights, "saved": r is not None}


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
    _: None = Depends(require_role(*Roles.MANAGER_OR_ABOVE)),
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
        'skipped': 0,   # organisations sans données (pas une erreur)
        'failed': 0,    # erreurs techniques réelles
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

        except ValueError:
            # Pas de données pour cette organisation — comportement normal
            results['skipped'] += 1
            results['details'].append({
                'organization_id': str(org.id),
                'organization_name': org.name,
                'success': False,
                'skipped': True,
                'error': 'Aucune donnée disponible'
            })

        except Exception as e:
            results['failed'] += 1
            results['details'].append({
                'organization_id': str(org.id),
                'organization_name': org.name,
                'success': False,
                'skipped': False,
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


@router.get("/live-summary")
async def get_live_summary(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne les scores ESG calculés en live depuis data_entries.
    Champs plats : esg_score, environmental_score, social_score, governance_score, rating.
    Fallback sur esg_scores si data_entries vide.
    """
    from sqlalchemy import func
    from app.models.data_entry import DataEntry
    from app.models.organization import Organization

    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tenant_id = user.tenant_id

    # ── Compter les data_entries par pilier pour tout le tenant ──────────────
    counts_res = await db.execute(
        select(DataEntry.pillar, func.count(DataEntry.id))
        .where(
            DataEntry.tenant_id == tenant_id,
            DataEntry.value_numeric.isnot(None),
        )
        .group_by(DataEntry.pillar)
    )
    counts = {row[0]: row[1] for row in counts_res.fetchall()}
    total_entries = sum(counts.values())

    def _pillar_score(pillar: str, expected: int) -> float:
        n = counts.get(pillar, 0)
        completeness = min(n / max(expected, 1), 1.0)
        return round(completeness * 80 + (20 if completeness >= 0.5 else completeness * 40), 2)

    if total_entries > 0:
        env = _pillar_score('environmental', 20)
        soc = _pillar_score('social', 10)
        gov = _pillar_score('governance', 8)
        _w = _load_weights(str(tenant_id))
        total = round(env * _w['env'] + soc * _w['soc'] + gov * _w['gov'], 2)
        completeness_pct = round(min(total_entries / 38, 1.0) * 100, 2)
        source = 'data_entries'
    else:
        # Fallback : moyenne des scores stockés dans esg_scores
        stats_res = await db.execute(text("""
            SELECT AVG(overall_score), AVG(environmental_score),
                   AVG(social_score), AVG(governance_score), AVG(data_completeness)
            FROM esg_scores
            WHERE tenant_id = :tid
              AND calculation_date = (
                  SELECT MAX(calculation_date) FROM esg_scores s2
                  WHERE s2.organization_id = esg_scores.organization_id
              )
        """), {"tid": str(tenant_id)})
        row = stats_res.fetchone()
        total = round(row[0] or 0, 2)
        env   = round(row[1] or 0, 2)
        soc   = round(row[2] or 0, 2)
        gov   = round(row[3] or 0, 2)
        completeness_pct = round(row[4] or 0, 2)
        source = 'esg_scores'

    def _rating(s: float) -> str:
        if s >= 85: return 'AAA'
        if s >= 75: return 'AA'
        if s >= 65: return 'A'
        if s >= 55: return 'BBB'
        if s >= 45: return 'BB'
        if s >= 35: return 'B'
        if s >= 25: return 'CCC'
        if s >= 15: return 'CC'
        return 'C'

    return {
        "esg_score": total,
        "environmental_score": env,
        "social_score": soc,
        "governance_score": gov,
        "rating": _rating(total),
        "data_completeness": completeness_pct,
        "total_entries": total_entries,
        "source": source,
        "has_real_data": total_entries > 0,
    }


@router.get("/all-org-scores")
async def get_all_org_scores(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne le dernier score de chaque organisation du tenant en une seule requête.
    Remplace les N appels individuels à /organization/{id} pour éviter le rate limiting.
    """
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    scores_res = await db.execute(text("""
        SELECT
            s.organization_id,
            s.overall_score,
            s.environmental_score,
            s.social_score,
            s.governance_score,
            s.rating,
            s.data_completeness,
            s.confidence_level,
            s.calculation_date
        FROM esg_scores s
        WHERE s.tenant_id = :tid
          AND s.calculation_date = (
              SELECT MAX(s2.calculation_date)
              FROM esg_scores s2
              WHERE s2.organization_id = s.organization_id
          )
        ORDER BY s.overall_score DESC
        LIMIT 200
    """), {"tid": str(user.tenant_id)})

    rows = scores_res.fetchall()
    return {
        "scores": [
            {
                "organization_id": str(r[0]),
                "overall_score":       round(r[1] or 0, 2),
                "environmental_score": round(r[2] or 0, 2),
                "social_score":        round(r[3] or 0, 2),
                "governance_score":    round(r[4] or 0, 2),
                "rating":              r[5] or "—",
                "data_completeness":   round(r[6] or 0, 2),
                "confidence_level":    round(r[7] or 0, 2),
                "date":                r[8].isoformat() if r[8] else None,
            }
            for r in rows
        ],
        "count": len(rows),
        "limit": 200,
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


@router.post("/populate-sample-data")
async def populate_sample_data(
    _: None = Depends(require_role(Roles.TENANT_ADMIN)),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Générer des données ESG de démonstration pour les organisations sans données.

    Crée des IndicatorData réalistes avec des dates dans les 12 derniers mois
    pour toutes les organisations qui n'ont aucune donnée récente.
    Utile en environnement de démo pour permettre le calcul de tous les scores.
    """
    from sqlalchemy.orm import selectinload
    user_result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.role))
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only admin roles may generate demo data
    role_name = (user.role.name if user.role else "").lower()
    if "admin" not in role_name:
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux administrateurs. Cet endpoint génère des données de démonstration.",
        )

    tenant_id = user.tenant_id
    today = date.today()
    cutoff = today - timedelta(days=365)

    # 1) Organisations sans données récentes
    orgs_without_data = await db.execute(text("""
        SELECT o.id, o.name, o.industry
        FROM organizations o
        WHERE o.tenant_id = :tenant_id
          AND NOT EXISTS (
              SELECT 1 FROM indicator_data id2
              WHERE id2.organization_id = o.id
                AND id2.tenant_id = :tenant_id
                AND id2.date >= :cutoff
          )
        ORDER BY o.name
    """), {"tenant_id": str(tenant_id), "cutoff": cutoff})
    orgs = orgs_without_data.fetchall()

    if not orgs:
        return {"populated": 0, "message": "Toutes les organisations ont déjà des données récentes."}

    # 2) Indicateurs actifs disponibles
    indicators_result = await db.execute(text("""
        SELECT id, code, pillar, unit
        FROM indicators
        WHERE tenant_id = :tenant_id AND is_active = true
        ORDER BY pillar, code
        LIMIT 20
    """), {"tenant_id": str(tenant_id)})
    indicators = indicators_result.fetchall()

    if not indicators:
        raise HTTPException(
            status_code=400,
            detail="Aucun indicateur actif trouvé. Créez d'abord des indicateurs.",
        )

    # 3) Valeurs de démo par pilier (réalistes mais variées par org)
    DEMO_VALUES: dict = {
        "environmental": {"min": 500.0,  "max": 50000.0},
        "social":        {"min": 50.0,   "max": 5000.0},
        "governance":    {"min": 1.0,    "max": 100.0},
    }

    # Générer 3 points de données par an (mars, juillet, décembre)
    data_dates = [
        today - timedelta(days=270),  # ~9 mois
        today - timedelta(days=180),  # ~6 mois
        today - timedelta(days=30),   # ~1 mois
    ]

    inserted = 0
    for org in orgs:
        org_id, org_name, industry = org
        # Facteur de variation par organisation (60-140% de la valeur de base)
        org_factor = random.uniform(0.6, 1.4)

        for ind in indicators:
            ind_id, ind_code, pillar, unit = ind
            bounds = DEMO_VALUES.get(pillar, {"min": 10.0, "max": 1000.0})
            base_value = random.uniform(bounds["min"], bounds["max"]) * org_factor

            for i, data_date in enumerate(data_dates):
                # Légère progression dans le temps (amélioration de 2-5% par période)
                trend_factor = 1.0 - (0.03 * (len(data_dates) - 1 - i))
                value = round(max(0.1, base_value * trend_factor), 2)

                await db.execute(text("""
                    INSERT INTO indicator_data (
                        id, tenant_id, organization_id, indicator_id,
                        date, value, unit, source,
                        is_verified, is_estimated, created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :org_id, :ind_id,
                        :date, :value, :unit, 'demo_generated',
                        false, true, NOW(), NOW()
                    )
                    ON CONFLICT DO NOTHING
                """), {
                    "id": str(uuid4()),
                    "tenant_id": str(tenant_id),
                    "org_id": str(org_id),
                    "ind_id": str(ind_id),
                    "date": data_date,
                    "value": value,
                    "unit": unit or "",
                })
                inserted += 1

    await db.commit()

    return {
        "populated": len(orgs),
        "data_points_created": inserted,
        "message": f"{len(orgs)} organisations renseignées avec {inserted} points de données de démonstration.",
        "organizations": [{"id": str(o[0]), "name": o[1]} for o in orgs],
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
