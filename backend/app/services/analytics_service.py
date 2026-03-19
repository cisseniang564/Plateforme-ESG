"""
Analytics & Intelligence Service - Anomaly detection, insights and predictions
"""
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta, date
from sqlalchemy import select, func, extract, and_
from sqlalchemy.ext.asyncio import AsyncSession
import statistics

from app.models.data_entry import DataEntry
from app.models.indicator_data import IndicatorData
from app.models.indicator import Indicator


class AnalyticsService:
    """Service for analytics and anomaly detection"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def detect_anomalies(
        self,
        tenant_id: UUID,
        year: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Detect anomalies in ESG data"""
        
        anomalies = []
        
        # Récupérer toutes les données
        query = select(DataEntry).where(DataEntry.tenant_id == tenant_id)
        if year:
            query = query.where(extract('year', DataEntry.period_start) == year)
        
        result = await self.db.execute(query)
        entries = result.scalars().all()
        
        if len(entries) < 3:
            return []  # Pas assez de données
        
        # Grouper par métrique
        metrics_data: Dict[str, List[float]] = {}
        for entry in entries:
            if entry.value_numeric is not None:
                key = entry.metric_name
                if key not in metrics_data:
                    metrics_data[key] = []
                metrics_data[key].append(entry.value_numeric)
        
        # Détecter anomalies par métrique
        for metric_name, values in metrics_data.items():
            if len(values) < 3:
                continue
            
            # Calcul statistiques
            mean = statistics.mean(values)
            try:
                stdev = statistics.stdev(values)
            except:
                continue
            
            if stdev == 0:
                continue
            
            # Détecter valeurs > 2 écarts-types
            for entry in entries:
                if entry.metric_name == metric_name and entry.value_numeric is not None:
                    z_score = abs((entry.value_numeric - mean) / stdev)
                    
                    if z_score > 2:  # Anomalie détectée
                        anomalies.append({
                            'id': str(entry.id),
                            'metric_name': metric_name,
                            'value': entry.value_numeric,
                            'expected_range': f"{mean - 2*stdev:.1f} - {mean + 2*stdev:.1f}",
                            'deviation': f"{z_score:.1f}σ",
                            'severity': 'high' if z_score > 3 else 'medium',
                            'period': entry.period_start.isoformat() if entry.period_start else None,
                            'category': entry.category,
                            'pillar': entry.pillar,
                            'message': self._generate_anomaly_message(metric_name, entry.value_numeric, mean, z_score)
                        })
        
        # Trier par sévérité
        anomalies.sort(key=lambda x: (x['severity'] == 'high', x['deviation']), reverse=True)
        
        return anomalies[:10]  # Top 10 anomalies
    
    def _generate_anomaly_message(self, metric: str, value: float, mean: float, z_score: float) -> str:
        """Generate human-readable anomaly message"""
        
        if value > mean:
            direction = "supérieure"
            advice = "Vérifier la saisie ou investiguer cette hausse inhabituelle"
        else:
            direction = "inférieure"
            advice = "Vérifier la saisie ou investiguer cette baisse inhabituelle"
        
        return f"Valeur {direction} à la moyenne ({mean:.1f}). {advice}."
    
    async def get_insights(
        self,
        tenant_id: UUID,
        year: int
    ) -> Dict[str, Any]:
        """Get intelligent insights about ESG performance"""
        
        # Récupérer données année courante
        current_query = select(DataEntry).where(
            and_(
                DataEntry.tenant_id == tenant_id,
                extract('year', DataEntry.period_start) == year
            )
        )
        current_result = await self.db.execute(current_query)
        current_entries = current_result.scalars().all()
        
        # Récupérer données année précédente
        prev_query = select(DataEntry).where(
            and_(
                DataEntry.tenant_id == tenant_id,
                extract('year', DataEntry.period_start) == year - 1
            )
        )
        prev_result = await self.db.execute(prev_query)
        prev_entries = prev_result.scalars().all()
        
        insights = {
            'year': year,
            'data_quality': self._analyze_data_quality(current_entries),
            'trends': self._analyze_trends(current_entries, prev_entries),
            'recommendations': [],
            'achievements': []
        }
        
        # Générer recommandations
        if insights['data_quality']['completion_rate'] < 70:
            insights['recommendations'].append({
                'type': 'data_completion',
                'priority': 'high',
                'message': f"Complétude à {insights['data_quality']['completion_rate']}%. Objectif: 90%+",
                'action': 'Compléter les données manquantes'
            })
        
        verified_rate = (insights['data_quality']['verified_count'] / 
                        max(insights['data_quality']['total_count'], 1) * 100)
        
        if verified_rate < 80:
            insights['recommendations'].append({
                'type': 'verification',
                'priority': 'medium',
                'message': f"Taux de vérification à {verified_rate:.0f}%. Objectif: 90%+",
                'action': 'Valider les données en attente'
            })
        
        # Identifier achievements
        if verified_rate >= 90:
            insights['achievements'].append({
                'type': 'quality',
                'message': '🏆 Excellence: 90%+ des données vérifiées',
                'icon': 'trophy'
            })
        
        if insights['trends']['improving_metrics'] > 3:
            insights['achievements'].append({
                'type': 'performance',
                'message': f'📈 {insights["trends"]["improving_metrics"]} indicateurs en amélioration',
                'icon': 'trending_up'
            })
        
        return insights
    
    def _analyze_data_quality(self, entries: List[DataEntry]) -> Dict[str, Any]:
        """Analyze data quality metrics"""
        
        total = len(entries)
        verified = sum(1 for e in entries if e.verification_status == 'verified')
        pending = sum(1 for e in entries if e.verification_status == 'pending')
        with_source = sum(1 for e in entries if e.data_source)
        
        return {
            'total_count': total,
            'verified_count': verified,
            'pending_count': pending,
            'completion_rate': min((total / 200) * 100, 100),  # Assume 200 indicateurs cibles
            'source_documentation': (with_source / max(total, 1)) * 100
        }
    
    def _analyze_trends(
        self,
        current_entries: List[DataEntry],
        prev_entries: List[DataEntry]
    ) -> Dict[str, Any]:
        """Analyze trends between periods"""
        
        # Grouper par métrique
        current_metrics = {}
        prev_metrics = {}
        
        for entry in current_entries:
            if entry.value_numeric is not None:
                current_metrics[entry.metric_name] = entry.value_numeric
        
        for entry in prev_entries:
            if entry.value_numeric is not None:
                prev_metrics[entry.metric_name] = entry.value_numeric
        
        # Comparer
        improving = 0
        declining = 0
        stable = 0
        
        for metric, current_val in current_metrics.items():
            if metric in prev_metrics:
                prev_val = prev_metrics[metric]
                change = ((current_val - prev_val) / prev_val * 100) if prev_val != 0 else 0
                
                if abs(change) < 5:
                    stable += 1
                elif change > 0:
                    # Pour certaines métriques, hausse = bon (ex: score)
                    # Pour d'autres, hausse = mauvais (ex: émissions)
                    if 'emission' in metric.lower() or 'turnover' in metric.lower():
                        declining += 1
                    else:
                        improving += 1
                else:
                    if 'emission' in metric.lower() or 'turnover' in metric.lower():
                        improving += 1
                    else:
                        declining += 1
        
        return {
            'improving_metrics': improving,
            'declining_metrics': declining,
            'stable_metrics': stable,
            'new_metrics': len(current_metrics) - len(set(current_metrics.keys()) & set(prev_metrics.keys()))
        }
    
    async def get_suggestions(
        self,
        tenant_id: UUID,
        year: int
    ) -> List[Dict[str, Any]]:
        """Get AI-powered suggestions for improvement"""
        
        insights = await self.get_insights(tenant_id, year)
        anomalies = await self.detect_anomalies(tenant_id, year)
        
        suggestions = []
        
        # Suggestions basées sur qualité données
        if insights['data_quality']['completion_rate'] < 80:
            suggestions.append({
                'category': 'data_quality',
                'priority': 'high',
                'title': 'Améliorer la complétude des données',
                'description': f"Votre complétude est à {insights['data_quality']['completion_rate']:.0f}%. Visez 90%+ pour un reporting fiable.",
                'action': 'Identifier et compléter les indicateurs manquants',
                'impact': 'Haute fiabilité reporting CSRD',
                'effort': 'Moyen'
            })
        
        # Suggestions basées sur anomalies
        if len(anomalies) > 5:
            suggestions.append({
                'category': 'anomalies',
                'priority': 'high',
                'title': f'{len(anomalies)} anomalies détectées',
                'description': 'Des valeurs inhabituelles ont été détectées dans vos données.',
                'action': 'Vérifier et corriger les anomalies signalées',
                'impact': 'Amélioration qualité données',
                'effort': 'Faible'
            })
        
        # Suggestions basées sur tendances
        if insights['trends']['declining_metrics'] > insights['trends']['improving_metrics']:
            suggestions.append({
                'category': 'performance',
                'priority': 'medium',
                'title': 'Tendance baissière détectée',
                'description': f"{insights['trends']['declining_metrics']} indicateurs en déclin vs {insights['trends']['improving_metrics']} en amélioration.",
                'action': 'Analyser les causes et définir plan d\'action',
                'impact': 'Inversion tendance négative',
                'effort': 'Élevé'
            })
        
        # Suggestions proactives
        suggestions.append({
            'category': 'best_practice',
            'priority': 'low',
            'title': 'Activer les calculs automatiques',
            'description': 'Gagnez du temps avec les formules pré-configurées (Scope 3, ratios, etc.)',
            'action': 'Consulter la page Calculs Automatiques',
            'impact': 'Gain de temps ×10',
            'effort': 'Très faible'
        })
        
        return suggestions

    async def get_predictions(
        self,
        tenant_id: UUID,
        horizon_months: int = 12,
    ) -> Dict[str, Any]:
        """Predict future ESG metric values using linear trend extrapolation."""

        # Fetch indicator time-series from indicator_data table
        result = await self.db.execute(
            select(IndicatorData)
            .join(Indicator, IndicatorData.indicator_id == Indicator.id)
            .where(IndicatorData.tenant_id == tenant_id)
            .order_by(Indicator.code, IndicatorData.date)
        )
        all_data = result.scalars().all()

        # Group by indicator
        by_indicator: Dict[str, list] = {}
        for d in all_data:
            key = str(d.indicator_id)
            by_indicator.setdefault(key, []).append(d)

        predictions = []
        for indicator_id, points in by_indicator.items():
            if len(points) < 3:
                continue  # Need at least 3 points for meaningful regression

            # Build x (days from first point) and y (values)
            t0 = points[0].date
            xs = [(p.date - t0).days for p in points]
            ys = [p.value for p in points]

            # Simple OLS linear regression
            n = len(xs)
            sum_x = sum(xs)
            sum_y = sum(ys)
            sum_xy = sum(x * y for x, y in zip(xs, ys))
            sum_x2 = sum(x * x for x in xs)
            denom = n * sum_x2 - sum_x ** 2
            if denom == 0:
                continue

            slope = (n * sum_xy - sum_x * sum_y) / denom
            intercept = (sum_y - slope * sum_x) / n

            # R² score
            y_mean = sum_y / n
            ss_tot = sum((y - y_mean) ** 2 for y in ys)
            ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, ys))
            r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

            # Generate future points (monthly)
            last_x = xs[-1]
            last_date = points[-1].date
            future_points = []
            for m in range(1, horizon_months + 1):
                future_days = last_x + m * 30
                future_val = intercept + slope * future_days
                future_d = date.fromordinal(last_date.toordinal() + m * 30)
                future_points.append({
                    "date": future_d.isoformat(),
                    "predicted_value": round(future_val, 2),
                    "confidence": max(0.3, min(0.95, r2 - 0.05 * m)),
                })

            # Trend direction
            if slope > 0.01:
                trend = "increasing"
            elif slope < -0.01:
                trend = "decreasing"
            else:
                trend = "stable"

            # Get indicator name
            ind = points[0].indicator if hasattr(points[0], 'indicator') else None
            ind_name = "Indicateur"
            ind_code = indicator_id[:8]
            if ind:
                ind_name = ind.name
                ind_code = ind.code

            predictions.append({
                "indicator_id": indicator_id,
                "indicator_name": ind_name,
                "indicator_code": ind_code,
                "unit": points[-1].unit or "",
                "historical_points": len(points),
                "r2_score": round(r2, 3),
                "trend": trend,
                "slope_per_day": round(slope, 4),
                "last_value": points[-1].value,
                "predicted_next_month": future_points[0]["predicted_value"] if future_points else None,
                "predicted_next_year": future_points[11]["predicted_value"] if len(future_points) >= 12 else None,
                "future_points": future_points,
            })

        # Sort by R² (most reliable predictions first)
        predictions.sort(key=lambda p: p["r2_score"], reverse=True)

        return {
            "horizon_months": horizon_months,
            "generated_at": datetime.utcnow().isoformat(),
            "predictions": predictions[:10],  # top 10 most reliable
            "total_indicators": len(predictions),
            "methodology": "Régression linéaire OLS sur données historiques",
        }
