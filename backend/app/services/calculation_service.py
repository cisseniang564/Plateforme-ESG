"""
Calculation Service - Automatic ESG calculations and formulas
IMPROVED: Better metric name matching and calculation logic
"""
from typing import List, Dict, Any, Optional
from decimal import Decimal
from uuid import UUID
from datetime import datetime, date
from sqlalchemy import select, and_, extract, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry


class CalculationService:
    """Service for automatic ESG calculations"""
    
    # Règles de calcul par indicateur
    FORMULAS = {
        # SCOPE 3 = SCOPE 1 + SCOPE 2
        'scope_3_total': {
            'inputs': ['scope_1', 'scope_2'],
            'formula': lambda s1, s2: s1 + s2,
            'unit': 'tCO2e',
            'category': 'emissions',
            'pillar': 'environmental',
            'display_name': 'Scope 3 Total'
        },
        
        # Intensité carbone = (Émissions totales / CA) × 1000
        'carbon_intensity': {
            'inputs': ['total_emissions', 'revenue'],
            'formula': lambda emissions, revenue: (emissions / revenue) * 1000 if revenue > 0 else 0,
            'unit': 'tCO2e/M€',
            'category': 'emissions',
            'pillar': 'environmental',
            'display_name': 'Carbon Intensity'
        },
        
        # Part énergies renouvelables = Renouvelable / Total énergie
        'renewable_percentage': {
            'inputs': ['renewable_energy', 'total_energy'],
            'formula': lambda renewable, total: (renewable / total * 100) if total > 0 else 0,
            'unit': '%',
            'category': 'energy',
            'pillar': 'environmental',
            'display_name': 'Renewable Percentage'
        },
        
        # Turnover = (Départs / Effectif moyen) * 100
        'turnover_rate': {
            'inputs': ['departures', 'average_headcount'],
            'formula': lambda departures, headcount: (departures / headcount * 100) if headcount > 0 else 0,
            'unit': '%',
            'category': 'workforce',
            'pillar': 'social',
            'display_name': 'Turnover Rate'
        },
        
        # Taux de formation = Heures formation / Effectif
        'training_rate': {
            'inputs': ['training_hours', 'headcount'],
            'formula': lambda hours, headcount: (hours / headcount) if headcount > 0 else 0,
            'unit': 'heures/personne',
            'category': 'training',
            'pillar': 'social',
            'display_name': 'Training Rate'
        },
        
        # Part de femmes = Femmes / Total * 100
        'women_percentage': {
            'inputs': ['women_count', 'total_headcount'],
            'formula': lambda women, total: (women / total * 100) if total > 0 else 0,
            'unit': '%',
            'category': 'diversity',
            'pillar': 'social',
            'display_name': 'Women Percentage'
        },
    }
    
    # Mapping des noms de métriques (variations possibles)
    METRIC_ALIASES = {
        'scope_1': ['Scope 1', 'Émissions GES Scope 1', 'scope 1', 'emissions scope 1'],
        'scope_2': ['Scope 2', 'Émissions GES Scope 2', 'scope 2', 'emissions scope 2'],
        'total_emissions': ['Total emissions', 'Émissions totales', 'total emissions'],
        'revenue': ['Revenue', 'Chiffre d\'affaires', 'CA', 'revenue', 'chiffre affaires'],
        'renewable_energy': ['Renewable energy', 'Énergie renouvelable', 'renewable energy', 'energie renouvelable'],
        'total_energy': ['Total energy', 'Consommation énergie', 'total energy', 'consommation energie', 'Énergie totale'],
        'departures': ['Departures', 'Départs', 'departures', 'departs'],
        'average_headcount': ['Average headcount', 'Effectif moyen', 'average headcount', 'effectif moyen', 'Effectif total'],
        'training_hours': ['Training hours', 'Heures formation', 'training hours', 'heures formation'],
        'headcount': ['Headcount', 'Effectif', 'headcount', 'effectif', 'Effectif total'],
        'women_count': ['Women count', 'Effectif femmes', 'women count', 'effectif femmes', 'Femmes'],
        'total_headcount': ['Total headcount', 'Effectif total', 'total headcount', 'effectif total'],
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db

    def _to_float(self, value: Any) -> Optional[float]:
        """Safely convert numeric values for calculations."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, Decimal):
            return float(value)
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    
    def _normalize_metric_name(self, name: str) -> str:
        """Normalize metric name for matching"""
        if not name:
            return ''
        return str(name).lower().strip()
    
    def _find_metric_value(self, data: Dict[str, float], canonical_name: str) -> Optional[float]:
        """Find metric value using aliases"""
        aliases = self.METRIC_ALIASES.get(canonical_name, [])
        
        for alias in aliases:
            normalized = self._normalize_metric_name(alias)
            if normalized in data:
                return data[normalized]
        
        return None
    
    async def calculate_metrics(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
        year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Calculate all automatic metrics"""
        
        # Récupérer toutes les données pour le calcul
        data = await self._get_data_for_calculation(tenant_id, organization_id, year)
        
        results = {}
        
        # Calculer chaque formule
        for metric_name, formula_def in self.FORMULAS.items():
            try:
                # Récupérer les inputs nécessaires
                input_values = []
                input_names_found = {}
                
                for input_name in formula_def['inputs']:
                    value = self._find_metric_value(data, input_name)
                    if value is None:
                        # Input manquant, on skip ce calcul
                        break
                    safe_value = self._to_float(value)
                    if safe_value is None:
                        break
                    input_values.append(safe_value)
                    input_names_found[input_name] = safe_value
                
                if len(input_values) == len(formula_def['inputs']):
                    # Calculer
                    calculated_value = formula_def['formula'](*input_values)
                    
                    results[metric_name] = {
                        'name': formula_def['display_name'],
                        'value': round(calculated_value, 2),
                        'unit': formula_def['unit'],
                        'category': formula_def['category'],
                        'pillar': formula_def['pillar'],
                        'inputs_used': input_names_found,
                    }
            except Exception as e:
                # Erreur de calcul, on skip
                print(f"Error calculating {metric_name}: {e}")
                continue
        
        return results
    
    async def calculate_evolution(
        self,
        tenant_id: UUID,
        metric_name: str,
        current_year: int,
        previous_year: int,
        organization_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Calculate year-over-year evolution for a metric"""
        
        # Valeur année courante
        current_value = await self._get_metric_value(
            tenant_id, metric_name, current_year, organization_id
        )
        
        # Valeur année précédente
        previous_value = await self._get_metric_value(
            tenant_id, metric_name, previous_year, organization_id
        )
        
        if current_value is None or previous_value is None:
            return {
                'current_year': current_year,
                'current_value': current_value,
                'previous_year': previous_year,
                'previous_value': previous_value,
                'evolution': None,
                'evolution_percentage': None,
            }
        
        current_value = self._to_float(current_value) or 0.0
        previous_value = self._to_float(previous_value) or 0.0

        evolution = current_value - previous_value
        evolution_percentage = (evolution / previous_value * 100) if previous_value != 0 else 0
        
        return {
            'current_year': current_year,
            'current_value': round(current_value, 2),
            'previous_year': previous_year,
            'previous_value': round(previous_value, 2),
            'evolution': round(evolution, 2),
            'evolution_percentage': round(evolution_percentage, 2),
            'trend': 'up' if evolution > 0 else 'down' if evolution < 0 else 'stable',
        }
    
    async def calculate_aggregation(
        self,
        tenant_id: UUID,
        metric_name: str,
        year: int,
        organization_ids: List[UUID],
    ) -> Dict[str, Any]:
        """Aggregate metric across multiple organizations (for groups)"""
        
        total = 0
        count = 0
        by_org = {}
        
        for org_id in organization_ids:
            value = await self._get_metric_value(tenant_id, metric_name, year, org_id)
            if value is not None:
                total += value
                count += 1
                by_org[str(org_id)] = round(value, 2)
        
        return {
            'total': round(total, 2),
            'average': round(total / count, 2) if count > 0 else 0,
            'count': count,
            'by_organization': by_org,
        }
    
    async def _get_data_for_calculation(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID],
        year: Optional[int],
    ) -> Dict[str, float]:
        """Get all data needed for calculations"""
        
        query = select(DataEntry).where(DataEntry.tenant_id == tenant_id)
        
        if organization_id:
            query = query.where(DataEntry.organization_id == organization_id)
        
        if year:
            query = query.where(extract('year', DataEntry.period_start) == year)
        
        # Most recent data first so latest imports win when the same metric exists multiple times
        if hasattr(DataEntry, 'updated_at'):
            query = query.order_by(DataEntry.updated_at.desc(), DataEntry.period_start.desc())
        elif hasattr(DataEntry, 'created_at'):
            query = query.order_by(DataEntry.created_at.desc(), DataEntry.period_start.desc())
        else:
            query = query.order_by(DataEntry.period_start.desc())
        
        result = await self.db.execute(query)
        entries = result.scalars().all()
        
        data = {}
        for entry in entries:
            normalized_name = self._normalize_metric_name(getattr(entry, 'metric_name', None))
            numeric_value = self._to_float(getattr(entry, 'value_numeric', None))

            if not normalized_name or numeric_value is None:
                continue

            # Keep the first value only because the query is ordered from newest to oldest.
            if normalized_name in data:
                continue

            data[normalized_name] = numeric_value
        
        return data
    
    async def _get_metric_value(
        self,
        tenant_id: UUID,
        metric_name: str,
        year: int,
        organization_id: Optional[UUID] = None,
    ) -> Optional[float]:
        """Get a single metric value"""
        
        query = select(DataEntry).where(
            and_(
                DataEntry.tenant_id == tenant_id,
                DataEntry.metric_name.ilike(f"%{metric_name}%"),
                extract('year', DataEntry.period_start) == year,
            )
        )

        if hasattr(DataEntry, 'updated_at'):
            query = query.order_by(DataEntry.updated_at.desc(), DataEntry.period_start.desc())
        elif hasattr(DataEntry, 'created_at'):
            query = query.order_by(DataEntry.created_at.desc(), DataEntry.period_start.desc())
        else:
            query = query.order_by(DataEntry.period_start.desc())

        if organization_id:
            query = query.where(DataEntry.organization_id == organization_id)

        result = await self.db.execute(query)
        entries = result.scalars().all()

        for entry in entries:
            numeric_value = self._to_float(getattr(entry, 'value_numeric', None))
            if numeric_value is not None:
                return numeric_value

        return None
    
    async def get_kpis_summary(
        self,
        tenant_id: UUID,
        year: int,
        organization_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Get summary of key KPIs with calculations"""
        
        # Calculs automatiques
        calculated = await self.calculate_metrics(tenant_id, organization_id, year)
        
        # KPIs clés
        kpis = {
            'environmental': [],
            'social': [],
            'governance': [],
        }
        
        # Organiser par pilier
        for metric_name, data in calculated.items():
            pillar = data['pillar']
            kpis[pillar].append({
                'name': data['name'],
                'value': data['value'],
                'unit': data['unit'],
            })
        
        # Ajouter évolutions pour les métriques clés
        evolution_metrics = ['emissions_co2', 'turnover', 'training_hours']
        evolutions = {}
        
        for metric in evolution_metrics:
            evolution = await self.calculate_evolution(
                tenant_id, metric, year, year - 1, organization_id
            )
            if evolution['evolution_percentage'] is not None:
                evolutions[metric] = evolution
        
        return {
            'year': year,
            'calculated_kpis': kpis,
            'evolutions': evolutions,
            'total_calculated': len(calculated),
        }
