"""
Tenant Onboarding Service - Seeds default data for new tenants.
Creates default organization and ESG indicators from sector templates.
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.indicator import Indicator
from app.models.organization import Organization
from app.models.user import User


_BASE_INDICATORS = [
    # Environmental
    {"code": "ENV-001", "name": "Émissions GES scope 1", "pillar": "environmental", "category": "Climat", "unit": "tCO2e", "framework": "ESRS E1"},
    {"code": "ENV-002", "name": "Émissions GES scope 2", "pillar": "environmental", "category": "Climat", "unit": "tCO2e", "framework": "ESRS E1"},
    {"code": "ENV-003", "name": "Consommation d'énergie totale", "pillar": "environmental", "category": "Énergie", "unit": "MWh", "framework": "ESRS E1"},
    {"code": "ENV-004", "name": "Part d'énergie renouvelable", "pillar": "environmental", "category": "Énergie", "unit": "%", "framework": "GRI 302"},
    {"code": "ENV-005", "name": "Consommation d'eau", "pillar": "environmental", "category": "Eau", "unit": "m³", "framework": "GRI 303"},
    # Social
    {"code": "SOC-001", "name": "Effectif total (ETP)", "pillar": "social", "category": "Emploi", "unit": "personnes", "framework": "GRI 102"},
    {"code": "SOC-002", "name": "Taux de turnover", "pillar": "social", "category": "Emploi", "unit": "%", "framework": "GRI 401"},
    {"code": "SOC-003", "name": "Taux d'accidents du travail (TAF)", "pillar": "social", "category": "Santé & Sécurité", "unit": "%", "framework": "GRI 403"},
    {"code": "SOC-004", "name": "Heures de formation par salarié", "pillar": "social", "category": "Formation", "unit": "h/an", "framework": "GRI 404"},
    {"code": "SOC-005", "name": "Part de femmes dans l'encadrement", "pillar": "social", "category": "Égalité", "unit": "%", "framework": "ESRS S1"},
    # Governance
    {"code": "GOV-001", "name": "Part de femmes au conseil d'administration", "pillar": "governance", "category": "Gouvernance", "unit": "%", "framework": "ESRS G1"},
    {"code": "GOV-002", "name": "Indice de corruption et éthique", "pillar": "governance", "category": "Éthique", "unit": "score", "framework": "GRI 205"},
    {"code": "GOV-003", "name": "Réunions du conseil par an", "pillar": "governance", "category": "Gouvernance", "unit": "nombre", "framework": "GRI 102"},
    {"code": "GOV-004", "name": "Signalements éthiques (whistleblowing)", "pillar": "governance", "category": "Éthique", "unit": "nombre", "framework": "GRI 206"},
]

_SECTOR_EXTRA = {
    "technology": [
        {"code": "TEC-001", "name": "Déchets électroniques (e-waste)", "pillar": "environmental", "category": "Déchets", "unit": "tonnes", "framework": "GRI 306"},
        {"code": "TEC-002", "name": "PUE des datacenters", "pillar": "environmental", "category": "Énergie", "unit": "ratio", "framework": "ISO 30134"},
        {"code": "TEC-003", "name": "Part de femmes en R&D/tech", "pillar": "social", "category": "Égalité", "unit": "%", "framework": "ESRS S1"},
        {"code": "TEC-004", "name": "Investissement en cybersécurité", "pillar": "governance", "category": "Risques", "unit": "k€", "framework": "GRI 418"},
    ],
    "finance": [
        {"code": "FIN-001", "name": "Part d'actifs ESG dans le portefeuille", "pillar": "governance", "category": "Finance durable", "unit": "%", "framework": "SFDR"},
        {"code": "FIN-002", "name": "Financement de projets verts", "pillar": "environmental", "category": "Finance verte", "unit": "M€", "framework": "EU Taxonomy"},
        {"code": "FIN-003", "name": "Taux d'incidents de conformité", "pillar": "governance", "category": "Conformité", "unit": "%", "framework": "GRI 205"},
        {"code": "FIN-004", "name": "Score d'inclusion financière", "pillar": "social", "category": "Inclusion", "unit": "score", "framework": "GRI 203"},
    ],
    "industry": [
        {"code": "IND-001", "name": "Déchets industriels valorisés", "pillar": "environmental", "category": "Déchets", "unit": "%", "framework": "GRI 306"},
        {"code": "IND-002", "name": "Émissions GES scope 3", "pillar": "environmental", "category": "Climat", "unit": "tCO2e", "framework": "ESRS E1"},
        {"code": "IND-003", "name": "Taux de fréquence accidents graves", "pillar": "social", "category": "Santé & Sécurité", "unit": "pour mille", "framework": "GRI 403"},
        {"code": "IND-004", "name": "Fournisseurs évalués ESG", "pillar": "governance", "category": "Supply chain", "unit": "%", "framework": "GRI 308"},
    ],
    "services": [
        {"code": "SRV-001", "name": "Empreinte carbone par salarié", "pillar": "environmental", "category": "Climat", "unit": "tCO2e/ETP", "framework": "ESRS E1"},
        {"code": "SRV-002", "name": "Télétravail (jours/semaine moyen)", "pillar": "social", "category": "Conditions de travail", "unit": "jours", "framework": "GRI 401"},
        {"code": "SRV-003", "name": "Score satisfaction client (NPS)", "pillar": "social", "category": "Clients", "unit": "score", "framework": "GRI 416"},
        {"code": "SRV-004", "name": "Budget RSE / CA", "pillar": "governance", "category": "Gouvernance", "unit": "%", "framework": "GRI 102"},
    ],
    "retail": [
        {"code": "RET-001", "name": "Part de produits écoresponsables", "pillar": "environmental", "category": "Produits", "unit": "%", "framework": "EU Taxonomy"},
        {"code": "RET-002", "name": "Pertes alimentaires et gaspillage", "pillar": "environmental", "category": "Déchets", "unit": "tonnes", "framework": "GRI 306"},
        {"code": "RET-003", "name": "Indice de conditions de travail", "pillar": "social", "category": "Conditions de travail", "unit": "score", "framework": "GRI 402"},
        {"code": "RET-004", "name": "Fournisseurs audités (droits humains)", "pillar": "governance", "category": "Supply chain", "unit": "%", "framework": "GRI 412"},
    ],
    "immo": [
        {"code": "IMM-001", "name": "Intensité énergétique du parc immobilier", "pillar": "environmental", "category": "Énergie", "unit": "kWh/m²", "framework": "ESRS E1"},
        {"code": "IMM-002", "name": "Émissions GES du parc (Scope 1+2)", "pillar": "environmental", "category": "Climat", "unit": "kgCO2e/m²", "framework": "ESRS E1"},
        {"code": "IMM-003", "name": "Part du parc certifié (HQE, BREEAM, LEED)", "pillar": "environmental", "category": "Certification", "unit": "%", "framework": "EU Taxonomy"},
        {"code": "IMM-004", "name": "Score de satisfaction locataire", "pillar": "social", "category": "Clients", "unit": "score/10", "framework": "GRI 416"},
        {"code": "IMM-005", "name": "Part de logements accessibles PMR", "pillar": "social", "category": "Inclusion", "unit": "%", "framework": "GRI 203"},
        {"code": "IMM-006", "name": "Taux d'occupation moyen", "pillar": "governance", "category": "Performance", "unit": "%", "framework": "GRI 102"},
    ],
}


class TenantOnboardingService:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def get_status(self) -> dict:
        org_count_result = await self.db.execute(
            select(func.count()).select_from(Organization).where(
                Organization.tenant_id == self.tenant_id
            )
        )
        org_count = org_count_result.scalar() or 0

        indicator_count_result = await self.db.execute(
            select(func.count()).select_from(Indicator).where(
                Indicator.tenant_id == self.tenant_id
            )
        )
        indicator_count = indicator_count_result.scalar() or 0

        completed = org_count > 0 and indicator_count > 0
        return {
            "completed": completed,
            "has_organizations": org_count > 0,
            "has_indicators": indicator_count > 0,
            "sector": "general",
            "org_count": org_count,
            "indicator_count": indicator_count,
        }

    async def setup(self, org_name: str, sector: str = "general") -> dict:
        # Create default organization if none exists
        org_result = await self.db.execute(
            select(Organization).where(Organization.tenant_id == self.tenant_id).limit(1)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            org = Organization(
                tenant_id=self.tenant_id,
                name=org_name,
                org_type="company",
                industry=sector,
            )
            self.db.add(org)

        # Seed indicators from templates
        indicators_to_create = list(_BASE_INDICATORS)
        if sector in _SECTOR_EXTRA:
            indicators_to_create += _SECTOR_EXTRA[sector]

        created_count = 0
        for ind_data in indicators_to_create:
            existing = await self.db.execute(
                select(Indicator).where(
                    Indicator.tenant_id == self.tenant_id,
                    Indicator.code == ind_data["code"],
                )
            )
            if not existing.scalar_one_or_none():
                indicator = Indicator(
                    tenant_id=self.tenant_id,
                    code=ind_data["code"],
                    name=ind_data["name"],
                    pillar=ind_data["pillar"],
                    category=ind_data["category"],
                    unit=ind_data["unit"],
                    framework=ind_data["framework"],
                    description=ind_data["name"],
                    is_active=True,
                )
                self.db.add(indicator)
                created_count += 1

        # Mark onboarding as completed in tenant settings
        from app.models.tenant import Tenant as TenantModel
        tenant = await self.db.get(TenantModel, self.tenant_id)
        if tenant:
            settings_copy = dict(tenant.settings or {})
            settings_copy["onboarding_done"] = True
            settings_copy["onboarding_sector"] = sector
            tenant.settings = settings_copy

        await self.db.commit()

        return {
            "success": True,
            "org_name": org_name,
            "sector": sector,
            "indicators_created": created_count,
        }
