#!/bin/bash
# =============================================================================
#  ESGFlow — Script d'améliorations v2.0
#  Onboarding · CookieConsent · Workflow Validation · ProductTour · Templates
# =============================================================================
set -e

PROJ="/Users/cisseniang/Downloads/esgplatform"
BACKEND="$PROJ/backend/app"
FRONTEND="$PROJ/frontend/src"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      ESGFlow v2 — Installation des améliorations            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Vérification du répertoire
if [ ! -d "$PROJ" ]; then
  echo "❌ Répertoire projet introuvable: $PROJ"
  exit 1
fi
cd "$PROJ"

# Création des répertoires nécessaires
mkdir -p "$BACKEND/services"
mkdir -p "$BACKEND/api/v1/endpoints"
mkdir -p "$BACKEND/db/migrations/versions"
mkdir -p "$FRONTEND/pages/Setup"
mkdir -p "$FRONTEND/hooks"
mkdir -p "$FRONTEND/components/common"

# =============================================================================
echo "1/9 — Service onboarding backend (templates sectoriels)..."
# =============================================================================
cat > "$BACKEND/services/tenant_onboarding.py" << 'PYEOF'
"""
Tenant Onboarding Service — Initialise un nouveau tenant avec indicateurs
et organisation par défaut selon le secteur choisi.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.organization import Organization
from app.models.tenant import Tenant

# ─────────────────────────────────────────────────────────────────────────────
#  Templates d'indicateurs par secteur
# ─────────────────────────────────────────────────────────────────────────────

_BASE_INDICATORS = [
    # ── Environnement ──────────────────────────────────────────────────────
    {
        "code": "GHG_SCOPE1",
        "name": "Émissions GES Scope 1",
        "pillar": "environmental",
        "category": "Climat",
        "unit": "tCO2e",
        "data_type": "numeric",
        "description": "Émissions directes de gaz à effet de serre",
        "weight": 0.12,
        "framework": "ESRS",
        "framework_reference": "ESRS E1-6",
        "is_mandatory": True,
    },
    {
        "code": "GHG_SCOPE2",
        "name": "Émissions GES Scope 2",
        "pillar": "environmental",
        "category": "Climat",
        "unit": "tCO2e",
        "data_type": "numeric",
        "description": "Émissions indirectes liées à l'énergie achetée",
        "weight": 0.10,
        "framework": "ESRS",
        "framework_reference": "ESRS E1-6",
        "is_mandatory": True,
    },
    {
        "code": "ENERGY_TOTAL",
        "name": "Consommation énergie totale",
        "pillar": "environmental",
        "category": "Énergie",
        "unit": "MWh",
        "data_type": "numeric",
        "description": "Consommation d'énergie totale (renouvelable + non-renouvelable)",
        "weight": 0.08,
        "framework": "GRI",
        "framework_reference": "GRI 302-1",
        "is_mandatory": True,
    },
    {
        "code": "RENEWABLE_ENERGY_RATE",
        "name": "Taux d'énergie renouvelable",
        "pillar": "environmental",
        "category": "Énergie",
        "unit": "%",
        "data_type": "percentage",
        "description": "Part des énergies renouvelables dans la consommation totale",
        "weight": 0.06,
        "framework": "GRI",
        "framework_reference": "GRI 302-1",
        "is_mandatory": False,
    },
    {
        "code": "WATER_WITHDRAWAL",
        "name": "Prélèvement eau total",
        "pillar": "environmental",
        "category": "Eau",
        "unit": "m³",
        "data_type": "numeric",
        "description": "Volume total d'eau prélevé dans toutes les sources",
        "weight": 0.05,
        "framework": "GRI",
        "framework_reference": "GRI 303-3",
        "is_mandatory": False,
    },
    {
        "code": "WASTE_TOTAL",
        "name": "Déchets totaux générés",
        "pillar": "environmental",
        "category": "Déchets",
        "unit": "tonnes",
        "data_type": "numeric",
        "description": "Masse totale de déchets générés",
        "weight": 0.05,
        "framework": "GRI",
        "framework_reference": "GRI 306-3",
        "is_mandatory": False,
    },
    # ── Social ─────────────────────────────────────────────────────────────
    {
        "code": "EMPLOYEES_TOTAL",
        "name": "Effectif total",
        "pillar": "social",
        "category": "Emploi",
        "unit": "#",
        "data_type": "numeric",
        "description": "Nombre total d'employés (CDI + CDD)",
        "weight": 0.06,
        "framework": "ESRS",
        "framework_reference": "ESRS S1-6",
        "is_mandatory": True,
    },
    {
        "code": "TRAINING_HOURS",
        "name": "Heures de formation par employé",
        "pillar": "social",
        "category": "Développement RH",
        "unit": "#",
        "data_type": "numeric",
        "description": "Nombre moyen d'heures de formation par employé et par an",
        "weight": 0.06,
        "framework": "GRI",
        "framework_reference": "GRI 404-1",
        "is_mandatory": False,
    },
    {
        "code": "INJURY_RATE",
        "name": "Taux d'accidents avec arrêt",
        "pillar": "social",
        "category": "Santé & Sécurité",
        "unit": "#",
        "data_type": "numeric",
        "description": "Nombre d'accidents avec arrêt pour 1 000 000 heures travaillées",
        "weight": 0.08,
        "framework": "ESRS",
        "framework_reference": "ESRS S1-14",
        "is_mandatory": True,
    },
    {
        "code": "GENDER_PAY_GAP",
        "name": "Écart salarial Femmes/Hommes",
        "pillar": "social",
        "category": "Diversité & Inclusion",
        "unit": "%",
        "data_type": "percentage",
        "description": "Écart de rémunération entre femmes et hommes à poste équivalent",
        "weight": 0.06,
        "framework": "ESRS",
        "framework_reference": "ESRS S1-16",
        "is_mandatory": True,
    },
    {
        "code": "WOMEN_MANAGEMENT",
        "name": "Femmes en management",
        "pillar": "social",
        "category": "Diversité & Inclusion",
        "unit": "%",
        "data_type": "percentage",
        "description": "Part des femmes aux postes de direction",
        "weight": 0.05,
        "framework": "GRI",
        "framework_reference": "GRI 405-1",
        "is_mandatory": False,
    },
    # ── Gouvernance ────────────────────────────────────────────────────────
    {
        "code": "BOARD_INDEPENDENCE",
        "name": "Indépendance du Conseil d'Administration",
        "pillar": "governance",
        "category": "Gouvernance d'entreprise",
        "unit": "%",
        "data_type": "percentage",
        "description": "Part des membres indépendants au CA",
        "weight": 0.08,
        "framework": "ESRS",
        "framework_reference": "ESRS G1-1",
        "is_mandatory": True,
    },
    {
        "code": "ANTI_CORRUPTION_TRAINING",
        "name": "Formation anti-corruption",
        "pillar": "governance",
        "category": "Éthique",
        "unit": "%",
        "data_type": "percentage",
        "description": "% employés formés aux politiques anti-corruption",
        "weight": 0.06,
        "framework": "GRI",
        "framework_reference": "GRI 205-2",
        "is_mandatory": False,
    },
    {
        "code": "ETHICS_VIOLATIONS",
        "name": "Violations du code éthique",
        "pillar": "governance",
        "category": "Éthique",
        "unit": "#",
        "data_type": "numeric",
        "description": "Nombre de violations du code éthique confirmées",
        "weight": 0.05,
        "framework": "GRI",
        "framework_reference": "GRI 205-3",
        "is_mandatory": False,
    },
]

_SECTOR_EXTRA: dict[str, list[dict]] = {
    "technology": [
        {
            "code": "DATA_CENTER_PUE",
            "name": "PUE des datacenters",
            "pillar": "environmental",
            "category": "Efficacité IT",
            "unit": "#",
            "data_type": "numeric",
            "description": "Power Usage Effectiveness moyen des datacenters (cible < 1.5)",
            "weight": 0.07,
            "framework": "GRI",
            "framework_reference": "GRI 302-3",
            "is_mandatory": False,
        },
        {
            "code": "E_WASTE",
            "name": "Déchets électroniques traités",
            "pillar": "environmental",
            "category": "Déchets",
            "unit": "tonnes",
            "data_type": "numeric",
            "description": "Masse de déchets électroniques recyclés ou refurbishés",
            "weight": 0.04,
            "framework": "GRI",
            "framework_reference": "GRI 306-3",
            "is_mandatory": False,
        },
        {
            "code": "CYBER_INCIDENTS",
            "name": "Incidents cybersécurité majeurs",
            "pillar": "governance",
            "category": "Cybersécurité",
            "unit": "#",
            "data_type": "numeric",
            "description": "Nombre d'incidents cybersécurité de niveau critique",
            "weight": 0.06,
            "framework": "ESRS",
            "framework_reference": "ESRS G1-3",
            "is_mandatory": False,
        },
        {
            "code": "DATA_PRIVACY_BREACHES",
            "name": "Violations de données personnelles",
            "pillar": "governance",
            "category": "Protection données",
            "unit": "#",
            "data_type": "numeric",
            "description": "Nombre de violations de données notifiées à la CNIL",
            "weight": 0.06,
            "framework": "ESRS",
            "framework_reference": "ESRS G1-3",
            "is_mandatory": False,
        },
    ],
    "finance": [
        {
            "code": "PORTFOLIO_CARBON_INTENSITY",
            "name": "Intensité carbone du portefeuille",
            "pillar": "environmental",
            "category": "Financement vert",
            "unit": "tCO2e/M€",
            "data_type": "numeric",
            "description": "Émissions carbone normalisées par M€ financé",
            "weight": 0.10,
            "framework": "TCFD",
            "framework_reference": "TCFD Metrics C",
            "is_mandatory": True,
        },
        {
            "code": "GREEN_FINANCING_RATE",
            "name": "Part du financement vert",
            "pillar": "environmental",
            "category": "Financement vert",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des encours finançant des activités durables (taxonomie UE)",
            "weight": 0.08,
            "framework": "ESRS",
            "framework_reference": "ESRS E1-9",
            "is_mandatory": True,
        },
        {
            "code": "ESG_SCREENED_AUM",
            "name": "AUM avec critères ESG",
            "pillar": "governance",
            "category": "Investissement responsable",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des actifs sous gestion intégrant des critères ESG",
            "weight": 0.07,
            "framework": "TCFD",
            "framework_reference": "TCFD Strategy",
            "is_mandatory": False,
        },
        {
            "code": "FINANCIAL_INCLUSION",
            "name": "Clients servis zones non-bancarisées",
            "pillar": "social",
            "category": "Inclusion financière",
            "unit": "#",
            "data_type": "numeric",
            "description": "Nombre de clients dans les zones sous-bancarisées",
            "weight": 0.05,
            "framework": "GRI",
            "framework_reference": "GRI FS13",
            "is_mandatory": False,
        },
    ],
    "industry": [
        {
            "code": "GHG_SCOPE3",
            "name": "Émissions GES Scope 3 amont",
            "pillar": "environmental",
            "category": "Climat",
            "unit": "tCO2e",
            "data_type": "numeric",
            "description": "Émissions indirectes de la chaîne d'approvisionnement",
            "weight": 0.08,
            "framework": "ESRS",
            "framework_reference": "ESRS E1-6",
            "is_mandatory": True,
        },
        {
            "code": "RECYCLING_RATE",
            "name": "Taux de recyclage des déchets",
            "pillar": "environmental",
            "category": "Économie circulaire",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des déchets de production recyclés ou valorisés",
            "weight": 0.06,
            "framework": "ESRS",
            "framework_reference": "ESRS E5-5",
            "is_mandatory": False,
        },
        {
            "code": "SAFETY_INVEST",
            "name": "Investissement sécurité",
            "pillar": "social",
            "category": "Santé & Sécurité",
            "unit": "EUR",
            "data_type": "numeric",
            "description": "Budget annuel consacré à la sécurité au travail",
            "weight": 0.05,
            "framework": "GRI",
            "framework_reference": "GRI 403-8",
            "is_mandatory": False,
        },
        {
            "code": "SUPPLIER_AUDIT_RATE",
            "name": "Taux d'audit fournisseurs",
            "pillar": "governance",
            "category": "Chaîne valeur",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des fournisseurs stratégiques audités sur critères RSE",
            "weight": 0.06,
            "framework": "ESRS",
            "framework_reference": "ESRS G1-2",
            "is_mandatory": False,
        },
    ],
    "services": [
        {
            "code": "REMOTE_WORK_RATE",
            "name": "Taux de télétravail",
            "pillar": "social",
            "category": "Conditions de travail",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des jours travaillés en télétravail",
            "weight": 0.04,
            "framework": "ESRS",
            "framework_reference": "ESRS S1-1",
            "is_mandatory": False,
        },
        {
            "code": "CLIENT_SATISFACTION",
            "name": "Score satisfaction client (NPS)",
            "pillar": "social",
            "category": "Satisfaction client",
            "unit": "#",
            "data_type": "numeric",
            "description": "Net Promoter Score (NPS) annuel",
            "weight": 0.05,
            "framework": "GRI",
            "framework_reference": "GRI 416-1",
            "is_mandatory": False,
        },
        {
            "code": "LOCAL_PROCUREMENT",
            "name": "Achats locaux",
            "pillar": "governance",
            "category": "Chaîne valeur",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des achats auprès de fournisseurs locaux (< 100km)",
            "weight": 0.04,
            "framework": "GRI",
            "framework_reference": "GRI 204-1",
            "is_mandatory": False,
        },
        {
            "code": "EMPLOYEE_TURNOVER",
            "name": "Taux de turnover",
            "pillar": "social",
            "category": "Emploi",
            "unit": "%",
            "data_type": "percentage",
            "description": "Taux de rotation des effectifs annuel",
            "weight": 0.05,
            "framework": "GRI",
            "framework_reference": "GRI 401-1",
            "is_mandatory": False,
        },
    ],
    "retail": [
        {
            "code": "RECYCLABLE_PRODUCTS",
            "name": "Produits recyclables ou durables",
            "pillar": "environmental",
            "category": "Produits responsables",
            "unit": "%",
            "data_type": "percentage",
            "description": "% du catalogue certifié recyclable ou issu de matières durables",
            "weight": 0.07,
            "framework": "ESRS",
            "framework_reference": "ESRS E5-1",
            "is_mandatory": False,
        },
        {
            "code": "PACKAGING_REDUCTION",
            "name": "Réduction des emballages plastique",
            "pillar": "environmental",
            "category": "Économie circulaire",
            "unit": "%",
            "data_type": "percentage",
            "description": "% de réduction des emballages plastique vs année de référence",
            "weight": 0.06,
            "framework": "ESRS",
            "framework_reference": "ESRS E5-5",
            "is_mandatory": False,
        },
        {
            "code": "ETHICAL_SOURCING",
            "name": "Taux d'approvisionnement éthique",
            "pillar": "governance",
            "category": "Chaîne valeur",
            "unit": "%",
            "data_type": "percentage",
            "description": "% des produits certifiés par un label éthique ou RSE reconnu",
            "weight": 0.06,
            "framework": "ESRS",
            "framework_reference": "ESRS G1-2",
            "is_mandatory": False,
        },
        {
            "code": "FOOD_WASTE",
            "name": "Gaspillage alimentaire",
            "pillar": "environmental",
            "category": "Déchets",
            "unit": "tonnes",
            "data_type": "numeric",
            "description": "Masse de déchets alimentaires générés (secteur alimentaire uniquement)",
            "weight": 0.05,
            "framework": "GRI",
            "framework_reference": "GRI 306-3",
            "is_mandatory": False,
        },
    ],
}


class TenantOnboardingService:
    """Service pour initialiser un nouveau tenant avec des données de base."""

    SECTOR_LABELS = {
        "general": "Général (tous secteurs)",
        "technology": "Technologie & Numérique",
        "finance": "Finance & Banque",
        "industry": "Industrie & Manufacture",
        "services": "Services & Conseil",
        "retail": "Commerce & Distribution",
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────────────
    #  Public API
    # ─────────────────────────────────────────────────────────────────────

    async def get_status(self, tenant_id: UUID) -> dict:
        """Retourne l'état de l'onboarding pour ce tenant."""
        tenant = await self.db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        has_org = await self._has_organizations(tenant_id)
        has_indicators = await self._has_indicators(tenant_id)
        completed = bool(tenant.settings.get("onboarding_completed", False))

        return {
            "completed": completed,
            "has_organizations": has_org,
            "has_indicators": has_indicators,
            "sector": tenant.settings.get("sector", "general"),
            "org_count": await self._count_organizations(tenant_id),
            "indicator_count": await self._count_indicators(tenant_id),
        }

    async def setup(
        self,
        tenant_id: UUID,
        sector: str,
        org_name: Optional[str] = None,
    ) -> dict:
        """Initialise le tenant : crée org + indicateurs selon le secteur."""
        tenant = await self.db.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        sector = sector.lower() if sector else "general"
        if sector not in self.SECTOR_LABELS:
            sector = "general"

        created_org = None
        created_indicators = 0

        # Créer organisation par défaut si absente
        if not await self._has_organizations(tenant_id):
            name = org_name or tenant.name or "Mon Organisation"
            created_org = await self._create_default_org(tenant_id, name)

        # Seeder les indicateurs si absents
        if not await self._has_indicators(tenant_id):
            created_indicators = await self._seed_indicators(tenant_id, sector)

        # Marquer l'onboarding comme terminé
        settings = dict(tenant.settings or {})
        settings["onboarding_completed"] = True
        settings["sector"] = sector
        settings["onboarding_at"] = datetime.now(timezone.utc).isoformat()
        tenant.settings = settings

        await self.db.commit()

        return {
            "success": True,
            "sector": sector,
            "sector_label": self.SECTOR_LABELS[sector],
            "organization_created": created_org is not None,
            "indicators_created": created_indicators,
        }

    # ─────────────────────────────────────────────────────────────────────
    #  Private helpers
    # ─────────────────────────────────────────────────────────────────────

    async def _has_organizations(self, tenant_id: UUID) -> bool:
        count = (
            await self.db.execute(
                select(func.count(Organization.id)).where(
                    Organization.tenant_id == tenant_id
                )
            )
        ).scalar_one()
        return count > 0

    async def _count_organizations(self, tenant_id: UUID) -> int:
        return (
            await self.db.execute(
                select(func.count(Organization.id)).where(
                    Organization.tenant_id == tenant_id
                )
            )
        ).scalar_one()

    async def _has_indicators(self, tenant_id: UUID) -> bool:
        count = (
            await self.db.execute(
                select(func.count(Indicator.id)).where(
                    Indicator.tenant_id == tenant_id
                )
            )
        ).scalar_one()
        return count > 0

    async def _count_indicators(self, tenant_id: UUID) -> int:
        return (
            await self.db.execute(
                select(func.count(Indicator.id)).where(
                    Indicator.tenant_id == tenant_id
                )
            )
        ).scalar_one()

    async def _create_default_org(
        self, tenant_id: UUID, name: str
    ) -> Organization:
        org = Organization(
            tenant_id=tenant_id,
            name=name,
            type="company",
        )
        self.db.add(org)
        await self.db.flush()
        return org

    async def _seed_indicators(self, tenant_id: UUID, sector: str) -> int:
        templates = list(_BASE_INDICATORS)
        templates.extend(_SECTOR_EXTRA.get(sector, []))

        created = 0
        for tpl in templates:
            # Éviter les doublons (code unique par tenant)
            existing = (
                await self.db.execute(
                    select(Indicator).where(
                        Indicator.tenant_id == tenant_id,
                        Indicator.code == tpl["code"],
                    )
                )
            ).scalar_one_or_none()

            if existing:
                continue

            indicator = Indicator(
                tenant_id=tenant_id,
                is_active=True,
                **tpl,
            )
            self.db.add(indicator)
            created += 1

        await self.db.flush()
        return created
PYEOF

# =============================================================================
echo "2/9 — Endpoints onboarding REST..."
# =============================================================================
cat > "$BACKEND/api/v1/endpoints/onboarding.py" << 'PYEOF'
"""
Onboarding API — Initialisation des nouveaux tenants.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_tenant_id
from app.services.tenant_onboarding import TenantOnboardingService

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class OnboardingSetupRequest(BaseModel):
    sector: str = Field(
        default="general",
        description="Secteur: general, technology, finance, industry, services, retail",
    )
    org_name: Optional[str] = Field(
        None, max_length=200, description="Nom de l'organisation par défaut"
    )


