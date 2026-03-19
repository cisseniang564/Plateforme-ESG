"""
Data Quality Service - Validation et qualité des données ESG.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.organization import Organization


class DataQualityService:
    """
    Service de validation et contrôle qualité des données ESG.
    
    Responsabilités:
    - Validation des valeurs (ranges, types, cohérence)
    - Détection d'anomalies (outliers, valeurs aberrantes)
    - Calcul de métriques de qualité
    - Suggestions d'amélioration
    """
    
    # Ranges acceptables par indicateur
    ACCEPTABLE_RANGES = {
        'ENV-001': (0, 100000),      # Carbon emissions tCO2e
        'ENV-002': (0, 50000),       # Water consumption m³
        'SOC-001': (0, 100),         # Employee satisfaction %
        'SOC-002': (0, 200),         # Training hours per employee
        'GOV-001': (0, 100),         # Board diversity %
        'GOV-002': (0, 100),         # Ethics training completion %
    }
    
    # Variations maximales acceptables (mois sur mois)
    MAX_MONTHLY_VARIATION = {
        'ENV-001': 0.30,  # ±30%
        'ENV-002': 0.25,  # ±25%
        'SOC-001': 0.15,  # ±15%
        'SOC-002': 0.20,  # ±20%
        'GOV-001': 0.10,  # ±10%
        'GOV-002': 0.15,  # ±15%
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def validate_data_point(
        self,
        indicator_code: str,
        value: float,
        unit: str,
        date: date,
        organization_id: UUID,
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """
        Valider un point de données avant insertion.
        
        Returns:
            {
                'is_valid': bool,
                'warnings': List[str],
                'errors': List[str],
                'quality_score': float (0-100)
            }
        """
        
        warnings = []
        errors = []
        
        # 1. Validation du range
        min_val, max_val = self.ACCEPTABLE_RANGES.get(indicator_code, (float('-inf'), float('inf')))
        
        if value < min_val or value > max_val:
            errors.append(
                f"Value {value} out of acceptable range [{min_val}, {max_val}] for {indicator_code}"
            )
        
        # 2. Validation de cohérence temporelle
        variation_warning = await self._check_temporal_consistency(
            tenant_id=tenant_id,
            organization_id=organization_id,
            indicator_code=indicator_code,
            value=value,
            date=date
        )
        
        if variation_warning:
            warnings.append(variation_warning)
        
        # 3. Validation du type et unité
        # Récupérer l'indicateur
        indicator_query = select(Indicator).where(
            and_(
                Indicator.tenant_id == tenant_id,
                Indicator.code == indicator_code
            )
        )
        indicator_result = await self.db.execute(indicator_query)
        indicator = indicator_result.scalar_one_or_none()
        
        if indicator:
            if indicator.unit != unit:
                warnings.append(
                    f"Unit mismatch: expected {indicator.unit}, got {unit}"
                )
        
        # 4. Calcul du score de qualité
        quality_score = 100.0
        quality_score -= len(errors) * 30  # -30 points par erreur
        quality_score -= len(warnings) * 10  # -10 points par warning
        quality_score = max(0, quality_score)
        
        return {
            'is_valid': len(errors) == 0,
            'warnings': warnings,
            'errors': errors,
            'quality_score': quality_score
        }
    
    async def _check_temporal_consistency(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        indicator_code: str,
        value: float,
        date: date
    ) -> Optional[str]:
        """Vérifier la cohérence temporelle (variations anormales)."""
        
        # Récupérer la valeur du mois précédent
        query = select(IndicatorData).join(
            Indicator,
            IndicatorData.indicator_id == Indicator.id
        ).where(
            and_(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.organization_id == organization_id,
                Indicator.code == indicator_code,
                IndicatorData.date < date
            )
        ).order_by(IndicatorData.date.desc()).limit(1)
        
        result = await self.db.execute(query)
        previous_data = result.scalar_one_or_none()
        
        if previous_data:
            previous_value = float(previous_data.value)
            
            if previous_value > 0:
                variation = abs(value - previous_value) / previous_value
                max_variation = self.MAX_MONTHLY_VARIATION.get(indicator_code, 0.5)
                
                if variation > max_variation:
                    return (
                        f"Large variation detected: {variation*100:.1f}% change from previous month "
                        f"(previous: {previous_value}, current: {value})"
                    )
        
        return None
    
    async def calculate_organization_data_quality(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        months: int = 12
    ) -> Dict[str, Any]:
        """
        Calculer les métriques de qualité des données d'une organisation.
        
        Returns:
            {
                'overall_quality': float (0-100),
                'completeness': float (0-100),
                'consistency': float (0-100),
                'accuracy': float (0-100),
                'timeliness': float (0-100),
                'issues': List[Dict],
                'recommendations': List[str]
            }
        """
        
        # 1. Complétude (combien de points de données attendus vs réels)
        completeness = await self._calculate_completeness(
            tenant_id, organization_id, months
        )
        
        # 2. Cohérence (variations anormales, outliers)
        consistency = await self._calculate_consistency(
            tenant_id, organization_id, months
        )
        
        # 3. Précision (données vérifiées vs non vérifiées)
        accuracy = await self._calculate_accuracy(
            tenant_id, organization_id, months
        )
        
        # 4. Fraîcheur (données récentes vs anciennes)
        timeliness = await self._calculate_timeliness(
            tenant_id, organization_id
        )
        
        # Score global (moyenne pondérée)
        overall_quality = (
            completeness * 0.30 +
            consistency * 0.25 +
            accuracy * 0.25 +
            timeliness * 0.20
        )
        
        # Générer des recommandations
        recommendations = self._generate_recommendations(
            completeness, consistency, accuracy, timeliness
        )
        
        return {
            'overall_quality': round(overall_quality, 2),
            'completeness': round(completeness, 2),
            'consistency': round(consistency, 2),
            'accuracy': round(accuracy, 2),
            'timeliness': round(timeliness, 2),
            'recommendations': recommendations
        }
    
    async def _calculate_completeness(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        months: int
    ) -> float:
        """Calculer la complétude des données."""
        
        # Compter les indicateurs actifs
        indicators_query = select(Indicator).where(
            and_(
                Indicator.tenant_id == tenant_id,
                Indicator.is_active == True
            )
        )
        indicators_result = await self.db.execute(indicators_query)
        active_indicators = len(list(indicators_result.scalars().all()))
        
        if active_indicators == 0:
            return 0.0
        
        # Compter les points de données
        data_query = select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.organization_id == organization_id
            )
        )
        data_result = await self.db.execute(data_query)
        data_points = len(list(data_result.scalars().all()))
        
        expected_points = active_indicators * months
        completeness = (data_points / expected_points) * 100 if expected_points > 0 else 0
        
        return min(100, completeness)
    
    async def _calculate_consistency(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        months: int
    ) -> float:
        """Calculer la cohérence des données."""
        
        # Récupérer toutes les données
        query = select(IndicatorData, Indicator).join(
            Indicator,
            IndicatorData.indicator_id == Indicator.id
        ).where(
            and_(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.organization_id == organization_id
            )
        ).order_by(Indicator.code, IndicatorData.date)
        
        result = await self.db.execute(query)
        rows = list(result.all())
        
        if len(rows) < 2:
            return 100.0  # Pas assez de données pour vérifier
        
        # Grouper par indicateur
        by_indicator = {}
        for data, indicator in rows:
            code = indicator.code
            if code not in by_indicator:
                by_indicator[code] = []
            by_indicator[code].append(float(data.value))
        
        # Vérifier les variations
        total_checks = 0
        anomalies = 0
        
        for code, values in by_indicator.items():
            max_var = self.MAX_MONTHLY_VARIATION.get(code, 0.5)
            
            for i in range(1, len(values)):
                if values[i-1] > 0:
                    variation = abs(values[i] - values[i-1]) / values[i-1]
                    total_checks += 1
                    
                    if variation > max_var:
                        anomalies += 1
        
        if total_checks == 0:
            return 100.0
        
        consistency = ((total_checks - anomalies) / total_checks) * 100
        return consistency
    
    async def _calculate_accuracy(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        months: int
    ) -> float:
        """Calculer la précision (données vérifiées)."""
        
        # Compter total et vérifiées
        total_query = select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.organization_id == organization_id
            )
        )
        total_result = await self.db.execute(total_query)
        total = len(list(total_result.scalars().all()))
        
        verified_query = select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.organization_id == organization_id,
                IndicatorData.is_verified == True
            )
        )
        verified_result = await self.db.execute(verified_query)
        verified = len(list(verified_result.scalars().all()))
        
        if total == 0:
            return 0.0
        
        accuracy = (verified / total) * 100
        return accuracy
    
    async def _calculate_timeliness(
        self,
        tenant_id: UUID,
        organization_id: UUID
    ) -> float:
        """Calculer la fraîcheur des données."""
        
        # Récupérer la date la plus récente
        query = select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.organization_id == organization_id
            )
        ).order_by(IndicatorData.date.desc()).limit(1)
        
        result = await self.db.execute(query)
        latest_data = result.scalar_one_or_none()
        
        if not latest_data:
            return 0.0
        
        # Calculer l'âge en jours
        age_days = (date.today() - latest_data.date).days
        
        # Score de fraîcheur (100% si < 30 jours, décroît ensuite)
        if age_days <= 30:
            timeliness = 100.0
        elif age_days <= 90:
            timeliness = 100.0 - ((age_days - 30) / 60) * 50  # 50-100%
        elif age_days <= 180:
            timeliness = 50.0 - ((age_days - 90) / 90) * 30   # 20-50%
        else:
            timeliness = max(0, 20.0 - ((age_days - 180) / 180) * 20)  # 0-20%
        
        return timeliness
    
    def _generate_recommendations(
        self,
        completeness: float,
        consistency: float,
        accuracy: float,
        timeliness: float
    ) -> List[str]:
        """Générer des recommandations d'amélioration."""
        
        recommendations = []
        
        if completeness < 70:
            recommendations.append(
                "⚠️ Complétude faible: Ajoutez des données pour tous les indicateurs actifs"
            )
        
        if consistency < 70:
            recommendations.append(
                "⚠️ Incohérences détectées: Vérifiez les variations anormales dans vos données"
            )
        
        if accuracy < 50:
            recommendations.append(
                "⚠️ Peu de données vérifiées: Mettez en place un processus de validation"
            )
        
        if timeliness < 60:
            recommendations.append(
                "⚠️ Données anciennes: Importez des données plus récentes"
            )
        
        if len(recommendations) == 0:
            recommendations.append("✅ Excellente qualité des données !")
        
        return recommendations
