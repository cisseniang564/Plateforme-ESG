"""
ESG Data Enrichment Service.
"""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import date
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.organization import Organization
from app.services.insee_service import INSEEService


class ESGDataEnrichmentService:
    """Service pour enrichir les indicateurs ESG."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.insee_service = INSEEService(db)
    
    async def enrichir_organisation_avec_insee(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        siren: str,
    ) -> Dict[str, Any]:
        """Enrichir une organisation avec les données INSEE."""
        
        org_query = select(Organization).where(
            Organization.id == organization_id,
            Organization.tenant_id == tenant_id
        )
        org_result = await self.db.execute(org_query)
        organization = org_result.scalar_one_or_none()
        
        if not organization:
            raise ValueError("Organization not found")
        
        entreprise = await self.insee_service.obtenir_details_entreprise(siren)
        
        # Utiliser custom_data au lieu de metadata
        custom_data = organization.custom_data.copy() if organization.custom_data else {}
        custom_data['insee'] = {
            'siren': entreprise.get('siren'),
            'denomination_officielle': entreprise.get('denomination'),
            'activite_principale': entreprise.get('activite_principale'),
            'tranche_effectifs': entreprise.get('tranche_effectifs'),
            'adresse': entreprise.get('adresse'),
            'secteur': entreprise.get('secteur', 'energie'),
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
    
    async def generer_donnees_indicateurs_demo(
        self,
        tenant_id: UUID,
        organization_id: UUID,
    ) -> Dict[str, Any]:
        """Générer des données ESG de démonstration."""
        
        org_query = select(Organization).where(
            Organization.id == organization_id,
            Organization.tenant_id == tenant_id
        )
        org_result = await self.db.execute(org_query)
        organization = org_result.scalar_one_or_none()
        
        if not organization:
            raise ValueError("Organization not found")
        
        indicators_query = select(Indicator).where(
            Indicator.tenant_id == tenant_id,
            Indicator.is_active == True
        )
        indicators_result = await self.db.execute(indicators_query)
        indicators = list(indicators_result.scalars().all())
        
        if not indicators:
            raise ValueError("No active indicators found")
        
        # Extraire infos INSEE depuis custom_data
        custom_data = organization.custom_data if organization.custom_data else {}
        insee_data = custom_data.get('insee', {})
        secteur = insee_data.get('secteur', 'energie')
        tranche_effectifs = insee_data.get('tranche_effectifs', '21')
        
        size_multipliers = {
            '00': 1, '01': 2, '02': 5, '03': 10, '11': 15, '12': 35,
            '21': 75, '22': 150, '31': 225, '32': 375, '41': 750,
            '42': 1500, '51': 3500, '52': 7500, '53': 15000
        }
        size_factor = size_multipliers.get(tranche_effectifs, 100)
        
        base_values_by_sector = {
            'energie': {
                'ENV-001': 500, 'ENV-002': 1000, 'SOC-001': 75,
                'SOC-002': 30, 'GOV-001': 40, 'GOV-002': 85
            },
            'dechets': {
                'ENV-001': 300, 'ENV-002': 800, 'SOC-001': 70,
                'SOC-002': 25, 'GOV-001': 35, 'GOV-002': 80
            },
            'transport': {
                'ENV-001': 800, 'ENV-002': 500, 'SOC-001': 72,
                'SOC-002': 28, 'GOV-001': 38, 'GOV-002': 82
            },
            'construction': {
                'ENV-001': 400, 'ENV-002': 600, 'SOC-001': 68,
                'SOC-002': 32, 'GOV-001': 42, 'GOV-002': 88
            },
            'chimie': {
                'ENV-001': 1200, 'ENV-002': 1500, 'SOC-001': 73,
                'SOC-002': 35, 'GOV-001': 45, 'GOV-002': 90
            },
            'agriculture': {
                'ENV-001': 200, 'ENV-002': 2000, 'SOC-001': 65,
                'SOC-002': 20, 'GOV-001': 30, 'GOV-002': 75
            }
        }
        
        sector_values = base_values_by_sector.get(secteur, base_values_by_sector['energie'])
        
        created = 0
        today = date.today()
        
        for indicator in indicators:
            base_value = sector_values.get(indicator.code, 100)
            
            if indicator.unit in ['tCO2e', 'm³', 'hours']:
                value_with_size = base_value * (size_factor / 100)
            else:
                value_with_size = base_value
            
            for month_offset in range(12):
                year = today.year
                month = today.month - month_offset
                if month <= 0:
                    month += 12
                    year -= 1
                
                data_date = date(year, month, 1)
                
                variation = random.uniform(0.9, 1.1)
                final_value = value_with_size * variation
                
                existing_query = select(IndicatorData).where(
                    IndicatorData.tenant_id == tenant_id,
                    IndicatorData.indicator_id == indicator.id,
                    IndicatorData.organization_id == organization_id,
                    IndicatorData.date == data_date
                )
                existing_result = await self.db.execute(existing_query)
                
                if not existing_result.scalar_one_or_none():
                    data_point = IndicatorData(
                        tenant_id=tenant_id,
                        indicator_id=indicator.id,
                        organization_id=organization_id,
                        date=data_date,
                        value=round(final_value, 2),
                        unit=indicator.unit,
                        source='auto_generated',
                        is_verified=False,
                        notes=f'Auto - Secteur: {secteur}, Taille: {tranche_effectifs}'
                    )
                    self.db.add(data_point)
                    created += 1
        
        await self.db.commit()
        
        return {
            'organization_id': str(organization_id),
            'organization_name': organization.name,
            'data_points_created': created,
            'months_generated': 12,
            'secteur': secteur,
            'taille': tranche_effectifs
        }
    
    async def lier_organisation_a_siren(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        siren: str,
        generer_donnees: bool = True,
    ) -> Dict[str, Any]:
        """Workflow complet."""
        
        enrichissement = await self.enrichir_organisation_avec_insee(
            tenant_id=tenant_id,
            organization_id=organization_id,
            siren=siren
        )
        
        result = {'enrichissement': enrichissement}
        
        if generer_donnees:
            donnees = await self.generer_donnees_indicateurs_demo(
                tenant_id=tenant_id,
                organization_id=organization_id
            )
            result['donnees_generees'] = donnees
        
        return result
    
    async def importer_indicateurs_depuis_secteur(
        self,
        tenant_id: UUID,
        secteur: str,
        departement: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Importer organisations depuis un secteur."""
        
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
                
                if existing_result.scalar_one_or_none():
                    skipped += 1
                    continue
                
                org = Organization(
                    tenant_id=tenant_id,
                    name=entreprise.get('denomination', 'N/A'),
                    external_id=siren,
                    type='company',
                    industry=secteur,
                    custom_data={
                        'insee': {
                            'siren': siren,
                            'siret': entreprise.get('siret'),
                            'activite_principale': entreprise.get('activite_principale'),
                            'tranche_effectifs': entreprise.get('tranche_effectifs'),
                            'adresse': entreprise.get('adresse'),
                            'secteur': secteur,
                            'date_import': str(date.today())
                        }
                    }
                )
                
                self.db.add(org)
                created += 1
                
            except Exception as e:
                errors.append(f"{entreprise.get('denomination')}: {str(e)}")
        
        await self.db.commit()
        
        return {
            'created': created,
            'skipped': skipped,
            'errors': errors[:10],
            'total_entreprises': len(entreprises)
        }
