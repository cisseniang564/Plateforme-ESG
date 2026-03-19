"""Service de calcul dynamique des scores ESG"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from datetime import date, datetime
from uuid import UUID, uuid4
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ESGScoringService:
    """Calcul automatique et dynamique des scores ESG"""
    
    # Pondérations par défaut (modifiables)
    DEFAULT_WEIGHTS = {
        'environmental': 0.33,
        'social': 0.33,
        'governance': 0.34
    }
    
    # Mapping catégories → piliers
    CATEGORY_WEIGHTS = {
        # Environnement
        'Émissions': 0.30,
        'Énergie': 0.25,
        'Eau': 0.15,
        'Déchets': 0.15,
        'Biodiversité': 0.10,
        'Circularité': 0.05,
        # Social
        'Emploi': 0.25,
        'Diversité': 0.25,
        'Formation': 0.15,
        'Santé Sécurité': 0.25,
        'Rémunération': 0.10,
        # Gouvernance
        'Gouvernance': 0.40,
        'Éthique': 0.40,
        'Chaîne valeur': 0.20,
    }
    
    @classmethod
    async def calculate_organization_score(
        cls,
        session: AsyncSession,
        organization_id: UUID,
        tenant_id: UUID,
        calculation_date: Optional[date] = None
    ) -> Dict:
        """Calculer le score ESG complet d'une organisation"""
        
        if not calculation_date:
            calculation_date = date.today()
        
        # 1. Récupérer toutes les données de l'organisation
        data_query = text("""
            SELECT 
                i.pillar,
                i.category,
                i.code,
                i.name,
                i.unit,
                d.value,
                d.date,
                d.is_verified
            FROM indicator_data d
            JOIN indicators i ON d.indicator_id = i.id
            WHERE d.organization_id = :org_id
                AND d.tenant_id = :tenant_id
                AND EXTRACT(YEAR FROM d.date) = EXTRACT(YEAR FROM :calc_date)
            ORDER BY i.pillar, i.category, i.code
        """)
        
        result = await session.execute(
            data_query,
            {
                "org_id": str(organization_id),
                "tenant_id": str(tenant_id),
                "calc_date": calculation_date
            }
        )
        
        data_points = result.fetchall()
        
        if not data_points:
            return {
                'success': False,
                'message': 'Aucune donnée disponible pour cette organisation'
            }
        
        # 2. Calculer les scores par pilier
        pillar_scores = await cls._calculate_pillar_scores(data_points)
        
        # 3. Calculer le score global
        overall_score = sum(
            pillar_scores[pillar] * cls.DEFAULT_WEIGHTS[pillar]
            for pillar in ['environmental', 'social', 'governance']
            if pillar in pillar_scores
        )
        
        # 4. Déterminer le rating
        rating = cls._get_rating(overall_score)
        
        # 5. Calculer la complétude des données
        completeness = await cls._calculate_data_completeness(
            session, organization_id, tenant_id, calculation_date
        )
        
        # 6. Déterminer le niveau de confiance
        confidence = cls._determine_confidence(completeness, len(data_points))
        
        return {
            'success': True,
            'organization_id': organization_id,
            'calculation_date': calculation_date,
            'environmental_score': pillar_scores.get('environmental', 0),
            'social_score': pillar_scores.get('social', 0),
            'governance_score': pillar_scores.get('governance', 0),
            'overall_score': overall_score,
            'rating': rating,
            'data_completeness': completeness,
            'confidence_level': confidence,
            'data_points_count': len(data_points),
            'weights': cls.DEFAULT_WEIGHTS
        }
    
    @classmethod
    async def _calculate_pillar_scores(cls, data_points: List) -> Dict[str, float]:
        """Calculer les scores par pilier E/S/G"""
        
        pillar_data = {}
        
        # Grouper par pilier et catégorie
        for row in data_points:
            pillar = row[0]
            category = row[1]
            value = row[5]
            
            if pillar not in pillar_data:
                pillar_data[pillar] = {}
            
            if category not in pillar_data[pillar]:
                pillar_data[pillar][category] = []
            
            pillar_data[pillar][category].append(value)
        
        # Calculer scores normalisés par pilier
        pillar_scores = {}
        
        for pillar, categories in pillar_data.items():
            category_scores = []
            
            for category, values in categories.items():
                # Score de la catégorie (moyenne normalisée)
                avg_value = sum(values) / len(values)
                normalized = min(100, max(0, avg_value))  # Clamp 0-100
                
                # Pondérer par importance de la catégorie
                weight = cls.CATEGORY_WEIGHTS.get(category, 0.1)
                category_scores.append(normalized * weight)
            
            # Score du pilier = somme pondérée des catégories
            pillar_scores[pillar] = sum(category_scores)
        
        return pillar_scores
    
    @classmethod
    async def _calculate_data_completeness(
        cls,
        session: AsyncSession,
        organization_id: UUID,
        tenant_id: UUID,
        calculation_date: date
    ) -> float:
        """Calculer le taux de complétude des données"""
        
        # Compter indicateurs obligatoires
        mandatory_query = text("""
            SELECT COUNT(*) 
            FROM indicators 
            WHERE tenant_id = :tenant_id 
                AND is_mandatory = true
                AND is_active = true
        """)
        
        result = await session.execute(
            mandatory_query,
            {"tenant_id": str(tenant_id)}
        )
        total_mandatory = result.scalar() or 1
        
        # Compter données renseignées
        filled_query = text("""
            SELECT COUNT(DISTINCT d.indicator_id)
            FROM indicator_data d
            JOIN indicators i ON d.indicator_id = i.id
            WHERE d.organization_id = :org_id
                AND d.tenant_id = :tenant_id
                AND i.is_mandatory = true
                AND EXTRACT(YEAR FROM d.date) = EXTRACT(YEAR FROM :calc_date)
        """)
        
        result = await session.execute(
            filled_query,
            {
                "org_id": str(organization_id),
                "tenant_id": str(tenant_id),
                "calc_date": calculation_date
            }
        )
        filled_mandatory = result.scalar() or 0
        
        return (filled_mandatory / total_mandatory) * 100
    
    @classmethod
    def _determine_confidence(cls, completeness: float, data_count: int) -> str:
        """Déterminer le niveau de confiance du score"""
        
        if completeness >= 90 and data_count >= 50:
            return 'high'
        elif completeness >= 70 and data_count >= 30:
            return 'medium'
        elif completeness >= 50 and data_count >= 20:
            return 'low'
        else:
            return 'very_low'
    
    @classmethod
    def _get_rating(cls, score: float) -> str:
        """Convertir score numérique en rating alphanumérique"""
        
        if score >= 90:
            return 'AAA'
        elif score >= 85:
            return 'AA'
        elif score >= 80:
            return 'A'
        elif score >= 75:
            return 'BBB'
        elif score >= 70:
            return 'BB'
        elif score >= 65:
            return 'B'
        elif score >= 60:
            return 'CCC'
        elif score >= 55:
            return 'CC'
        elif score >= 50:
            return 'C'
        else:
            return 'D'
    
    @classmethod
    async def recalculate_all_scores(
        cls,
        session: AsyncSession,
        tenant_id: UUID,
        calculation_date: Optional[date] = None
    ) -> Dict:
        """Recalculer les scores pour toutes les organisations"""
        
        if not calculation_date:
            calculation_date = date.today()
        
        # Récupérer toutes les organisations
        orgs_query = text("""
            SELECT id FROM organizations 
            WHERE tenant_id = :tenant_id
        """)
        
        result = await session.execute(
            orgs_query,
            {"tenant_id": str(tenant_id)}
        )
        
        organizations = [UUID(row[0]) for row in result.fetchall()]
        
        results = []
        
        for org_id in organizations:
            try:
                score_data = await cls.calculate_organization_score(
                    session, org_id, tenant_id, calculation_date
                )
                
                if score_data['success']:
                    # Sauvegarder le score en BDD
                    await cls._save_score(session, org_id, tenant_id, score_data)
                    results.append({
                        'organization_id': org_id,
                        'success': True,
                        'score': score_data['overall_score']
                    })
                else:
                    results.append({
                        'organization_id': org_id,
                        'success': False,
                        'message': score_data.get('message')
                    })
            
            except Exception as e:
                logger.error(f"Error calculating score for {org_id}: {e}")
                results.append({
                    'organization_id': org_id,
                    'success': False,
                    'error': str(e)
                })
        
        return {
            'total_organizations': len(organizations),
            'successful': sum(1 for r in results if r['success']),
            'failed': sum(1 for r in results if not r['success']),
            'results': results
        }
    
    @classmethod
    async def _save_score(
        cls,
        session: AsyncSession,
        organization_id: UUID,
        tenant_id: UUID,
        score_data: Dict
    ):
        """Sauvegarder un score en base de données"""
        
        # Vérifier si score existe déjà
        check_query = text("""
            SELECT id FROM esg_scores
            WHERE organization_id = :org_id
                AND calculation_date = :calc_date
        """)
        
        result = await session.execute(
            check_query,
            {
                "org_id": str(organization_id),
                "calc_date": score_data['calculation_date']
            }
        )
        
        existing = result.fetchone()
        
        if existing:
            # Update
            update_query = text("""
                UPDATE esg_scores SET
                    environmental_score = :env,
                    social_score = :soc,
                    governance_score = :gov,
                    overall_score = :overall,
                    rating = :rating,
                    data_completeness = :completeness,
                    confidence_level = :confidence,
                    calculation_method = 'weighted_average',
                    updated_at = NOW()
                WHERE id = :id
            """)
            
            await session.execute(
                update_query,
                {
                    "id": str(existing[0]),
                    "env": score_data['environmental_score'],
                    "soc": score_data['social_score'],
                    "gov": score_data['governance_score'],
                    "overall": score_data['overall_score'],
                    "rating": score_data['rating'],
                    "completeness": score_data['data_completeness'],
                    "confidence": score_data['confidence_level']
                }
            )
        else:
            # Insert
            insert_query = text("""
                INSERT INTO esg_scores (
                    id, tenant_id, organization_id, calculation_date,
                    environmental_score, social_score, governance_score,
                    overall_score, rating, calculation_method,
                    data_completeness, confidence_level,
                    created_at, updated_at
                ) VALUES (
                    :id, :tenant_id, :org_id, :calc_date,
                    :env, :soc, :gov,
                    :overall, :rating, 'weighted_average',
                    :completeness, :confidence,
                    NOW(), NOW()
                )
            """)
            
            await session.execute(
                insert_query,
                {
                    "id": str(uuid4()),
                    "tenant_id": str(tenant_id),
                    "org_id": str(organization_id),
                    "calc_date": score_data['calculation_date'],
                    "env": score_data['environmental_score'],
                    "soc": score_data['social_score'],
                    "gov": score_data['governance_score'],
                    "overall": score_data['overall_score'],
                    "rating": score_data['rating'],
                    "completeness": score_data['data_completeness'],
                    "confidence": score_data['confidence_level']
                }
            )
        
        await session.commit()
