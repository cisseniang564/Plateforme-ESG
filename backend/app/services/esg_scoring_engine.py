"""
ESG Scoring Engine - Moteur de calcul des scores ESG.
Implémente la logique de scoring, pondération et benchmarking.
"""
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID
from datetime import date, datetime, timedelta, timezone

import numpy as np
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.organization import Organization
from app.models.esg_score import ESGScore
from app.models.sector_weight import SectorWeight
from app.models.data_entry import DataEntry


class ESGScoringEngine:
    """
    Moteur de calcul des scores ESG.

    Méthodologie:
    1. Collecte des données brutes par indicateur
    2. Normalisation des valeurs (0-100) avec gestion des outliers
    3. Application des pondérations sectorielles
    4. Agrégation par pilier (E, S, G)
    5. Calcul du score global pondéré
    6. Attribution du rating
    7. Calcul du percentile sectoriel
    """

    # Seuils de rating ESG
    RATING_THRESHOLDS = {
        "AAA": 85.0,
        "AA": 75.0,
        "A": 65.0,
        "BBB": 55.0,
        "BB": 45.0,
        "B": 35.0,
        "CCC": 25.0,
        "CC": 15.0,
        "C": 0.0,
    }

    # Ranges de référence par indicateur
    BENCHMARK_RANGES = {
        "ENV-001": {"min": 0, "max": 2000, "unit": "tCO2e", "name": "Émissions carbone"},
        "ENV-002": {"min": 0, "max": 3000, "unit": "m³", "name": "Consommation eau"},
        "ENV-003": {"min": 0, "max": 1000, "unit": "MWh", "name": "Consommation énergie"},
        "ENV-004": {"min": 0, "max": 100, "unit": "%", "name": "Énergie renouvelable"},
        "SOC-001": {"min": 0, "max": 100, "unit": "%", "name": "Satisfaction employés"},
        "SOC-002": {"min": 0, "max": 80, "unit": "heures", "name": "Formation annuelle"},
        "SOC-003": {"min": 0, "max": 30, "unit": "%", "name": "Turnover"},
        "GOV-001": {"min": 0, "max": 100, "unit": "%", "name": "Diversité conseil"},
        "GOV-002": {"min": 0, "max": 100, "unit": "%", "name": "Formation éthique"},
        "GOV-003": {"min": 0, "max": 50, "unit": "%", "name": "Indépendance CA"},
    }

    # Sens des indicateurs (higher_is_better)
    INDICATOR_DIRECTION = {
        "ENV-001": False,  # émissions carbone : lower is better
        "ENV-002": False,
        "ENV-003": False,
        "ENV-004": True,
        "SOC-001": True,
        "SOC-002": True,
        "SOC-003": False,
        "GOV-001": True,
        "GOV-002": True,
        "GOV-003": True,
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_organization_score(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        calculation_date: Optional[date] = None,
        period_months: int = 12,
        use_rolling_avg: bool = True,
        include_trend: bool = True,
    ) -> Dict[str, Any]:
        """
        Calculer le score ESG complet d'une organisation.
        """
        if calculation_date is None:
            calculation_date = date.today()

        # 1) Orga
        org_query = select(Organization).where(
            Organization.id == organization_id,
            Organization.tenant_id == tenant_id,
        )
        org_result = await self.db.execute(org_query)
        organization = org_result.scalar_one_or_none()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")

        # 2) Secteur
        sector_code = await self._determine_sector(organization)

        # 3) Pondérations sectorielles
        sector_weights = await self._get_sector_weights(tenant_id, sector_code)

        # 4) Données indicateurs (IndicatorData en priorité, DataEntry en fallback)
        indicator_data = await self._collect_indicator_data(
            tenant_id=tenant_id,
            organization_id=organization_id,
            calculation_date=calculation_date,
            period_months=period_months,
            use_rolling_avg=use_rolling_avg,
        )
        # Fallback si aucune donnée ou données insuffisantes pour scorer
        # (< 5 métriques = impossible de calculer les 3 piliers E/S/G correctement)
        if not indicator_data or len(indicator_data) < 5:
            data_entries_data = await self._collect_from_data_entries(
                tenant_id=tenant_id,
                organization_id=organization_id,
                calculation_date=calculation_date,
                period_months=period_months,
            )
            if data_entries_data and len(data_entries_data) >= len(indicator_data or {}):
                indicator_data = data_entries_data
        if not indicator_data:
            raise ValueError("No indicator data found for scoring")

        # ✅ 5) Scores piliers (FIX MAJEUR)
        pillar_scores, pillar_details = await self._calculate_pillar_scores(
            indicator_data=indicator_data,
            sector_weights=sector_weights,
        )

        # 6) Score global
        overall_score = self._calculate_overall_score(pillar_scores, sector_weights)

        # 7) Rating
        rating = self._calculate_rating(overall_score)

        # 8) Qualité
        data_quality = self._calculate_data_quality(indicator_data)

        # 9) Tendance (optionnel)
        trend_analysis = None
        if include_trend:
            trend_analysis = await self._analyze_trend(
                tenant_id=tenant_id,
                organization_id=organization_id,
                calculation_date=calculation_date,
            )

        # 10) Benchmarks sectoriels
        benchmarks = await self._calculate_sector_benchmarks(
            tenant_id=tenant_id,
            sector_code=sector_code,
            organization_score=overall_score,
            calculation_date=calculation_date,
        )

        # 11) Sauvegarde en base
        esg_score = await self._save_score(
            tenant_id=tenant_id,
            organization_id=organization_id,
            calculation_date=calculation_date,
            environmental_score=pillar_scores["environmental"],
            social_score=pillar_scores["social"],
            governance_score=pillar_scores["governance"],
            overall_score=overall_score,
            rating=rating,
            sector_code=sector_code,
            weights_applied=sector_weights,
            indicator_contributions=indicator_data,
            percentile_rank=benchmarks.get("percentile_rank"),
            sector_median=benchmarks.get("sector_median"),
            data_completeness=data_quality["completeness"],
            confidence_level=data_quality["confidence_level"],
        )

        return {
            "score_id": str(esg_score.id),
            "organization_id": str(organization_id),
            "organization_name": organization.name,
            "calculation_date": calculation_date.isoformat(),
            "overall_score": round(overall_score, 2),
            "rating": rating,
            "environmental_score": round(pillar_scores["environmental"], 2),
            "social_score": round(pillar_scores["social"], 2),
            "governance_score": round(pillar_scores["governance"], 2),
            "pillar_scores": {
                "environmental": round(pillar_scores["environmental"], 2),
                "social": round(pillar_scores["social"], 2),
                "governance": round(pillar_scores["governance"], 2),
            },
            "pillar_details": pillar_details,  # utile pour debug UI
            "weights_applied": {
                "environmental": sector_weights["environmental_weight"],
                "social": sector_weights["social_weight"],
                "governance": sector_weights["governance_weight"],
            },
            "sector": sector_code,
            "data_completeness": data_quality["completeness"],
            "confidence_level": data_quality["confidence_level"],
            "data_quality": data_quality,
            "benchmarks": benchmarks,
            "indicators_used": len(indicator_data),
            "trend": trend_analysis,
        }

    async def _determine_sector(self, organization: Organization) -> str:
        """Déterminer le secteur d'activité de l'organisation."""
        if organization.industry:
            return organization.industry

        if getattr(organization, "custom_data", None):
            insee_data = organization.custom_data.get("insee", {})
            secteur = insee_data.get("secteur")
            if secteur:
                return secteur

            code_naf = insee_data.get("code_naf")
            if code_naf:
                naf_prefix = code_naf[:2]
                sector_mapping = {
                    "01": "agriculture",
                    "10": "agroalimentaire",
                    "19": "energie",
                    "20": "chimie",
                    "24": "metallurgie",
                    "26": "tech",
                    "41": "construction",
                    "47": "commerce",
                    "55": "hotellerie",
                    "62": "services",
                    "64": "finance",
                    "84": "public",
                }
                return sector_mapping.get(naf_prefix, "default")

        return "default"

    async def _get_sector_weights(self, tenant_id: UUID, sector_code: str) -> Dict[str, Any]:
        """Récupérer les pondérations sectorielles."""
        query = select(SectorWeight).where(
            SectorWeight.tenant_id == tenant_id,
            SectorWeight.sector_code == sector_code,
        )
        result = await self.db.execute(query)
        sector_weight = result.scalar_one_or_none()

        if not sector_weight:
            default_weights = self._get_default_weights_for_sector(sector_code)
            return {
                "environmental_weight": default_weights["E"],
                "social_weight": default_weights["S"],
                "governance_weight": default_weights["G"],
                "indicator_weights": {},
            }

        return {
            "environmental_weight": sector_weight.environmental_weight,
            "social_weight": sector_weight.social_weight,
            "governance_weight": sector_weight.governance_weight,
            "indicator_weights": sector_weight.indicator_weights or {},
        }

    def _get_default_weights_for_sector(self, sector_code: str) -> Dict[str, float]:
        """Pondérations par défaut selon le secteur."""
        sector_weights = {
            "energie": {"E": 45.0, "S": 30.0, "G": 25.0},
            "industrie": {"E": 40.0, "S": 35.0, "G": 25.0},
            "finance": {"E": 25.0, "S": 35.0, "G": 40.0},
            "tech": {"E": 20.0, "S": 40.0, "G": 40.0},
            "agriculture": {"E": 50.0, "S": 30.0, "G": 20.0},
            "commerce": {"E": 30.0, "S": 40.0, "G": 30.0},
            "services": {"E": 25.0, "S": 40.0, "G": 35.0},
            "default": {"E": 33.33, "S": 33.33, "G": 33.34},
        }
        return sector_weights.get(sector_code, sector_weights["default"])

    async def _collect_indicator_data(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        calculation_date: date,
        period_months: int,
        use_rolling_avg: bool = True,
    ) -> Dict[str, Dict[str, Any]]:
        """Collecter et agréger les données des indicateurs."""
        start_date = calculation_date - timedelta(days=period_months * 30)

        query = (
            select(IndicatorData, Indicator)
            .join(Indicator, IndicatorData.indicator_id == Indicator.id)
            .where(
                and_(
                    IndicatorData.tenant_id == tenant_id,
                    IndicatorData.organization_id == organization_id,
                    IndicatorData.date >= start_date,
                    IndicatorData.date <= calculation_date,
                    Indicator.is_active == True,  # noqa: E712
                )
            )
            .order_by(IndicatorData.date.desc())
        )

        result = await self.db.execute(query)
        rows = result.all()
        if not rows:
            return {}

        indicator_groups: Dict[str, List[Tuple[IndicatorData, Indicator]]] = {}
        for data, indicator in rows:
            indicator_groups.setdefault(indicator.code, []).append((data, indicator))

        indicator_results: Dict[str, Dict[str, Any]] = {}

        for code, data_list in indicator_groups.items():
            values = [float(d.value) for d, _ in data_list]
            indicator = data_list[0][1]

            if use_rolling_avg and len(values) >= 3:
                avg_value = sum(values[:3]) / 3
            else:
                avg_value = sum(values) / len(values)

            clean_values = self._remove_outliers(values)
            robust_avg = (sum(clean_values) / len(clean_values)) if clean_values else avg_value

            normalized_score = self._normalize_value(
                value=robust_avg,
                indicator_code=code,
                higher_is_better=self.INDICATOR_DIRECTION.get(code, True),
            )

            # ✅ FIX: trend dépend du sens de l’indicateur
            trend = self._calculate_indicator_trend(values, indicator_code=code)

            weight = 1.0  # poids par défaut (peut être surchargé par sector_weights.indicator_weights)

            indicator_results[code] = {
                "pillar": indicator.pillar.value if hasattr(indicator.pillar, "value") else str(indicator.pillar),
                "name": indicator.name,
                "unit": indicator.unit,
                "values": values[:6],
                "count": len(values),
                "avg_value": round(robust_avg, 2),
                "normalized_score": round(normalized_score, 2),
                "weight": weight,
                "trend": trend,
                "min_value": round(min(values), 2),
                "max_value": round(max(values), 2),
                "std_dev": round(float(np.std(values)), 2) if len(values) > 1 else 0.0,
            }

        return indicator_results

    # Reverse-mapping metric_name → code (DEFAULT_METRICS + variantes historiques)
    _METRIC_NAME_TO_CODE: Dict[str, str] = {
        # ── Noms DEFAULT_METRICS actuels ──────────────────────────────────────
        'Émissions Scope 1 (tCO2e)': 'ENV-001',
        'Émissions Scope 2 (tCO2e)': 'ENV-002',
        'Consommation énergie totale (MWh)': 'ENV-003',
        'Part énergie renouvelable (%)': 'ENV-004',
        'Consommation eau (m3)': 'ENV-005',
        'Effectif total (ETP)': 'SOC-001',
        'Accidents du travail': 'SOC-003',
        'Heures de formation': 'SOC-004',
        'Part femmes encadrement (%)': 'SOC-005',
        'Part administrateurs indépendants (%)': 'GOV-001',
        'Score politique anti-corruption': 'GOV-002',
        'Réunions conseil administration': 'GOV-003',
        'Scope 3 Cat.1 - Achats de biens & services (tCO2e)': 'S3-001',
        'Scope 3 Cat.4 - Transport & distribution amont (tCO2e)': 'S3-004',
        'Scope 3 Cat.5 - Déchets générés exploitation (tCO2e)': 'S3-005',
        'Scope 3 Cat.6 - Déplacements professionnels (tCO2e)': 'S3-006',
        'Scope 3 Cat.7 - Trajets domicile-travail (tCO2e)': 'S3-007',
        'Scope 3 Cat.9 - Transport & distribution aval (tCO2e)': 'S3-009',
        'Scope 3 Cat.11 - Utilisation des produits vendus (tCO2e)': 'S3-011',
        'Scope 3 Cat.15 - Investissements financés (tCO2e)': 'S3-015',
        # ── Variantes / noms hérités ──────────────────────────────────────────
        'Émissions GES scope 1': 'ENV-001',
        'Émissions GES Scope 1': 'ENV-001',
        'Émissions GES scope 2': 'ENV-002',
        'Émissions GES Scope 2': 'ENV-002',
        'Consommation énergie': 'ENV-003',
        "Consommation d'énergie totale": 'ENV-003',
        "Part d'énergie renouvelable": 'ENV-004',
        'Énergie renouvelable': 'ENV-004',
        "Consommation d'eau": 'ENV-005',
        'Effectif total': 'SOC-001',
        "Taux d'accidents du travail (TAF)": 'SOC-003',
        'Taux de turnover': 'SOC-003',
        'Heures de formation par salarié': 'SOC-004',
        'Heures formation': 'SOC-004',
        "Part de femmes dans l'encadrement": 'SOC-005',
        'Administrateurs indépendants': 'GOV-001',
        "Part de femmes au conseil d'administration": 'GOV-001',
        'Indice de corruption et éthique': 'GOV-002',
        'Réunions du conseil par an': 'GOV-003',
    }

    async def _collect_from_data_entries(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        calculation_date: date,
        period_months: int,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Fallback: collecte les données depuis data_entries (avant migration IndicatorData).
        Retourne le même format que _collect_indicator_data.
        """
        start_date = calculation_date - timedelta(days=period_months * 30)

        query = (
            select(DataEntry)
            .where(
                and_(
                    DataEntry.tenant_id == tenant_id,
                    DataEntry.organization_id == organization_id,
                    DataEntry.period_start >= start_date,
                    DataEntry.period_start <= calculation_date,
                )
            )
            .order_by(DataEntry.period_start.desc())
        )
        result = await self.db.execute(query)
        rows = result.scalars().all()
        if not rows:
            return {}

        # Regrouper par métrique
        groups: Dict[str, List[DataEntry]] = {}
        for entry in rows:
            groups.setdefault(entry.metric_name, []).append(entry)

        indicator_results: Dict[str, Dict[str, Any]] = {}

        for metric_name, entries in groups.items():
            code = self._METRIC_NAME_TO_CODE.get(metric_name, metric_name[:10])
            values = [float(e.value_numeric) for e in entries if e.value_numeric is not None]
            if not values:
                continue

            avg_value = sum(values) / len(values)
            clean_values = self._remove_outliers(values)
            robust_avg = (sum(clean_values) / len(clean_values)) if clean_values else avg_value

            higher_is_better = self.INDICATOR_DIRECTION.get(code, True)
            normalized_score = self._normalize_value(
                value=robust_avg,
                indicator_code=code,
                higher_is_better=higher_is_better,
            )
            trend = self._calculate_indicator_trend(values, indicator_code=code)

            pillar = str(entries[0].pillar or 'environmental').lower()
            # Normaliser le nom du pilier
            pillar_map = {
                'e': 'environmental', 'environmental': 'environmental', 'environnement': 'environmental',
                's': 'social', 'social': 'social',
                'g': 'governance', 'governance': 'governance', 'gouvernance': 'governance',
            }
            pillar = pillar_map.get(pillar, 'environmental')

            indicator_results[code] = {
                "pillar": pillar,
                "name": metric_name,
                "unit": entries[0].unit or '',
                "values": values[:6],
                "count": len(values),
                "avg_value": round(robust_avg, 2),
                "normalized_score": round(normalized_score, 2),
                "weight": 1.0,
                "trend": trend,
                "min_value": round(min(values), 2),
                "max_value": round(max(values), 2),
                "std_dev": round(float(np.std(values)), 2) if len(values) > 1 else 0.0,
            }

        return indicator_results

    def _remove_outliers(self, values: List[float], threshold: float = 1.5) -> List[float]:
        """Supprimer les outliers via IQR."""
        if len(values) < 4:
            return values
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        lower_bound = q1 - threshold * iqr
        upper_bound = q3 + threshold * iqr
        return [v for v in values if lower_bound <= v <= upper_bound]

    def _calculate_indicator_trend(self, values: List[float], indicator_code: str) -> str:
        """Calculer la tendance d'un indicateur (en tenant compte du sens)."""
        if len(values) < 3:
            return "insufficient_data"

        recent = float(np.mean(values[:3]))
        previous = float(np.mean(values[3:6])) if len(values) >= 6 else float(np.mean(values[3:]))

        if previous == 0:
            return "stable"

        change_pct = ((recent - previous) / abs(previous)) * 100.0

        if abs(change_pct) < 5.0:
            return "stable"

        higher_is_better = self.INDICATOR_DIRECTION.get(indicator_code, True)

        # si la valeur augmente :
        if change_pct > 0:
            return "improving" if higher_is_better else "declining"
        # si la valeur diminue :
        return "declining" if higher_is_better else "improving"

    def _normalize_value(self, value: float, indicator_code: str, higher_is_better: bool = True) -> float:
        """Normaliser une valeur sur 0-100."""
        benchmark = self.BENCHMARK_RANGES.get(indicator_code, {"min": 0, "max": 100})
        min_val, max_val = benchmark["min"], benchmark["max"]

        if value < min_val:
            normalized = 100.0 if higher_is_better else 0.0
        elif value > max_val:
            normalized = 0.0 if higher_is_better else 100.0
        else:
            if max_val == min_val:
                normalized = 50.0
            else:
                normalized = ((value - min_val) / (max_val - min_val)) * 100.0

        if not higher_is_better:
            normalized = 100.0 - normalized

        return max(0.0, min(100.0, float(normalized)))

    async def _calculate_pillar_scores(
        self,
        indicator_data: Dict[str, Dict[str, Any]],
        sector_weights: Dict[str, Any],
    ) -> Tuple[Dict[str, float], Dict[str, Any]]:
        """
        ✅ FIX COMPLET : Calculer les scores par pilier + détails.
        """
        pillar_scores: Dict[str, float] = {
            "environmental": 0.0,
            "social": 0.0,
            "governance": 0.0,
        }

        pillar_details: Dict[str, Any] = {
            "environmental": {"indicators": [], "weighted_sum": 0.0, "total_weight": 0.0},
            "social": {"indicators": [], "weighted_sum": 0.0, "total_weight": 0.0},
            "governance": {"indicators": [], "weighted_sum": 0.0, "total_weight": 0.0},
        }

        indicator_weights = sector_weights.get("indicator_weights") or {}

        pillar_map = {
            "e": "environmental",
            "environmental": "environmental",
            "environnement": "environmental",
            "s": "social",
            "social": "social",
            "g": "governance",
            "governance": "governance",
            "gouvernance": "governance",
        }

        for code, data in indicator_data.items():
            raw_pillar = str(data.get("pillar", "")).lower()
            pillar_key = pillar_map.get(raw_pillar, "environmental")

            score = float(data.get("normalized_score", 0.0))
            base_weight = float(data.get("weight", 1.0))
            weight = float(indicator_weights.get(code, base_weight))

            pillar_details[pillar_key]["indicators"].append(
                {
                    "code": code,
                    "name": data.get("name"),
                    "score": score,
                    "weight": weight,
                    "trend": data.get("trend", "unknown"),
                    "value": data.get("avg_value"),
                    "unit": data.get("unit"),
                }
            )

            pillar_details[pillar_key]["weighted_sum"] += score * weight
            pillar_details[pillar_key]["total_weight"] += weight

        # Moyenne pondérée par pilier
        for pillar in pillar_scores.keys():
            tw = pillar_details[pillar]["total_weight"]
            if tw > 0:
                pillar_scores[pillar] = pillar_details[pillar]["weighted_sum"] / tw
            else:
                pillar_scores[pillar] = 0.0

        # Arrondis propres côté détails
        for pillar in pillar_details.keys():
            pillar_details[pillar]["weighted_sum"] = round(pillar_details[pillar]["weighted_sum"], 4)
            pillar_details[pillar]["total_weight"] = round(pillar_details[pillar]["total_weight"], 4)

        return pillar_scores, pillar_details

    def _calculate_overall_score(self, pillar_scores: Dict[str, float], sector_weights: Dict[str, Any]) -> float:
        """Score global pondéré."""
        overall = (
            pillar_scores["environmental"] * float(sector_weights["environmental_weight"])
            + pillar_scores["social"] * float(sector_weights["social_weight"])
            + pillar_scores["governance"] * float(sector_weights["governance_weight"])
        ) / 100.0
        return float(overall)

    def _calculate_rating(self, score: float) -> str:
        """Rating basé sur le score."""
        for rating, threshold in self.RATING_THRESHOLDS.items():
            if score >= threshold:
                return rating
        return "C"

    def _calculate_data_quality(self, indicator_data: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Métriques qualité."""
        if not indicator_data:
            return {
                "completeness": 0.0,
                "confidence_level": "none",
                "total_data_points": 0,
                "indicators_with_trend": 0,
                "indicators_total": 0,
            }

        total_expected = len(indicator_data) * 12
        total_actual = sum(int(d.get("count", 0)) for d in indicator_data.values())
        completeness = (total_actual / total_expected) * 100.0 if total_expected > 0 else 0.0
        completeness = float(min(100.0, completeness))

        indicators_with_trend = sum(
            1
            for d in indicator_data.values()
            if d.get("trend") not in ["insufficient_data", "unknown"]
        )

        if completeness >= 80 and len(indicator_data) >= 5:
            confidence_level = "high"
        elif completeness >= 50 and len(indicator_data) >= 3:
            confidence_level = "medium"
        elif completeness >= 20:
            confidence_level = "low"
        else:
            confidence_level = "very_low"

        return {
            "completeness": round(completeness, 2),
            "confidence_level": confidence_level,
            "total_data_points": total_actual,
            "indicators_with_trend": indicators_with_trend,
            "indicators_total": len(indicator_data),
        }

    async def _calculate_sector_benchmarks(
        self,
        tenant_id: UUID,
        sector_code: str,
        organization_score: float,
        calculation_date: date,
    ) -> Dict[str, Any]:
        """Benchmarks sectoriels."""
        start_date = calculation_date - timedelta(days=365)

        query = (
            select(ESGScore)
            .join(Organization, ESGScore.organization_id == Organization.id)
            .where(
                and_(
                    ESGScore.tenant_id == tenant_id,
                    ESGScore.calculation_date >= start_date,
                    ESGScore.calculation_date <= calculation_date,
                    ESGScore.sector_code == sector_code,
                )
            )
            .order_by(desc(ESGScore.calculation_date))
        )

        result = await self.db.execute(query)
        scores = result.scalars().all()

        if len(scores) < 2:
            return {
                "percentile_rank": None,
                "sector_median": None,
                "sector_average": None,
                "sector_min": None,
                "sector_max": None,
                "companies_count": 0,
                "quartile": None,
            }

        sector_scores = [float(s.overall_score) for s in scores]
        sorted_scores = sorted(sector_scores)
        n = len(sorted_scores)

        sector_median = (
            sorted_scores[n // 2]
            if n % 2 == 1
            else (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2.0
        )
        sector_average = sum(sector_scores) / n
        sector_min = min(sector_scores)
        sector_max = max(sector_scores)

        below_count = sum(1 for s in sector_scores if s < organization_score)
        percentile_rank = (below_count / n) * 100.0

        if organization_score <= sorted_scores[n // 4]:
            quartile = 4
        elif organization_score <= sorted_scores[n // 2]:
            quartile = 3
        elif organization_score <= sorted_scores[3 * n // 4]:
            quartile = 2
        else:
            quartile = 1

        return {
            "percentile_rank": round(percentile_rank, 2),
            "sector_median": round(float(sector_median), 2),
            "sector_average": round(float(sector_average), 2),
            "sector_min": round(float(sector_min), 2),
            "sector_max": round(float(sector_max), 2),
            "companies_count": n,
            "quartile": quartile,
        }

    async def _analyze_trend(self, tenant_id: UUID, organization_id: UUID, calculation_date: date) -> Dict[str, Any]:
        """Tendance des scores sur 12 mois."""
        start_date = calculation_date - timedelta(days=365)

        query = (
            select(ESGScore)
            .where(
                and_(
                    ESGScore.tenant_id == tenant_id,
                    ESGScore.organization_id == organization_id,
                    ESGScore.calculation_date >= start_date,
                    ESGScore.calculation_date <= calculation_date,
                )
            )
            .order_by(ESGScore.calculation_date)
        )

        result = await self.db.execute(query)
        historical_scores = result.scalars().all()

        if len(historical_scores) < 3:
            return {"has_trend": False, "message": "Insufficient historical data"}

        dates = [s.calculation_date.isoformat() for s in historical_scores]
        overall = [float(s.overall_score) for s in historical_scores]
        env = [float(s.environmental_score) for s in historical_scores]
        soc = [float(s.social_score) for s in historical_scores]
        gov = [float(s.governance_score) for s in historical_scores]

        def calculate_slope(y_values: List[float]) -> float:
            x = np.arange(len(y_values))
            if len(set(y_values)) == 1:
                return 0.0
            return float(np.polyfit(x, y_values, 1)[0])

        def get_trend_direction(slope: float, threshold: float = 0.5) -> str:
            if abs(slope) < threshold:
                return "stable"
            return "improving" if slope > 0 else "declining"

        slope_overall = calculate_slope(overall)
        slope_env = calculate_slope(env)
        slope_soc = calculate_slope(soc)
        slope_gov = calculate_slope(gov)

        return {
            "has_trend": True,
            "period_months": len(historical_scores),
            "direction": get_trend_direction(slope_overall),
            "slope": round(float(slope_overall), 3),
            "pillar_trends": {
                "environmental": get_trend_direction(slope_env),
                "social": get_trend_direction(slope_soc),
                "governance": get_trend_direction(slope_gov),
            },
            "historical_data": {
                "dates": dates[-6:],
                "overall": [round(float(s), 2) for s in overall[-6:]],
                "environmental": [round(float(s), 2) for s in env[-6:]],
                "social": [round(float(s), 2) for s in soc[-6:]],
                "governance": [round(float(s), 2) for s in gov[-6:]],
            },
        }

    async def _save_score(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        calculation_date: date,
        environmental_score: float,
        social_score: float,
        governance_score: float,
        overall_score: float,
        rating: str,
        sector_code: str,
        weights_applied: Dict[str, Any],
        indicator_contributions: Dict[str, Any],
        percentile_rank: Optional[float],
        sector_median: Optional[float],
        data_completeness: float,
        confidence_level: str,
    ) -> ESGScore:
        """Sauvegarder le score en base."""
        existing_query = select(ESGScore).where(
            and_(
                ESGScore.tenant_id == tenant_id,
                ESGScore.organization_id == organization_id,
                ESGScore.calculation_date == calculation_date,
            )
        )
        existing_result = await self.db.execute(existing_query)
        existing_score = existing_result.scalar_one_or_none()

        score_data = {
            "environmental_score": environmental_score,
            "social_score": social_score,
            "governance_score": governance_score,
            "overall_score": overall_score,
            "rating": rating,
            "sector_code": sector_code,
            "weights_applied": weights_applied,
            "indicator_contributions": indicator_contributions,
            "percentile_rank": percentile_rank,
            "sector_median": sector_median,
            "data_completeness": data_completeness,
            "confidence_level": confidence_level,
        }

        if existing_score:
            for key, value in score_data.items():
                setattr(existing_score, key, value)
            # ✅ FIX timezone-safe
            existing_score.updated_at = datetime.now(timezone.utc)
            esg_score = existing_score
        else:
            esg_score = ESGScore(
                tenant_id=tenant_id,
                organization_id=organization_id,
                calculation_date=calculation_date,
                **score_data,
            )
            self.db.add(esg_score)

        await self.db.commit()
        await self.db.refresh(esg_score)
        return esg_score

    async def calculate_historical_scores(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        months: int = 12,
        interval_months: int = 1,
    ) -> List[Dict[str, Any]]:
        """Calculer les scores historiques."""
        scores = []
        today = date.today()

        for month_offset in range(0, months, interval_months):
            calc_date = today - timedelta(days=month_offset * 30)
            try:
                score_data = await self.calculate_organization_score(
                    tenant_id=tenant_id,
                    organization_id=organization_id,
                    calculation_date=calc_date,
                    period_months=3,
                    include_trend=False,
                )
                scores.append(score_data)
            except ValueError:
                continue

        return sorted(scores, key=lambda x: x["calculation_date"])

    async def get_score_summary(self, tenant_id: UUID, organization_id: UUID, limit: int = 5) -> Dict[str, Any]:
        """Résumé des derniers scores."""
        query = (
            select(ESGScore)
            .where(
                and_(
                    ESGScore.tenant_id == tenant_id,
                    ESGScore.organization_id == organization_id,
                )
            )
            .order_by(desc(ESGScore.calculation_date))
            .limit(limit)
        )

        result = await self.db.execute(query)
        scores = result.scalars().all()

        if not scores:
            return {"has_scores": False}

        latest = scores[0]
        evolution = None

        if len(scores) > 1:
            previous = scores[1]
            change = float(latest.overall_score) - float(previous.overall_score)
            evolution = {
                "change": round(change, 2),
                "percentage": round((change / float(previous.overall_score)) * 100.0, 2)
                if float(previous.overall_score) != 0
                else 0.0,
                "period_days": (latest.calculation_date - previous.calculation_date).days,
            }

        return {
            "has_scores": True,
            "latest_score": {
                "overall": round(float(latest.overall_score), 2),
                "rating": latest.rating,
                "date": latest.calculation_date.isoformat(),
                "confidence": latest.confidence_level,
            },
            "evolution": evolution,
            "history": [
                {
                    "date": s.calculation_date.isoformat(),
                    "overall": round(float(s.overall_score), 2),
                    "rating": s.rating,
                }
                for s in scores
            ],
        }