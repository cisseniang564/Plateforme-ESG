"""
ESG Data Enrichment Service.
"""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import date, timedelta
import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.organization import Organization
from app.models.data_entry import DataEntry
from app.services.insee_service import INSEEService


# ── Default ESG metrics to generate when no active indicators exist ────────────
DEFAULT_METRICS = [
    # Scope 1 & 2
    {'pillar': 'environmental', 'category': 'Émissions GES', 'metric_name': 'Émissions Scope 1 (tCO2e)', 'unit': 'tCO2e', 'code': 'ENV-001'},
    {'pillar': 'environmental', 'category': 'Émissions GES', 'metric_name': 'Émissions Scope 2 (tCO2e)', 'unit': 'tCO2e', 'code': 'ENV-002'},
    # Scope 3 — 8 catégories principales GHG Protocol (cat_id = numéro catégorie)
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.1 - Achats de biens & services (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-001', 'cat_id': 1},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.4 - Transport & distribution amont (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-004', 'cat_id': 4},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.5 - Déchets générés exploitation (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-005', 'cat_id': 5},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.6 - Déplacements professionnels (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-006', 'cat_id': 6},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.7 - Trajets domicile-travail (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-007', 'cat_id': 7},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.9 - Transport & distribution aval (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-009', 'cat_id': 9},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.11 - Utilisation des produits vendus (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-011', 'cat_id': 11},
    {'pillar': 'environmental', 'category': 'Scope 3', 'metric_name': 'Scope 3 Cat.15 - Investissements financés (tCO2e)', 'unit': 'tCO2e', 'code': 'S3-015', 'cat_id': 15},
    # Energy & resources
    {'pillar': 'environmental', 'category': 'Énergie', 'metric_name': 'Consommation énergie totale (MWh)', 'unit': 'MWh', 'code': 'ENV-003'},
    {'pillar': 'environmental', 'category': 'Énergie', 'metric_name': 'Part énergie renouvelable (%)', 'unit': '%', 'code': 'ENV-004'},
    {'pillar': 'environmental', 'category': 'Eau', 'metric_name': 'Consommation eau (m3)', 'unit': 'm3', 'code': 'ENV-005'},
    # Social
    {'pillar': 'social', 'category': 'Emploi', 'metric_name': 'Effectif total (ETP)', 'unit': 'ETP', 'code': 'SOC-001'},
    {'pillar': 'social', 'category': 'Santé & Sécurité', 'metric_name': 'Accidents du travail', 'unit': 'accidents', 'code': 'SOC-003'},
    {'pillar': 'social', 'category': 'Formation', 'metric_name': 'Heures de formation', 'unit': 'heures', 'code': 'SOC-004'},
    {'pillar': 'social', 'category': 'Diversité', 'metric_name': 'Part femmes encadrement (%)', 'unit': '%', 'code': 'SOC-005'},
    # Governance
    {'pillar': 'governance', 'category': 'Gouvernance', 'metric_name': 'Part administrateurs indépendants (%)', 'unit': '%', 'code': 'GOV-001'},
    {'pillar': 'governance', 'category': 'Éthique', 'metric_name': 'Score politique anti-corruption', 'unit': 'score', 'code': 'GOV-002'},
    {'pillar': 'governance', 'category': 'Gouvernance', 'metric_name': 'Réunions conseil administration', 'unit': 'reunions', 'code': 'GOV-003'},
]

# Base values per sector (added S3-xxx Scope 3 codes)
BASE_VALUES_BY_SECTOR = {
    'energie':      {'ENV-001': 45000, 'ENV-002': 12000, 'ENV-003': 85000, 'ENV-004': 22, 'ENV-005': 150000, 'SOC-001': 350,  'SOC-003': 8,  'SOC-004': 12000, 'SOC-005': 35, 'GOV-001': 45, 'GOV-002': 7, 'GOV-003': 8,  'S3-001': 8000,  'S3-004': 2500, 'S3-005': 180, 'S3-006': 120, 'S3-007': 200, 'S3-009': 1800, 'S3-011': 500,  'S3-015': 300},
    'transport':    {'ENV-001': 80000, 'ENV-002': 5000,  'ENV-003': 40000, 'ENV-004': 10, 'ENV-005': 50000,  'SOC-001': 1200, 'SOC-003': 25, 'SOC-004': 30000, 'SOC-005': 28, 'GOV-001': 40, 'GOV-002': 6, 'GOV-003': 6,  'S3-001': 15000, 'S3-004': 8000, 'S3-005': 350, 'S3-006': 280, 'S3-007': 650, 'S3-009': 9500, 'S3-011': 2000, 'S3-015': 800},
    'construction': {'ENV-001': 35000, 'ENV-002': 8000,  'ENV-003': 55000, 'ENV-004': 8,  'ENV-005': 80000,  'SOC-001': 500,  'SOC-003': 18, 'SOC-004': 15000, 'SOC-005': 22, 'GOV-001': 38, 'GOV-002': 6, 'GOV-003': 6,  'S3-001': 25000, 'S3-004': 3500, 'S3-005': 420, 'S3-006': 180, 'S3-007': 320, 'S3-009': 2800, 'S3-011': 800,  'S3-015': 500},
    'chimie':       {'ENV-001': 120000,'ENV-002': 20000, 'ENV-003': 180000,'ENV-004': 15, 'ENV-005': 400000, 'SOC-001': 800,  'SOC-003': 12, 'SOC-004': 25000, 'SOC-005': 30, 'GOV-001': 50, 'GOV-002': 8, 'GOV-003': 10, 'S3-001': 35000, 'S3-004': 5000, 'S3-005': 650, 'S3-006': 220, 'S3-007': 450, 'S3-009': 4200, 'S3-011': 3000, 'S3-015': 1200},
    'agriculture':  {'ENV-001': 15000, 'ENV-002': 3000,  'ENV-003': 25000, 'ENV-004': 5,  'ENV-005': 800000, 'SOC-001': 200,  'SOC-003': 15, 'SOC-004': 5000,  'SOC-005': 25, 'GOV-001': 32, 'GOV-002': 5, 'GOV-003': 5,  'S3-001': 12000, 'S3-004': 1800, 'S3-005': 280, 'S3-006': 80,  'S3-007': 150, 'S3-009': 2200, 'S3-011': 1500, 'S3-015': 200},
    'services':     {'ENV-001': 5000,  'ENV-002': 3000,  'ENV-003': 12000, 'ENV-004': 30, 'ENV-005': 20000,  'SOC-001': 250,  'SOC-003': 2,  'SOC-004': 10000, 'SOC-005': 42, 'GOV-001': 55, 'GOV-002': 8, 'GOV-003': 10, 'S3-001': 4500,  'S3-004': 800,  'S3-005': 85,  'S3-006': 150, 'S3-007': 280, 'S3-009': 600,  'S3-011': 200,  'S3-015': 350},
    'numerique':    {'ENV-001': 3000,  'ENV-002': 8000,  'ENV-003': 18000, 'ENV-004': 45, 'ENV-005': 10000,  'SOC-001': 180,  'SOC-003': 1,  'SOC-004': 15000, 'SOC-005': 38, 'GOV-001': 52, 'GOV-002': 8, 'GOV-003': 8,  'S3-001': 6000,  'S3-004': 500,  'S3-005': 45,  'S3-006': 180, 'S3-007': 320, 'S3-009': 400,  'S3-011': 8000, 'S3-015': 1500},
}

SIZE_MULTIPLIERS = {
    '00': 0.01, '01': 0.02, '02': 0.05, '03': 0.08,
    '11': 0.15, '12': 0.35, '21': 0.75, '22': 1.5,
    '31': 2.25, '32': 3.75, '41': 7.5, '42': 15.0,
    '51': 35.0, '52': 75.0, '53': 150.0,
}


class ESGDataEnrichmentService:
    """Service pour enrichir les indicateurs ESG."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.insee_service = INSEEService(db)

    # ── INSEE enrichment ───────────────────────────────────────────────────────

    async def enrichir_organisation_avec_insee(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        siren: str,
    ) -> Dict[str, Any]:
        """Enrichir une organisation existante avec les données INSEE."""

        org_query = select(Organization).where(
            Organization.id == organization_id,
            Organization.tenant_id == tenant_id
        )
        org_result = await self.db.execute(org_query)
        organization = org_result.scalar_one_or_none()

        if not organization:
            raise ValueError("Organisation introuvable")

        entreprise = await self.insee_service.obtenir_details_entreprise(siren)

        custom_data = organization.custom_data.copy() if organization.custom_data else {}
        custom_data['insee'] = {
            'siren': entreprise.get('siren'),
            'denomination_officielle': entreprise.get('denomination'),
            'activite_principale': entreprise.get('activite_principale'),
            'tranche_effectifs': entreprise.get('tranche_effectifs'),
            'adresse': entreprise.get('adresse'),
            'secteur': entreprise.get('secteur', 'services'),
            'date_enrichissement': str(date.today()),
        }

        organization.custom_data = custom_data
        organization.external_id = siren

        await self.db.commit()
        await self.db.refresh(organization)

        return {
            'organization_id': str(organization_id),
            'siren': siren,
            'donnees_enrichies': custom_data['insee'],
        }

    async def creer_organisation_depuis_siren(
        self,
        tenant_id: UUID,
        siren: str,
    ) -> Organization:
        """Créer une nouvelle organisation à partir des données INSEE."""

        entreprise = await self.insee_service.obtenir_details_entreprise(siren)

        # Check if already exists
        existing = await self.db.execute(
            select(Organization).where(
                Organization.tenant_id == tenant_id,
                Organization.external_id == siren
            )
        )
        org = existing.scalar_one_or_none()
        if org:
            return org

        adresse = entreprise.get('adresse', {})
        secteur = entreprise.get('secteur', 'services')

        org = Organization(
            tenant_id=tenant_id,
            name=entreprise.get('denomination', f'Organisation {siren}'),
            external_id=siren,
            org_type='company',
            industry=secteur,
            custom_data={
                'insee': {
                    'siren': siren,
                    'activite_principale': entreprise.get('activite_principale'),
                    'tranche_effectifs': entreprise.get('tranche_effectifs'),
                    'adresse': adresse,
                    'secteur': secteur,
                    'date_import': str(date.today()),
                }
            }
        )
        self.db.add(org)
        await self.db.flush()  # get the ID without committing
        return org

    # ── Data generation ────────────────────────────────────────────────────────

    async def generer_donnees_data_entries(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        secteur: str = 'services',
        tranche_effectifs: str = '21',
    ) -> Dict[str, Any]:
        """
        Générer 12 mois de données ESG dans data_entries ET indicator_data.

        - DataEntry  → visible dans les dashboards / saisie
        - Indicator + IndicatorData → requis par le moteur de scoring ESG
        """

        size_factor = SIZE_MULTIPLIERS.get(tranche_effectifs, 0.75)
        sector_values = BASE_VALUES_BY_SECTOR.get(secteur, BASE_VALUES_BY_SECTOR['services'])

        created = 0
        today = date.today()

        # ── Étape 1 : Upsert des indicateurs pour ce tenant ───────────────────
        indicator_id_map: Dict[str, UUID] = {}
        for metric in DEFAULT_METRICS:
            code = metric['code']
            res = await self.db.execute(
                select(Indicator).where(
                    Indicator.tenant_id == tenant_id,
                    Indicator.code == code,
                )
            )
            indicator = res.scalar_one_or_none()
            if not indicator:
                indicator = Indicator(
                    tenant_id=tenant_id,
                    code=code,
                    name=metric['metric_name'],
                    pillar=metric['pillar'],
                    category=metric.get('category'),
                    unit=metric['unit'],
                    data_type='numeric',
                    is_active=True,
                    is_mandatory=False,
                )
                self.db.add(indicator)
                await self.db.flush()  # obtenir l'ID avant la boucle suivante
            indicator_id_map[code] = indicator.id

        # ── Étape 2 : Générer DataEntry + IndicatorData par métrique et mois ─
        for metric in DEFAULT_METRICS:
            code = metric['code']
            base_value = sector_values.get(code, 100)
            indicator_id = indicator_id_map[code]

            # Appliquer le facteur taille seulement pour les valeurs absolues
            if metric['unit'] not in ('%', 'score', 'reunions', 'accidents'):
                value_with_size = base_value * size_factor
            else:
                value_with_size = float(base_value)

            for month_offset in range(12):
                year = today.year
                month = today.month - month_offset
                if month <= 0:
                    month += 12
                    year -= 1

                period_start = date(year, month, 1)
                # Dernier jour du mois
                if month == 12:
                    period_end = date(year, 12, 31)
                else:
                    period_end = date(year, month + 1, 1) - timedelta(days=1)

                variation = random.uniform(0.88, 1.12)
                final_value = round(value_with_size * variation, 2)

                # ── DataEntry (dashboard / saisie) ────────────────────────────
                existing_de = await self.db.execute(
                    select(DataEntry).where(
                        DataEntry.tenant_id == tenant_id,
                        DataEntry.organization_id == organization_id,
                        DataEntry.metric_name == metric['metric_name'],
                        DataEntry.period_start == period_start,
                    )
                )
                if not existing_de.scalar_one_or_none():
                    entry = DataEntry(
                        tenant_id=tenant_id,
                        organization_id=organization_id,
                        period_start=period_start,
                        period_end=period_end,
                        pillar=metric['pillar'],
                        category=metric['category'],
                        metric_name=metric['metric_name'],
                        value_numeric=final_value,
                        unit=metric['unit'],
                        collection_method='automatic',
                        verification_status='pending',
                        data_source='INSEE + ESGFlow AI',
                        notes=f'Auto-généré — Secteur: {secteur}, Taille: {tranche_effectifs}',
                    )
                    self.db.add(entry)
                    created += 1

                # ── IndicatorData (moteur de scoring) ─────────────────────────
                existing_id = await self.db.execute(
                    select(IndicatorData).where(
                        IndicatorData.tenant_id == tenant_id,
                        IndicatorData.organization_id == organization_id,
                        IndicatorData.indicator_id == indicator_id,
                        IndicatorData.date == period_start,
                    )
                )
                if not existing_id.scalar_one_or_none():
                    ind_data = IndicatorData(
                        tenant_id=tenant_id,
                        organization_id=organization_id,
                        indicator_id=indicator_id,
                        date=period_start,
                        value=final_value,
                        unit=metric['unit'],
                        source='api',
                        is_estimated=True,
                        validation_status='draft',
                        notes=f'Auto-généré — Secteur: {secteur}, Taille: {tranche_effectifs}',
                    )
                    self.db.add(ind_data)

        await self.db.commit()

        return {
            'organization_id': str(organization_id),
            'data_points_created': created,
            'months_generated': 12,
            'metrics_count': len(DEFAULT_METRICS),
            'secteur': secteur,
            'taille': tranche_effectifs,
        }

    async def generer_donnees_indicateurs_demo(
        self,
        tenant_id: UUID,
        organization_id: UUID,
    ) -> Dict[str, Any]:
        """Générer des données de démonstration ESG (data_entries)."""

        org_query = select(Organization).where(
            Organization.id == organization_id,
            Organization.tenant_id == tenant_id
        )
        org_result = await self.db.execute(org_query)
        organization = org_result.scalar_one_or_none()

        if not organization:
            raise ValueError("Organisation introuvable")

        custom_data = organization.custom_data or {}
        insee_data = custom_data.get('insee', {})
        secteur = insee_data.get('secteur', 'services')
        tranche_effectifs = insee_data.get('tranche_effectifs', '21')

        result = await self.generer_donnees_data_entries(
            tenant_id=tenant_id,
            organization_id=organization_id,
            secteur=secteur,
            tranche_effectifs=tranche_effectifs,
        )
        result['organization_name'] = organization.name
        return result

    # ── Main workflow ──────────────────────────────────────────────────────────

    async def lier_organisation_a_siren(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID],
        siren: str,
        generer_donnees: bool = True,
    ) -> Dict[str, Any]:
        """
        Workflow complet :
        1. Si organization_id fourni → enrichir l'org existante
        2. Sinon → créer une nouvelle org depuis INSEE
        3. Générer 12 mois de données ESG dans data_entries
        """

        if organization_id:
            enrichissement = await self.enrichir_organisation_avec_insee(
                tenant_id=tenant_id,
                organization_id=organization_id,
                siren=siren,
            )
            # Refresh org for sector/size info
            org_res = await self.db.execute(
                select(Organization).where(Organization.id == organization_id)
            )
            org = org_res.scalar_one_or_none()
        else:
            # Create new org from INSEE data
            org = await self.creer_organisation_depuis_siren(tenant_id=tenant_id, siren=siren)
            organization_id = org.id
            enrichissement = {
                'organization_id': str(org.id),
                'siren': siren,
                'organisation_creee': True,
                'nom': org.name,
            }

        result = {'enrichissement': enrichissement}

        if generer_donnees and org:
            custom_data = org.custom_data or {}
            insee_data = custom_data.get('insee', {})
            secteur = insee_data.get('secteur', 'services')
            tranche_effectifs = insee_data.get('tranche_effectifs', '21')

            donnees = await self.generer_donnees_data_entries(
                tenant_id=tenant_id,
                organization_id=organization_id,
                secteur=secteur,
                tranche_effectifs=tranche_effectifs,
            )
            donnees['organization_name'] = org.name
            result['donnees_generees'] = donnees

        return result

    # ── Import from sector ─────────────────────────────────────────────────────

    async def importer_indicateurs_depuis_secteur(
        self,
        tenant_id: UUID,
        secteur: str,
        departement: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Importer organisations depuis un secteur INSEE."""

        entreprises = await self.insee_service.rechercher_par_secteur(
            secteur=secteur,
            departement=departement,
            nombre_resultats=50
        )

        created = 0
        skipped = 0
        data_points_total = 0
        errors = []

        for entreprise in entreprises:
            try:
                siren = entreprise.get('siren')
                if not siren:
                    skipped += 1
                    continue

                existing_query = select(Organization).where(
                    Organization.tenant_id == tenant_id,
                    Organization.external_id == siren
                )
                existing_result = await self.db.execute(existing_query)
                existing_org = existing_result.scalar_one_or_none()

                if existing_org:
                    skipped += 1
                    continue

                tranche = entreprise.get('tranche_effectifs', '21')

                org = Organization(
                    tenant_id=tenant_id,
                    name=entreprise.get('denomination', 'N/A'),
                    external_id=siren,
                    org_type='company',
                    industry=secteur,
                    custom_data={
                        'insee': {
                            'siren': siren,
                            'siret': entreprise.get('siret'),
                            'activite_principale': entreprise.get('activite_principale'),
                            'tranche_effectifs': tranche,
                            'adresse': entreprise.get('adresse'),
                            'secteur': secteur,
                            'date_import': str(date.today()),
                        }
                    }
                )

                self.db.add(org)
                await self.db.flush()  # get org.id before generating data

                # Generate ESG data entries for this org
                result = await self.generer_donnees_data_entries(
                    tenant_id=tenant_id,
                    organization_id=org.id,
                    secteur=secteur,
                    tranche_effectifs=tranche,
                )
                data_points_total += result.get('data_points_created', 0)
                created += 1

            except Exception as e:
                errors.append(f"{entreprise.get('denomination', '?')}: {str(e)}")

        await self.db.commit()

        return {
            'created': created,
            'skipped': skipped,
            'data_points_generated': data_points_total,
            'errors': errors[:10],
            'total_entreprises': len(entreprises),
        }