@router.get("/status", summary="Statut onboarding du tenant")
async def get_onboarding_status(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Retourne l'état d'avancement de l'onboarding."""
    service = TenantOnboardingService(db)
    return await service.get_status(tenant_id)


@router.post("/setup", summary="Initialiser le tenant (indicateurs + org)")
async def setup_onboarding(
    request: OnboardingSetupRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Initialise le tenant avec :
    - Une organisation par défaut
    - Les indicateurs ESRS/GRI/TCFD du secteur choisi
    """
    service = TenantOnboardingService(db)
    return await service.setup(
        tenant_id=tenant_id,
        sector=request.sector,
        org_name=request.org_name,
    )


@router.get("/sectors", summary="Liste des secteurs disponibles")
async def list_sectors():
    """Retourne les secteurs supportés avec leurs labels."""
    return {
        "sectors": [
            {"value": "general", "label": "Général (tous secteurs)", "icon": "Globe"},
            {"value": "technology", "label": "Technologie & Numérique", "icon": "Cpu"},
            {"value": "finance", "label": "Finance & Banque", "icon": "TrendingUp"},
            {"value": "industry", "label": "Industrie & Manufacture", "icon": "Factory"},
            {"value": "services", "label": "Services & Conseil", "icon": "Briefcase"},
            {"value": "retail", "label": "Commerce & Distribution", "icon": "ShoppingCart"},
        ]
    }
PYEOF

# =============================================================================
echo "3/9 — Migration BDD : workflow de validation des données..."
# =============================================================================
cat > "$BACKEND/db/migrations/versions/002_add_validation_workflow.py" << 'PYEOF'
"""Add validation workflow to indicator_data

Revision ID: 002
Revises: 001
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Statut de validation (draft → pending_review → approved / rejected)
    op.add_column(
        "indicator_data",
        sa.Column(
            "validation_status",
            sa.String(20),
            nullable=False,
            server_default="draft",
            comment="draft | pending_review | approved | rejected",
        ),
    )
    op.add_column(
        "indicator_data",
        sa.Column(
            "submitted_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "indicator_data",
        sa.Column(
            "submitted_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "indicator_data",
        sa.Column(
            "reviewed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "indicator_data",
        sa.Column(
            "reviewed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "indicator_data",
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_indicator_data_validation_status",
        "indicator_data",
        ["tenant_id", "validation_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_indicator_data_validation_status", table_name="indicator_data")
    op.drop_column("indicator_data", "reviewer_notes")
    op.drop_column("indicator_data", "reviewed_at")
    op.drop_column("indicator_data", "reviewed_by")
    op.drop_column("indicator_data", "submitted_at")
    op.drop_column("indicator_data", "submitted_by")
    op.drop_column("indicator_data", "validation_status")
PYEOF

# =============================================================================
echo "4/9 — Mise à jour modèle IndicatorData (colonnes validation)..."
# =============================================================================
cat > "$BACKEND/models/indicator_data.py" << 'PYEOF'
"""
Indicator Data model - ESG indicator values over time.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import date, datetime

from sqlalchemy import String, Float, ForeignKey, Date, Text, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.indicator import Indicator
    from app.models.organization import Organization
    from app.models.data_upload import DataUpload
    from app.models.user import User


class IndicatorData(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """Time-series data for ESG indicators with validation workflow."""

    __tablename__ = "indicator_data"

    __table_args__ = (
        Index("ix_indicator_data_indicator_date", "indicator_id", "date"),
        Index("ix_indicator_data_org_date", "organization_id", "date"),
        Index("ix_indicator_data_validation_status", "tenant_id", "validation_status"),
    )

    # ── Foreign keys ──────────────────────────────────────────────────────
    indicator_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("indicators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    upload_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("data_uploads.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Données ───────────────────────────────────────────────────────────
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="manual"
    )

    # ── Qualité ───────────────────────────────────────────────────────────
    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    is_estimated: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # ── Workflow de validation ─────────────────────────────────────────────
    validation_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        comment="draft | pending_review | approved | rejected",
    )
    submitted_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    reviewed_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relations ─────────────────────────────────────────────────────────
    indicator: Mapped["Indicator"] = relationship("Indicator")
    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    upload: Mapped[Optional["DataUpload"]] = relationship("DataUpload")
    tenant: Mapped["Tenant"] = relationship("Tenant")
    submitter: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[submitted_by]
    )
    reviewer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[reviewed_by]
    )

    def __repr__(self) -> str:
        return (
            f"<IndicatorData(indicator={self.indicator_id}, "
            f"date={self.date}, value={self.value}, status={self.validation_status})>"
        )
PYEOF

# =============================================================================
echo "5/9 — Endpoints validation workflow..."
# =============================================================================
cat > "$BACKEND/api/v1/endpoints/validation_workflow.py" << 'PYEOF'
"""
Validation Workflow API — Gestion des statuts de validation des données ESG.
Flux : draft → pending_review → approved / rejected
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_tenant_id, get_current_user_id
from app.models.indicator_data import IndicatorData

router = APIRouter(prefix="/validation", tags=["Validation Workflow"])


# ─────────────────────────────────────────────────────────────────────────────
#  Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SubmitForReviewRequest(BaseModel):
    data_ids: List[UUID] = Field(..., description="IDs des entrées à soumettre")


class ReviewDecisionRequest(BaseModel):
    data_id: UUID
    notes: Optional[str] = Field(None, max_length=1000)


class ValidationStatusResponse(BaseModel):
    id: UUID
    validation_status: str
    submitted_by: Optional[UUID]
    submitted_at: Optional[datetime]
    reviewed_by: Optional[UUID]
    reviewed_at: Optional[datetime]
    reviewer_notes: Optional[str]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/submit-for-review", summary="Soumettre des données à validation")
async def submit_for_review(
    request: SubmitForReviewRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Passe les entrées de statut 'draft' → 'pending_review'."""
    now = datetime.now(timezone.utc)
    updated = 0

    for data_id in request.data_ids:
        entry = await db.get(IndicatorData, data_id)
        if not entry or entry.tenant_id != tenant_id:
            continue
        if entry.validation_status not in ("draft", "rejected"):
            continue

        entry.validation_status = "pending_review"
        entry.submitted_by = user_id
        entry.submitted_at = now
        entry.reviewed_by = None
        entry.reviewed_at = None
        entry.reviewer_notes = None
        updated += 1

    await db.commit()
    return {"submitted": updated, "total_requested": len(request.data_ids)}


@router.post("/approve", summary="Approuver une entrée")
async def approve_entry(
    request: ReviewDecisionRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Passe l'entrée de statut 'pending_review' → 'approved'."""
    entry = await db.get(IndicatorData, request.data_id)
    if not entry or entry.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    if entry.validation_status != "pending_review":
        raise HTTPException(
            status_code=400,
            detail=f"Statut actuel '{entry.validation_status}' ne peut pas être approuvé",
        )

    entry.validation_status = "approved"
    entry.is_verified = True
    entry.reviewed_by = user_id
    entry.reviewed_at = datetime.now(timezone.utc)
    entry.reviewer_notes = request.notes

    await db.commit()
    return {"success": True, "new_status": "approved"}


@router.post("/reject", summary="Rejeter une entrée")
async def reject_entry(
    request: ReviewDecisionRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Passe l'entrée de statut 'pending_review' → 'rejected'."""
    entry = await db.get(IndicatorData, request.data_id)
    if not entry or entry.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    if entry.validation_status != "pending_review":
        raise HTTPException(
            status_code=400,
            detail=f"Statut actuel '{entry.validation_status}' ne peut pas être rejeté",
        )

    entry.validation_status = "rejected"
    entry.is_verified = False
    entry.reviewed_by = user_id
    entry.reviewed_at = datetime.now(timezone.utc)
    entry.reviewer_notes = request.notes

    await db.commit()
    return {"success": True, "new_status": "rejected"}


@router.get("/pending", summary="Liste des données en attente de validation")
async def list_pending(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Retourne toutes les entrées au statut 'pending_review'."""
    result = await db.execute(
        select(IndicatorData)
        .where(
            IndicatorData.tenant_id == tenant_id,
            IndicatorData.validation_status == "pending_review",
        )
        .order_by(IndicatorData.submitted_at)
        .offset(skip)
        .limit(limit)
    )
    items = result.scalars().all()
    return {
        "items": [ValidationStatusResponse.model_validate(i) for i in items],
        "total": len(items),
    }


@router.get("/stats", summary="Statistiques de validation")
async def validation_stats(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Retourne le nombre d'entrées par statut."""
    from sqlalchemy import func
    result = await db.execute(
        select(IndicatorData.validation_status, func.count(IndicatorData.id))
        .where(IndicatorData.tenant_id == tenant_id)
        .group_by(IndicatorData.validation_status)
    )
    counts = {row[0]: row[1] for row in result.fetchall()}
    return {
        "draft": counts.get("draft", 0),
        "pending_review": counts.get("pending_review", 0),
        "approved": counts.get("approved", 0),
        "rejected": counts.get("rejected", 0),
        "total": sum(counts.values()),
    }
PYEOF

# =============================================================================
echo "6/9 — Frontend : FirstTimeSetup + useOnboarding..."
# =============================================================================
mkdir -p "$FRONTEND/pages/Setup"
cat > "$FRONTEND/pages/Setup/FirstTimeSetup.tsx" << 'TSEOF'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Cpu, TrendingUp, Factory, Briefcase, ShoppingCart,
  Building2, ArrowRight, ArrowLeft, CheckCircle, Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

const SECTORS = [
  { value: 'general',    label: 'Général',       desc: 'Tous secteurs confondus',       icon: Globe,        color: 'from-gray-500 to-gray-600' },
  { value: 'technology', label: 'Technologie',   desc: 'Tech, numérique, SaaS',         icon: Cpu,          color: 'from-blue-500 to-cyan-500' },
  { value: 'finance',    label: 'Finance',        desc: 'Banque, assurance, asset mgmt', icon: TrendingUp,   color: 'from-green-500 to-emerald-500' },
  { value: 'industry',   label: 'Industrie',      desc: 'Manufacture, énergie, chimie',  icon: Factory,      color: 'from-orange-500 to-red-500' },
  { value: 'services',   label: 'Services',       desc: 'Conseil, IT services, RH',      icon: Briefcase,    color: 'from-purple-500 to-violet-500' },
  { value: 'retail',     label: 'Commerce',       desc: 'Distribution, retail, FMCG',   icon: ShoppingCart, color: 'from-pink-500 to-rose-500' },
];

const STEPS = ['Secteur', 'Organisation', 'Confirmation'];

export default function FirstTimeSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [sector, setSector] = useState('general');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/setup', { sector, org_name: orgName || undefined });
      toast.success('Plateforme initialisée avec succès !');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'initialisation');
    } finally {
      setLoading(false);
    }
  };

  const selectedSector = SECTORS.find(s => s.value === sector)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur ESGFlow</h1>
          <p className="text-gray-500 mt-2">Configurons votre espace en 3 étapes rapides</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-primary-600 text-white' :
                i === step ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${i <= step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Étape 0 — Secteur */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Quel est votre secteur d'activité ?</h2>
              <p className="text-gray-500 text-sm mb-6">Nous sélectionnerons les indicateurs ESG les plus pertinents pour vous.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SECTORS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setSector(s.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        sector === s.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-lg flex items-center justify-center mb-2`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="font-semibold text-gray-900 text-sm">{s.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Étape 1 — Organisation */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Votre organisation principale</h2>
              <p className="text-gray-500 text-sm mb-6">C'est l'entité dont vous allez suivre la performance ESG.</p>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom de l'organisation
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="Ex: Acme Corp France"
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Vous pourrez en ajouter d'autres depuis les paramètres.</p>
            </div>
          )}

          {/* Étape 2 — Confirmation */}
          {step === 2 && (
            <div className="text-center">
              <div className={`w-20 h-20 bg-gradient-to-br ${selectedSector.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                {(() => { const Icon = selectedSector.icon; return <Icon className="h-10 w-10 text-white" />; })()}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tout est prêt !</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Secteur</span>
                  <span className="font-semibold text-gray-900">{selectedSector.label}</span>
                </div>
                {orgName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Organisation</span>
                    <span className="font-semibold text-gray-900">{orgName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Indicateurs</span>
                  <span className="font-semibold text-green-600">
                    {sector === 'general' ? '14' : '17-18'} indicateurs ESRS/GRI
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Un clic pour initialiser votre plateforme avec ces paramètres.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
              >
                Continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Lancer ESGFlow
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
TSEOF

cat > "$FRONTEND/hooks/useOnboarding.ts" << 'TSEOF'
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import api from '@/services/api';

interface OnboardingStatus {
  completed: boolean;
  has_organizations: boolean;
  has_indicators: boolean;
  sector: string;
  org_count: number;
  indicator_count: number;
}

export function useOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isInitializing = useSelector((s: RootState) => s.auth.isInitializing);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isInitializing || !isAuthenticated) return;
    if (location.pathname === '/app/setup') return; // éviter boucle

    const check = async () => {
      try {
        const res = await api.get('/onboarding/status');
        const data: OnboardingStatus = res.data;
        setStatus(data);
        if (!data.completed) {
          navigate('/app/setup', { replace: true });
        }
      } catch {
        // Silencieux — ne pas bloquer si l'endpoint est indisponible
      } finally {
        setChecked(true);
      }
    };

    check();
  }, [isAuthenticated, isInitializing, location.pathname]);

  return { status, checked };
}
TSEOF

# =============================================================================
echo "7/9 — Composant CookieConsent RGPD..."
# =============================================================================
cat > "$FRONTEND/components/CookieConsent.tsx" << 'TSEOF'
import { useState, useEffect } from 'react';
import { Cookie, Settings, X, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'esgflow_cookie_consent';

interface CookiePreferences {
  functional: boolean;  // toujours true — nécessaires
  analytics: boolean;
  marketing: boolean;
}

function loadPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  // Dispatche un événement custom pour que d'autres composants puissent réagir
  window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: prefs }));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    functional: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const existing = loadPreferences();
    if (!existing) {
      // Délai pour ne pas afficher immédiatement au chargement
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    const all = { functional: true, analytics: true, marketing: true };
    savePreferences(all);
    setVisible(false);
  };

  const rejectAll = () => {
    const min = { functional: true, analytics: false, marketing: false };
    savePreferences(min);
    setVisible(false);
  };

  const saveCustom = () => {
    savePreferences(prefs);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Cookie className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Gestion des cookies</h3>
            <p className="text-xs text-gray-500">Conformément au RGPD & Directive ePrivacy</p>
          </div>
          <button
            onClick={rejectAll}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            aria-label="Fermer et refuser"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="px-5 py-4">
          {!showDetails ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              Nous utilisons des cookies pour assurer le bon fonctionnement de la plateforme
              et améliorer votre expérience. Vous pouvez personnaliser vos préférences ou
              accepter tous les cookies.
            </p>
          ) : (
            <div className="space-y-3">
              {[
                {
                  key: 'functional' as const,
                  label: 'Cookies fonctionnels',
                  desc: 'Authentification, session, préférences — obligatoires',
                  locked: true,
                },
                {
                  key: 'analytics' as const,
                  label: 'Cookies analytiques',
                  desc: 'Mesure d\'audience anonymisée pour améliorer la plateforme',
                  locked: false,
                },
                {
                  key: 'marketing' as const,
                  label: 'Cookies marketing',
                  desc: 'Personnalisation des contenus et communications',
                  locked: false,
                },
              ].map(({ key, label, desc, locked }) => (
                <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <button
                    disabled={locked}
                    onClick={() => !locked && setPrefs(p => ({ ...p, [key]: !p[key] }))}
                    className={`relative flex-shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors ${
                      prefs[key] ? 'bg-primary-600' : 'bg-gray-300'
                    } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        prefs[key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{label}</span>
                      {locked && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          Requis
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Tout accepter
            </button>
            <button
              onClick={rejectAll}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Tout refuser
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDetails(d => !d)}
              className="flex-1 py-2 text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 transition-colors"
            >
              <Settings className="h-3 w-3" />
              {showDetails ? 'Masquer' : 'Personnaliser'}
            </button>
            {showDetails && (
              <button
                onClick={saveCustom}
                className="flex-1 py-2 text-xs text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              >
                Enregistrer mes choix
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hook utilitaire — vérifie si l'analytics est consenti */
export function useCookieConsent() {
  const [prefs, setPrefs] = useState<CookiePreferences>(
    () => loadPreferences() ?? { functional: true, analytics: false, marketing: false }
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<CookiePreferences>;
      setPrefs(custom.detail);
    };
    window.addEventListener('cookieConsentChanged', handler);
    return () => window.removeEventListener('cookieConsentChanged', handler);
  }, []);

  return prefs;
}
TSEOF

# =============================================================================
echo "8/9 — ProductTour (react-joyride) + ValidationBadge..."
# =============================================================================
cat > "$FRONTEND/components/ProductTour.tsx" << 'TSEOF'
import { useState, useEffect } from 'react';
import Joyride, { type CallBackProps, STATUS, type Step } from 'react-joyride';

const TOUR_KEY = 'esgflow_tour_v1_done';

const STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: '👋 Bienvenue sur ESGFlow !',
    content: 'Découvrez en 2 minutes les fonctionnalités clés de votre plateforme ESG.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: '📊 Tableau de bord exécutif',
    content: 'Vue consolidée de votre performance ESG : scores, tendances et alertes en temps réel.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-data-entry"]',
    title: '✏️ Saisie des données',
    content: 'Enregistrez vos indicateurs ESG manuellement ou importez un fichier CSV.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-indicators"]',
    title: '📋 Indicateurs ESG',
    content: '160+ indicateurs ESRS, GRI et TCFD pré-configurés selon votre secteur.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-scores"]',
    title: '🏆 Scoring ESG',
    content: 'Calculez votre score global et par pilier (E, S, G) avec ratings AAA à D.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-reports"]',
    title: '📄 Rapports',
    content: 'Générez des rapports CSRD, GRI, TCFD en PDF en un seul clic.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-organizations"]',
    title: '🏢 Organisations',
    content: 'Gérez plusieurs entités et comparez leurs performances ESG.',
    placement: 'right',
  },
  {
    target: '[data-tour="header-user"]',
    title: '⚙️ Votre compte',
    content: 'Accédez aux paramètres, gestion des utilisateurs et méthodes de calcul.',
    placement: 'bottom-end',
  },
];

interface ProductTourProps {
  /** Forcer l'affichage même si déjà fait (ex: bouton "Revoir le tour") */
  forceRun?: boolean;
  onFinish?: () => void;
}

export default function ProductTour({ forceRun = false, onFinish }: ProductTourProps) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (forceRun) {
      setRun(true);
      return;
    }
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Délai pour laisser le DOM se stabiliser
      const t = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(t);
    }
  }, [forceRun]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      localStorage.setItem(TOUR_KEY, 'true');
      setRun(false);
      onFinish?.();
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      callback={handleCallback}
      locale={{
        back: 'Précédent',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer le tour',
      }}
      styles={{
        options: {
          primaryColor: '#16a34a',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#111827',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '16px',
        },
        buttonNext: {
          borderRadius: '8px',
          padding: '8px 18px',
          fontWeight: '600',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '13px',
        },
      }}
    />
  );
}
TSEOF

cat > "$FRONTEND/components/common/ValidationBadge.tsx" << 'TSEOF'
import { Clock, CheckCircle, XCircle, FileEdit } from 'lucide-react';

type ValidationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

const CONFIG: Record<ValidationStatus, {
  label: string;
  icon: typeof Clock;
  classes: string;
}> = {
  draft: {
    label: 'Brouillon',
    icon: FileEdit,
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  pending_review: {
    label: 'En attente',
    icon: Clock,
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  approved: {
    label: 'Approuvé',
    icon: CheckCircle,
    classes: 'bg-green-100 text-green-700 border-green-200',
  },
  rejected: {
    label: 'Rejeté',
    icon: XCircle,
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
};

interface ValidationBadgeProps {
  status: ValidationStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function ValidationBadge({
  status,
  size = 'md',
  showIcon = true,
}: ValidationBadgeProps) {
  const cfg = CONFIG[status as ValidationStatus] ?? CONFIG.draft;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${cfg.classes} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {cfg.label}
    </span>
  );
}
TSEOF

# =============================================================================
echo "9/9 — Intégrations automatiques (routes, main.py, App.tsx)..."
# =============================================================================

# ── Patch main.py : ajouter les 2 nouveaux routers ───────────────────────────
python3 << 'PYPATCH'
import re

path = "backend/app/main.py"
content = open(path).read()

# Ajouter les imports s'ils n'existent pas
if "from app.api.v1.endpoints import onboarding" not in content:
    content = content.replace(
        "from app.api.v1.endpoints import register",
        "from app.api.v1.endpoints import register\nfrom app.api.v1.endpoints import onboarding\nfrom app.api.v1.endpoints import validation_workflow",
    )

# Ajouter les include_router s'ils n'existent pas
if "onboarding.router" not in content:
    content = content.replace(
        'app.include_router(register.router, prefix="/api/v1/auth", tags=["Authentication"])',
        'app.include_router(register.router, prefix="/api/v1/auth", tags=["Authentication"])\napp.include_router(onboarding.router, prefix="/api/v1", tags=["Onboarding"])\napp.include_router(validation_workflow.router, prefix="/api/v1", tags=["Validation Workflow"])',
    )

open(path, "w").write(content)
print("  ✅ main.py patché")
PYPATCH

# ── Patch routes.tsx : ajouter FirstTimeSetup ────────────────────────────────
python3 << 'PYPATCH'
path = "frontend/src/routes.tsx"
content = open(path).read()

if "FirstTimeSetup" not in content:
    # Import
    content = content.replace(
        "// Pages légales",
        "import FirstTimeSetup from '@/pages/Setup/FirstTimeSetup';\n\n// Pages légales",
    )
    # Route dans la section privée
    content = content.replace(
        '<Route path="settings/esg-enrichment" element={<DataEnrichment />} />',
        '<Route path="settings/esg-enrichment" element={<DataEnrichment />} />\n        <Route path="setup" element={<FirstTimeSetup />} />',
    )

open(path, "w").write(content)
print("  ✅ routes.tsx patché")
PYPATCH

# ── Patch App.tsx : ajouter CookieConsent + ProductTour ──────────────────────
python3 << 'PYPATCH'
path = "frontend/src/App.tsx"
content = open(path).read()

if "CookieConsent" not in content:
    content = content.replace(
        "import api from './services/api';",
        "import api from './services/api';\nimport CookieConsent from './components/CookieConsent';\nimport ProductTour from './components/ProductTour';",
    )
    content = content.replace(
        "    <BrowserRouter>\n      <AppRoutes />",
        "    <BrowserRouter>\n      <AppRoutes />\n      <CookieConsent />\n      <ProductTour />",
    )

open(path, "w").write(content)
print("  ✅ App.tsx patché")
PYPATCH

# ── Installer react-joyride ──────────────────────────────────────────────────
echo ""
echo "📦 Installation de react-joyride..."
cd "$PROJ/frontend" && npm install react-joyride --silent && cd "$PROJ"
echo "  ✅ react-joyride installé"

# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                 ✅ INSTALLATION TERMINÉE                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "FICHIERS CRÉÉS :"
echo "  backend/app/services/tenant_onboarding.py       (templates sectoriels)"
echo "  backend/app/api/v1/endpoints/onboarding.py      (GET /status, POST /setup)"
echo "  backend/app/api/v1/endpoints/validation_workflow.py  (approve/reject/pending)"
echo "  backend/app/db/migrations/versions/002_add_validation_workflow.py"
echo "  backend/app/models/indicator_data.py             (+ colonnes validation)"
echo "  frontend/src/pages/Setup/FirstTimeSetup.tsx      (wizard 3 étapes)"
echo "  frontend/src/hooks/useOnboarding.ts              (hook redirect auto)"
echo "  frontend/src/components/CookieConsent.tsx        (bannière RGPD)"
echo "  frontend/src/components/ProductTour.tsx          (tour react-joyride)"
echo "  frontend/src/components/common/ValidationBadge.tsx"
echo ""
echo "FICHIERS MODIFIÉS AUTOMATIQUEMENT :"
echo "  backend/app/main.py          (+ 2 routers)"
echo "  frontend/src/routes.tsx      (+ route /app/setup)"
echo "  frontend/src/App.tsx         (+ CookieConsent + ProductTour)"
echo ""
echo "ACTIONS MANUELLES REQUISES :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. MIGRATION BASE DE DONNÉES — exécuter une fois :"
echo "   cd backend"
echo "   alembic upgrade head"
echo "   (ou psql : ALTER TABLE indicator_data ADD COLUMN validation_status VARCHAR(20) NOT NULL DEFAULT 'draft';)"
echo ""
echo "2. TOUR GUIDÉ — Ajouter data-tour aux éléments du Sidebar.tsx :"
echo "   Sur le lien Dashboard     → data-tour=\"sidebar-dashboard\""
echo "   Sur le lien Saisie        → data-tour=\"sidebar-data-entry\""
echo "   Sur le lien Indicateurs   → data-tour=\"sidebar-indicators\""
echo "   Sur le lien Scores        → data-tour=\"sidebar-scores\""
echo "   Sur le lien Rapports      → data-tour=\"sidebar-reports\""
echo "   Sur le lien Organisations → data-tour=\"sidebar-organizations\""
echo "   Sur le bouton user Header → data-tour=\"header-user\""
echo ""
echo "3. HOOK ONBOARDING dans Layout.tsx (optionnel, pour redirect auto) :"
echo "   Ajouter dans Layout.tsx : import { useOnboarding } from '@/hooks/useOnboarding';"
echo "   Puis dans le composant   : useOnboarding(); // redirige si setup non fait"
echo ""
echo "4. VALIDATION BADGE — Utilisation dans vos composants data :"
echo "   import ValidationBadge from '@/components/common/ValidationBadge';"
echo "   <ValidationBadge status={row.validation_status} />"
echo ""
echo "5. REDÉMARRER le backend pour charger les nouveaux endpoints :"
echo "   cd backend && uvicorn app.main:app --reload"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
