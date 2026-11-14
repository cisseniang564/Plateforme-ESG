"""
ESG Data Enrichment Service.
"""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import date, timedelta
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

GENERATED_DATA_SOURCE = 'INSEE + ESGFlow AI'


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

    async def generer_donnees_data_entries(self, *args, **kwargs) -> Dict[str, Any]:
        """Désactivé : ESGFlow ne fabrique plus de valeurs ESG.

        Les anciennes valeurs « auto-générées » (aléatoires, par secteur) étaient
        présentées comme des données et alimentaient le scoring. Seules des données
        saisies, importées ou issues d'un calcul traçable doivent exister.
        """
        raise ValueError(
            "La génération de données ESG est désactivée : saisissez ou importez vos données réelles."
        )

    async def generer_donnees_indicateurs_demo(self, *args, **kwargs) -> Dict[str, Any]:
        return await self.generer_donnees_data_entries()

    async def supprimer_donnees_generees(self, tenant_id: UUID) -> Dict[str, Any]:
        """Supprime les anciennes lignes fabriquées par la génération automatique."""
        from sqlalchemy import delete

        de = await self.db.execute(
            delete(DataEntry).where(
                DataEntry.tenant_id == tenant_id,
                DataEntry.data_source == GENERATED_DATA_SOURCE,
                DataEntry.collection_method == 'automatic',
            )
        )
        idr = await self.db.execute(
            delete(IndicatorData).where(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.notes.like('Auto-généré%'),
            )
        )
        await self.db.commit()
        return {
            'data_entries_deleted': de.rowcount or 0,
            'indicator_data_deleted': idr.rowcount or 0,
        }

    # ── Main workflow ──────────────────────────────────────────────────────────

    async def lier_organisation_a_siren(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID],
        siren: str,
        generer_donnees: bool = False,
    ) -> Dict[str, Any]:
        """
        Workflow complet :
        1. Si organization_id fourni → enrichir l'org existante
        2. Sinon → créer une nouvelle org depuis INSEE
        Aucune donnée ESG n'est générée (paramètre generer_donnees ignoré).
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
                created += 1

            except Exception as e:
                errors.append(f"{entreprise.get('denomination', '?')}: {str(e)}")

        await self.db.commit()

        return {
            'created': created,
            'skipped': skipped,
            'errors': errors[:10],
            'total_entreprises': len(entreprises),
        }
