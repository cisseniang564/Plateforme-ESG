"""
Connector Marketplace — public catalog of all data connectors available
on the platform. The actual integration code lives in domain-specific
endpoints (enedis, schneider, sage_cegid, …); this catalog gives a single
source of truth for the marketplace UI and lets us add "coming soon" items
without writing a full backend module first.
"""
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user
from app.models.user import User

router = APIRouter()


# ─── Catalog definition ──────────────────────────────────────────────────────
# `status` values: available | beta | coming_soon
# `category` values: energy | accounting | erp | hr | scope3 | banking | crm | other

CONNECTOR_CATALOG: List[Dict] = [
    # ── Energy ─────────────────────────────────────────────────────────────
    {
        "id": "enedis",
        "name": "Enedis Linky",
        "category": "energy",
        "description": "Récupération automatique des consommations électriques quart-horaires depuis Enedis.",
        "data_provided": ["scope2_electricity", "consumption_kwh_monthly"],
        "status": "available",
        "logo_emoji": "⚡",
        "color": "#fbbf24",
        "auth_type": "oauth2",
        "setup_url": "/app/connectors/enedis",
        "country": "FR",
        "doc_url": "https://datahub-enedis.fr/",
    },
    {
        "id": "schneider",
        "name": "Schneider EcoStruxure",
        "category": "energy",
        "description": "Données de consommation site par site depuis EcoStruxure Building Advisor.",
        "data_provided": ["scope2_electricity", "scope1_gas", "site_consumption"],
        "status": "available",
        "logo_emoji": "🏭",
        "color": "#3eb949",
        "auth_type": "api_key",
        "setup_url": "/app/data/connectors?focus=schneider",
        "country": "INTL",
    },
    {
        "id": "engie",
        "name": "ENGIE Pro",
        "category": "energy",
        "description": "Factures gaz et électricité pour les abonnements ENGIE entreprises.",
        "data_provided": ["scope1_gas", "scope2_electricity"],
        "status": "coming_soon",
        "logo_emoji": "🔥",
        "color": "#0fa2d7",
        "country": "FR",
    },
    {
        "id": "totalenergies",
        "name": "TotalEnergies Multi-Énergies",
        "category": "energy",
        "description": "Carburants flotte, gaz, électricité depuis le portail Pro.",
        "data_provided": ["scope1_fuel", "scope1_gas", "scope2_electricity"],
        "status": "coming_soon",
        "logo_emoji": "⛽",
        "color": "#ed1c24",
        "country": "FR",
    },

    # ── Accounting / ERP ───────────────────────────────────────────────────
    {
        "id": "sage_cegid",
        "name": "Sage / Cegid (FEC)",
        "category": "accounting",
        "description": "Import FEC (Fichier des Écritures Comptables) pour calcul Scope 3 par dépense.",
        "data_provided": ["scope3_spend_based", "supplier_list"],
        "status": "available",
        "logo_emoji": "📊",
        "color": "#0070d2",
        "auth_type": "file_upload",
        # Route directly to the polished import flow with FEC auto-detection
        # (filename matching + ≥2 FEC-specific column keywords). The old
        # ``/app/data/connectors?focus=sage-cegid`` landing was the legacy
        # tabbed hub where users had no clear "Upload FEC" action.
        "setup_url": "/app/import-csv?type=fec",
        "country": "FR",
    },
    {
        "id": "quickbooks",
        "name": "QuickBooks",
        "category": "accounting",
        "description": "Synchronisation des achats et factures fournisseurs.",
        "data_provided": ["scope3_spend_based", "supplier_list"],
        "status": "coming_soon",
        "logo_emoji": "💼",
        "color": "#2ca01c",
        "country": "INTL",
    },
    {
        "id": "pennylane",
        "name": "Pennylane",
        "category": "accounting",
        "description": "Logiciel comptable nouvelle génération — synchronisation automatique des factures fournisseurs pour calcul Scope 3 spend-based.",
        "data_provided": ["scope3_spend_based", "supplier_list", "capex_opex_split"],
        "status": "available",
        "logo_emoji": "🔷",
        "color": "#6366f1",
        "country": "FR",
        "auth_type": "api_key",
        "setup_url": "/app/connectors/pennylane",
    },
    {
        "id": "sap",
        "name": "SAP S/4HANA",
        "category": "erp",
        "description": "ERP enterprise — connecteur natif via SAP BTP.",
        "data_provided": ["scope3_spend_based", "energy_consumption", "supplier_list", "hr_metrics"],
        "status": "coming_soon",
        "logo_emoji": "🏛️",
        "color": "#0070d2",
        "country": "INTL",
        "plan_required": "enterprise",
    },
    {
        "id": "oracle_netsuite",
        "name": "Oracle NetSuite",
        "category": "erp",
        "description": "ERP cloud — connecteur SuiteAnalytics.",
        "data_provided": ["scope3_spend_based", "supplier_list"],
        "status": "coming_soon",
        "logo_emoji": "🔶",
        "color": "#c74634",
        "country": "INTL",
        "plan_required": "enterprise",
    },

    # ── HR / Effectifs ─────────────────────────────────────────────────────
    {
        "id": "silae",
        "name": "Silae",
        "category": "hr",
        "description": "Logiciel de paie leader en France — import CSV des effectifs, formation, absentéisme, accidents du travail.",
        "data_provided": ["s1_workforce", "s1_payroll", "s1_training_hours", "s1_accidents"],
        "status": "available",
        "logo_emoji": "📊",
        "color": "#1a56db",
        "auth_type": "csv_import",
        "setup_url": "/app/data/hr-import?source=silae",
        "country": "FR",
    },
    {
        "id": "lucca",
        "name": "Lucca",
        "category": "hr",
        "description": "SIRH français — diversité, formation, absentéisme, écart salarial H/F.",
        "data_provided": ["s1_diversity", "s1_training_hours", "s1_pay_gap"],
        "status": "available",
        "logo_emoji": "👥",
        "color": "#ff5a00",
        "auth_type": "csv_import",
        "setup_url": "/app/data/hr-import?source=lucca",
        "country": "FR",
    },
    {
        "id": "payfit",
        "name": "PayFit",
        "category": "hr",
        "description": "Paie et RH — effectifs, masse salariale, ancienneté, formation.",
        "data_provided": ["s1_workforce", "s1_payroll", "s1_training_hours"],
        "status": "available",
        "logo_emoji": "💰",
        "color": "#0066ff",
        "auth_type": "csv_import",
        "setup_url": "/app/data/hr-import?source=payfit",
        "country": "FR",
    },

    # ── Scope 3 / Voyage / Mobilité ────────────────────────────────────────
    {
        "id": "egencia",
        "name": "Egencia Travel",
        "category": "scope3",
        "description": "Voyages d'affaires — émissions vol/train/voiture automatiques.",
        "data_provided": ["scope3_business_travel"],
        "status": "coming_soon",
        "logo_emoji": "✈️",
        "color": "#003366",
        "country": "INTL",
    },
    {
        "id": "swile",
        "name": "Swile",
        "category": "hr",
        "description": "Titres-restaurants, mobilité douce, frais professionnels.",
        "data_provided": ["scope3_employee_commuting", "s1_benefits"],
        "status": "available",
        "logo_emoji": "🥗",
        "color": "#ff5a5f",
        "auth_type": "csv_import",
        "setup_url": "/app/data/hr-import?source=swile",
        "country": "FR",
    },

    # ── Banking / Spend ────────────────────────────────────────────────────
    {
        "id": "qonto",
        "name": "Qonto",
        "category": "banking",
        "description": "Néobanque pro — synchronisation automatique des transactions bancaires pour calcul Scope 3 spend-based.",
        "data_provided": ["scope3_spend_based", "supplier_list"],
        "status": "available",
        "logo_emoji": "🏦",
        "color": "#0a1f44",
        "country": "FR",
        "auth_type": "api_key",
        "setup_url": "/app/connectors/qonto",
    },
    {
        "id": "spendesk",
        "name": "Spendesk",
        "category": "banking",
        "description": "Gestion des notes de frais — Scope 3 voyage + achats.",
        "data_provided": ["scope3_spend_based", "scope3_business_travel"],
        "status": "available",
        "logo_emoji": "💳",
        "color": "#003e94",
        "country": "FR",
        "auth_type": "csv_import",
        "setup_url": "/app/data/fec-import?source=spendesk",
    },

    # ── Cloud / IT ────────────────────────────────────────────────────────
    {
        "id": "aws_carbon",
        "name": "AWS Customer Carbon Footprint",
        "category": "other",
        "description": "Empreinte carbone de votre usage AWS — Scope 3 cloud.",
        "data_provided": ["scope3_cloud_computing"],
        "status": "coming_soon",
        "logo_emoji": "☁️",
        "color": "#ff9900",
        "country": "INTL",
    },
    {
        "id": "azure_emissions",
        "name": "Microsoft Cloud for Sustainability",
        "category": "other",
        "description": "Émissions de votre tenant Azure / Microsoft 365.",
        "data_provided": ["scope3_cloud_computing", "scope2_electricity"],
        "status": "coming_soon",
        "logo_emoji": "☁️",
        "color": "#0078d4",
        "country": "INTL",
    },
]


