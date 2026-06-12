"""
Demo Tenant — provisioning of a sandbox tenant with realistic data for
prospect demos.

Strategy:
  - One dedicated tenant named "ESGflow Démo".
  - One viewer-role user `demo@esgflow.io` (read-only).
  - Pre-populated with: 1 organization, ~30 DataEntry, 4 materiality issues,
    5 ESG risks, 3 suppliers, 1 ESG score.
  - Re-runnable: idempotent (UPSERT-like behavior on the demo tenant).

The viewer role prevents the prospect from accidentally mutating anything
that would persist for other prospects. JWT issued by /auth/demo-session
has a short lifetime (1 hour).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone, date
from typing import Optional
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant
from app.models.user import User
from app.models.role import Role
from app.models.organization import Organization
from app.models.data_entry import DataEntry
from app.models.materiality import MaterialityIssue, ESGRisk
from app.models.esg_score import ESGScore
from app.utils.security import get_password_hash

import logging
logger = logging.getLogger(__name__)


DEMO_TENANT_SLUG = "esgflow-demo"
DEMO_TENANT_NAME = "ESGflow Démo"
DEMO_USER_EMAIL  = "demo@esgflow.io"


async def _get_or_create_role(db: AsyncSession, name: str) -> Role:
    res = await db.execute(select(Role).where(Role.name == name))
    role = res.scalar_one_or_none()
    if role:
        return role
    role = Role(name=name, description=f"Rôle système — {name}")
    db.add(role)
    await db.flush()
    return role


async def get_or_create_demo_tenant(db: AsyncSession) -> tuple[Tenant, User]:
    """Idempotent: returns the demo tenant + viewer user, creating them if missing."""
    # ── Tenant ────────────────────────────────────────────────────────────
    t_res = await db.execute(select(Tenant).where(Tenant.slug == DEMO_TENANT_SLUG))
    tenant = t_res.scalar_one_or_none()
    if not tenant:
        tenant = Tenant(
            name=DEMO_TENANT_NAME,
            slug=DEMO_TENANT_SLUG,
            plan_tier="pro",  # Demo shows the Pro experience
            max_users=10,
            max_orgs=5,
            max_monthly_api_calls=10_000,
            settings={"is_demo": True, "onboarding_done": True},
        )
        db.add(tenant)
        await db.flush()
        logger.info("Created demo tenant id=%s", tenant.id)
    else:
        # Refresh demo flag in case
        s = dict(tenant.settings or {})
        s["is_demo"] = True
        s.setdefault("onboarding_done", True)
        tenant.settings = s

    # ── Viewer user ───────────────────────────────────────────────────────
    viewer_role = await _get_or_create_role(db, "viewer")

    u_res = await db.execute(select(User).where(User.email == DEMO_USER_EMAIL))
    user = u_res.scalar_one_or_none()
    if not user:
        user = User(
            tenant_id=tenant.id,
            email=DEMO_USER_EMAIL,
            password_hash=get_password_hash("demo-not-a-real-password-" + str(tenant.id)),
            first_name="Démo",
            last_name="Prospect",
            role_id=viewer_role.id,
            is_active=True,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()
        logger.info("Created demo user id=%s", user.id)
    else:
        # Make sure it stays viewer
        if user.role_id != viewer_role.id:
            user.role_id = viewer_role.id
        user.is_active = True
        user.tenant_id = tenant.id

    return tenant, user


async def seed_demo_data(db: AsyncSession) -> dict:
    """Populate the demo tenant with realistic ESG data. Safe to re-run."""
    tenant, user = await get_or_create_demo_tenant(db)

    # ── Set RLS context so subsequent INSERTs pass tenant-scoped policies ──
    await db.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, false)"),
        {"tid": str(tenant.id)},
    )

    counts = {"organizations": 0, "data_entries": 0, "materiality": 0, "risks": 0, "scores": 0}

    # ── Organization ──────────────────────────────────────────────────────
    org_res = await db.execute(select(Organization).where(Organization.tenant_id == tenant.id).limit(1))
    org = org_res.scalar_one_or_none()
    if not org:
        org = Organization(
            tenant_id=tenant.id,
            name="GreenTech Industries SAS",
            org_type="company",
            industry="Industrie manufacturière",
            custom_data={"siret": "DEMO-12345678901234", "country": "FR", "size": "ETI", "employees": 450},
        )
        db.add(org)
        await db.flush()
        counts["organizations"] = 1

    # ── Data entries — 30 indicators with realistic values ────────────────
    de_check = await db.execute(select(DataEntry).where(DataEntry.tenant_id == tenant.id).limit(1))
    if not de_check.scalar_one_or_none():
        year_start = date(2025, 1, 1)
        year_end   = date(2025, 12, 31)
        demo_entries = [
            # Environmental
            ("environmental", "Émissions Scope 1 (combustion directe)", "GES", 1280.0, "tCO2e"),
            ("environmental", "Émissions Scope 2 (électricité location-based)", "GES", 845.0, "tCO2e"),
            ("environmental", "Émissions Scope 2 (market-based)", "GES", 320.0, "tCO2e"),
            ("environmental", "Émissions Scope 3 totales", "GES", 14820.0, "tCO2e"),
            ("environmental", "Consommation d'énergie totale", "Energie", 8920.0, "MWh"),
            ("environmental", "Part d'énergie renouvelable", "Energie", 38.5, "%"),
            ("environmental", "Consommation d'eau", "Eau", 14200.0, "m3"),
            ("environmental", "Rejets d'eaux usées", "Eau", 11800.0, "m3"),
            ("environmental", "Déchets dangereux produits", "Dechets", 18.5, "tonnes"),
            ("environmental", "Déchets non dangereux produits", "Dechets", 240.0, "tonnes"),
            ("environmental", "Taux de recyclage des déchets", "Dechets", 72.0, "%"),
            ("environmental", "Émissions polluants atmosphériques (NOx)", "Pollution", 4.2, "tonnes"),
            # Social
            ("social", "Effectif total", "Effectifs", 450.0, "personnes"),
            ("social", "Part de femmes dans l'effectif total", "Diversite", 38.5, "%"),
            ("social", "Part de femmes au comité exécutif", "Diversite", 22.0, "%"),
            ("social", "Écart salarial femmes-hommes", "Diversite", 4.8, "%"),
            ("social", "Taux d'absentéisme", "QVT", 4.1, "%"),
            ("social", "Heures de formation par salarié", "Formation", 18.5, "heures"),
            ("social", "Taux de fréquence des accidents du travail", "Sante_Securite", 12.3, "indice"),
            ("social", "Taux de gravité des accidents du travail", "Sante_Securite", 0.45, "indice"),
            ("social", "Part de CDI dans l'effectif", "Effectifs", 93.0, "%"),
            ("social", "Taux de turnover annuel", "Effectifs", 8.5, "%"),
            # Governance
            ("governance", "Part d'administrateurs indépendants", "Gouvernance", 55.0, "%"),
            ("governance", "Nombre de réunions du conseil d'administration", "Gouvernance", 8.0, "réunions"),
            ("governance", "Part de femmes au conseil d'administration", "Gouvernance", 45.0, "%"),
            ("governance", "Délai de paiement fournisseurs moyen", "Achats", 28.0, "jours"),
            ("governance", "Heures de formation anti-corruption", "Ethique", 425.0, "heures"),
            ("governance", "Nombre d'alertes éthiques reçues", "Ethique", 3.0, "alertes"),
            ("governance", "Part du chiffre d'affaires en R&D", "Innovation", 4.2, "%"),
            ("governance", "Note de satisfaction client (NPS)", "Clients", 42.0, "score"),
        ]
        for pillar, name, category, val, unit in demo_entries:
            db.add(DataEntry(
                tenant_id=tenant.id,
                organization_id=org.id if org else None,
                pillar=pillar,
                metric_name=name,
                category=category,
                value_numeric=val,
                unit=unit,
                period_start=year_start,
                period_end=year_end,
                verification_status="verified",
            ))
        counts["data_entries"] = len(demo_entries)

    # ── Materiality issues (Double matérialité) ────────────────────────────
    mat_check = await db.execute(select(MaterialityIssue).where(MaterialityIssue.tenant_id == tenant.id).limit(1))
    if not mat_check.scalar_one_or_none():
        mat_items = [
            ("Changement climatique", "Environnement", 88, 92, True, "high",
             "Conseil d'administration, Investisseurs, Régulateur",
             "Risque physique sur les sites industriels, transition réglementaire (taxe carbone)."),
            ("Sécurité au travail", "Social", 75, 82, True, "high",
             "Salariés, IRP, Inspection du travail",
             "3 sites classés Seveso, risque accident matériel et humain."),
            ("Gestion de l'eau", "Environnement", 62, 70, True, "medium",
             "Riverains, Agences de l'eau",
             "Consommation industrielle élevée, stress hydrique sur 2 sites."),
            ("Éthique des affaires & anti-corruption", "Gouvernance", 68, 65, True, "high",
             "Régulateur, Auditeurs, Direction",
             "Sapin II — obligation depuis 2017."),
            ("Diversité et inclusion", "Social", 45, 60, False, "medium",
             "Salariés, Investisseurs ESG",
             "Politique D&I formalisée, objectifs 2030 alignés."),
            ("Pollution des sols et de l'eau", "Environnement", 70, 55, True, "high",
             "Riverains, ADEME, Préfecture",
             "Activités classées ICPE, suivi rejets renforcé."),
            ("Données personnelles & cybersécurité", "Gouvernance", 50, 40, False, "medium",
             "Clients, CNIL, Salariés",
             "RGPD, certification ISO 27001 en cours."),
        ]
        for name, cat, fin, esg, is_mat, prio, stake, desc in mat_items:
            db.add(MaterialityIssue(
                tenant_id=tenant.id,
                name=name,
                category=cat,
                financial_impact=float(fin),
                esg_impact=float(esg),
                is_material=is_mat,
                priority=prio,
                stakeholders=stake,
                description=desc,
            ))
        counts["materiality"] = len(mat_items)

    # ── ESG Risks ─────────────────────────────────────────────────────────
    risk_check = await db.execute(select(ESGRisk).where(ESGRisk.tenant_id == tenant.id).limit(1))
    if not risk_check.scalar_one_or_none():
        risks = [
            ("Inondation site Sud (risque climatique physique)", "Environnement", 4, 5, 20, "critical",
             "Plan de continuité d'activité en cours de mise à jour. Étude hydraulique commandée.",
             "Marie Dubois (RSE)"),
            ("Taxe carbone EU CBAM — import acier", "Environnement", 5, 4, 20, "critical",
             "Substitution partielle de fournisseurs intra-UE en cours.",
             "Pierre Martin (Achats)"),
            ("Pénurie de compétences techniques", "Social", 4, 4, 16, "high",
             "Plan de formation interne renforcé + partenariats écoles ingénieurs.",
             "Sophie Laurent (RH)"),
            ("Cybersécurité — ransomware industriel", "Gouvernance", 3, 5, 15, "high",
             "Audit RSSI en cours, plan PCA testé en avril 2026.",
             "Thomas Bernard (DSI)"),
            ("Non-conformité CSRD/ESRS premier exercice", "Gouvernance", 3, 4, 12, "medium",
             "Mise en place ESGflow + accompagnement cabinet en cours.",
             "Marie Dubois (RSE)"),
            ("Accident grave site Seveso", "Social", 2, 5, 10, "high",
             "ISO 45001 certifié, exercices trimestriels.",
             "Jean Rousseau (HSE)"),
            ("Procès en discrimination salariale", "Social", 2, 4, 8, "medium",
             "Audit salaires annualisé depuis 2024.",
             "Sophie Laurent (RH)"),
            ("Greenwashing — communication non substantiée", "Gouvernance", 2, 3, 6, "low",
             "Charte communication ESG validée juridique.",
             "Léa Petit (Communication)"),
        ]
        for title, cat, prob, imp, score, sev, mit, resp in risks:
            db.add(ESGRisk(
                tenant_id=tenant.id,
                title=title,
                category=cat,
                probability=prob,
                impact=imp,
                risk_score=score,
                severity=sev,
                status="active",
                mitigation_plan=mit,
                mitigation_status="in_progress",
                responsible_person=resp,
            ))
        counts["risks"] = len(risks)

    # ── ESG Score ─────────────────────────────────────────────────────────
    score_check = await db.execute(select(ESGScore).where(ESGScore.tenant_id == tenant.id).limit(1))
    if not score_check.scalar_one_or_none() and org:
        db.add(ESGScore(
            tenant_id=tenant.id,
            organization_id=org.id,
            calculation_date=date.today(),
            environmental_score=58.0,
            social_score=72.0,
            governance_score=68.0,
            overall_score=64.0,
            rating="BBB",
            calculation_method="weighted_average",
            data_completeness=78.0,
            confidence_level="high",
        ))
        counts["scores"] = 1

    await db.commit()
    logger.info("Demo seed completed: %s", counts)
    return {"tenant_id": str(tenant.id), "user_id": str(user.id), "counts": counts}