@router.get("/catalog")
async def get_connector_catalog(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the full marketplace catalog plus per-tenant integration status."""
    # Compute per-id installed/connected status from existing integration table (best-effort)
    installed_ids: set[str] = set()
    try:
        from app.models.integration import Integration
        async with db.begin_nested():
            res = await db.execute(
                select(Integration.provider, Integration.status).where(Integration.tenant_id == current_user.tenant_id)
            )
            for provider, status_value in res.all():
                if provider and (status_value or "").lower() in ("active", "connected", "configured"):
                    installed_ids.add(provider.lower())
    except Exception:
        pass

    counts = {"available": 0, "beta": 0, "coming_soon": 0, "installed": 0}
    items = []
    for c in CONNECTOR_CATALOG:
        connected = c["id"].lower() in installed_ids
        counts[c["status"]] = counts.get(c["status"], 0) + 1
        if connected:
            counts["installed"] += 1
        items.append({**c, "is_connected": connected})

    return {"items": items, "counts": counts, "total": len(items)}


class ConnectorSuggestRequest(BaseModel := __import__("pydantic").BaseModel):
    """Allow users to suggest a missing connector (boosts product roadmap signal)."""
    name: str
    category: Optional[str] = None
    notes: Optional[str] = None


@router.post("/suggest", status_code=201)
async def suggest_connector(
    body: ConnectorSuggestRequest,
    current_user: User = Depends(get_current_user),
):
    """Record a user suggestion (best-effort, stored as audit log entry)."""
    try:
        from app.models.audit_log import AuditLog
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            session.add(AuditLog(
                tenant_id=current_user.tenant_id,
                user_id=current_user.id,
                action="connector.suggest",
                resource_type="connector",
                resource_id=None,
                details={"name": body.name, "category": body.category, "notes": body.notes},
            ))
            await session.commit()
    except Exception:
        # Non-blocking: even if logging fails, return success to the user
        pass
    return {"message": "Suggestion enregistrée. Notre équipe l'examinera dans les prochains jours."}
