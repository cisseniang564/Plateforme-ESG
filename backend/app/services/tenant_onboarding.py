"""
Tenant Onboarding Service — 5-step wizard for new tenants.

Steps:
  1. Profile       — company info (name, sector, size, revenue, country, SIREN)
  2. Regulations   — applicable laws derived from profile (CSRD, BEGES, CSDDD…)
  3. Indicators    — pre-selection of indicators tailored to profile + regulations
  4. Import        — choose initial data source (FEC, CSV, skip)
  5. Invitations   — invite teammates with roles

The wizard state lives in ``tenant.settings["onboarding"]`` as a dict so we can
resume at any step. Once step 5 is done, ``tenant.settings["onboarding_done"]``
flips to True and the user is routed to the dashboard.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.organization import Organization
from app.models.user import User


# ─── Indicator templates (kept compact; full lists live in seed scripts) ─────
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

_SECTOR_EXTRA: Dict[str, List[Dict[str, Any]]] = {
    "technology": [
        {"code": "TEC-001", "name": "Déchets électroniques (e-waste)", "pillar": "environmental", "category": "Déchets", "unit": "tonnes", "framework": "GRI 306"},
        {"code": "TEC-002", "name": "PUE des datacenters", "pillar": "environmental", "category": "Énergie", "unit": "ratio", "framework": "ISO 30134"},
    ],
    "finance": [
        {"code": "FIN-001", "name": "Part d'actifs ESG dans le portefeuille", "pillar": "governance", "category": "Finance durable", "unit": "%", "framework": "SFDR"},
        {"code": "FIN-002", "name": "Financement de projets verts", "pillar": "environmental", "category": "Finance verte", "unit": "M€", "framework": "EU Taxonomy"},
    ],
    "industry": [
        {"code": "IND-001", "name": "Déchets industriels valorisés", "pillar": "environmental", "category": "Déchets", "unit": "%", "framework": "GRI 306"},
        {"code": "IND-002", "name": "Émissions GES scope 3", "pillar": "environmental", "category": "Climat", "unit": "tCO2e", "framework": "ESRS E1"},
    ],
    "services": [
        {"code": "SRV-001", "name": "Empreinte carbone par salarié", "pillar": "environmental", "category": "Climat", "unit": "tCO2e/ETP", "framework": "ESRS E1"},
    ],
    "retail": [
        {"code": "RET-001", "name": "Part de produits écoresponsables", "pillar": "environmental", "category": "Produits", "unit": "%", "framework": "EU Taxonomy"},
        {"code": "RET-002", "name": "Pertes alimentaires et gaspillage", "pillar": "environmental", "category": "Déchets", "unit": "tonnes", "framework": "GRI 306"},
    ],
}


# ─── Regulation eligibility logic ─────────────────────────────────────────
def compute_applicable_regulations(profile: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Given a company profile, return the regulations that apply with a
    recommendation level (mandatory / recommended / optional) and the year of
    entry into force.

    Profile keys read:
      - country_code (str, default "FR")
      - employee_count (int)
      - revenue_eur (number)
      - is_listed (bool, default False)
      - has_subsidiaries_outside_eu (bool, default False)
    """
    country = (profile.get("country_code") or "FR").upper()
    employees = int(profile.get("employee_count") or 0)
    revenue = float(profile.get("revenue_eur") or 0)
    is_listed = bool(profile.get("is_listed"))
    eu_country = country in {
        "FR", "DE", "ES", "IT", "BE", "NL", "PT", "AT", "IE", "FI",
        "SE", "DK", "PL", "CZ", "GR", "RO", "HU", "SK", "HR", "BG",
        "EE", "LV", "LT", "SI", "LU", "MT", "CY",
    }

    out: Dict[str, Dict[str, Any]] = {}

    # CSRD wave (EFRAG ESRS) — only for EU companies
    if eu_country:
        if is_listed and (employees > 500 or revenue > 40_000_000):
            out["csrd"] = {"level": "mandatory", "wave": "2025", "label": "CSRD vague 1 (exercice 2024, rapport 2025)"}
        elif employees > 250 and revenue > 50_000_000:
            out["csrd"] = {"level": "mandatory", "wave": "2026", "label": "CSRD vague 2 (exercice 2025, rapport 2026)"}
        elif is_listed and employees > 10 and revenue > 700_000:
            out["csrd"] = {"level": "mandatory", "wave": "2027", "label": "CSRD vague 3 PME cotées (exercice 2026)"}
        else:
            out["csrd"] = {"level": "optional", "wave": None, "label": "CSRD volontaire (PME non cotée)"}

    # BEGES (FR Art. L229-25)
    if country == "FR" and employees > 500:
        out["beges"] = {"level": "mandatory", "wave": "annual", "label": "Bilan GES réglementaire Art. L229-25"}
    elif country == "FR" and employees > 50:
        out["beges"] = {"level": "recommended", "wave": None, "label": "Bilan Carbone (volontaire ADEME)"}

    # CSDDD (EU Devoir de vigilance, in force progressively from 2027)
    if eu_country and (employees > 1_000 or revenue > 450_000_000):
        out["csddd"] = {"level": "mandatory", "wave": "2027", "label": "CSDDD (entrée en vigueur 2027)"}

    # Loi Sapin 2 / Devoir de vigilance 2017-399 (FR-only, very large groups)
    if country == "FR" and employees > 5_000:
        out["sapin_2"] = {"level": "mandatory", "wave": "annual", "label": "Loi 2017-399 — Plan de vigilance"}

    # DPEF (FR legacy, transitioning to CSRD)
    if country == "FR" and is_listed and employees > 500 and revenue > 100_000_000:
        out["dpef"] = {"level": "optional", "wave": "transition", "label": "DPEF (en transition vers CSRD)"}

    # Taxonomie UE (for entities already under CSRD)
    if "csrd" in out and out["csrd"]["level"] == "mandatory":
        out["taxonomy_eu"] = {"level": "mandatory", "wave": "annual", "label": "Taxonomie UE — Eligibilité + Alignement"}

    # SFDR (asset managers — heuristic: sector finance)
    if profile.get("sector") == "finance":
        out["sfdr"] = {"level": "recommended", "wave": "annual", "label": "SFDR — Reporting PAI"}

    return out


# ─── Service ────────────────────────────────────────────────────────────────
class TenantOnboardingService:
    """5-step onboarding wizard, state in tenant.settings['onboarding']."""

    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    # ── Read state ─────────────────────────────────────────────────────────
    async def get_status(self) -> dict:
        from app.models.tenant import Tenant as TenantModel
        tenant = await self.db.get(TenantModel, self.tenant_id)
        settings = (tenant.settings or {}) if tenant else {}
        wizard = settings.get("onboarding", {}) if isinstance(settings, dict) else {}

        # Counts (useful for UI hints)
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

        completed = bool(settings.get("onboarding_done", False))
        current_step = int(wizard.get("current_step", 1))
        profile = wizard.get("profile", {})
        regulations = wizard.get("regulations", {})
        selected_indicators = wizard.get("selected_indicators", [])
        import_choice = wizard.get("import_choice")

        return {
            "completed": completed,
            "current_step": current_step,
            "profile": profile,
            "regulations": regulations,
            "selected_indicators": selected_indicators,
            "import_choice": import_choice,
            "has_organizations": org_count > 0,
            "has_indicators": indicator_count > 0,
            "sector": profile.get("sector", settings.get("onboarding_sector", "general")),
            "org_count": org_count,
            "indicator_count": indicator_count,
        }

    # ── Step 1: Profile ─────────────────────────────────────────────────────
    async def set_profile(self, profile: Dict[str, Any]) -> dict:
        """
        Persist company profile and create / update the primary organization.

        Expected profile keys: org_name, sector, employee_count, revenue_eur,
        country_code, siren, is_listed.
        """
        cleaned = self._clean_profile(profile)

        org_name = cleaned.pop("org_name", None) or "Mon entreprise"
        org_result = await self.db.execute(
            select(Organization).where(Organization.tenant_id == self.tenant_id).limit(1)
        )
        org = org_result.scalar_one_or_none()
        if org is None:
            org = Organization(
                tenant_id=self.tenant_id,
                name=org_name,
                org_type="company",
                industry=cleaned.get("sector"),
                country_code=cleaned.get("country_code", "FR"),
                employee_count=cleaned.get("employee_count"),
                revenue_eur=cleaned.get("revenue_eur"),
                siren=cleaned.get("siren"),
            )
            self.db.add(org)
        else:
            org.name = org_name
            org.industry = cleaned.get("sector") or org.industry
            org.country_code = cleaned.get("country_code") or org.country_code
            org.employee_count = cleaned.get("employee_count") or org.employee_count
            if cleaned.get("revenue_eur") is not None:
                org.revenue_eur = cleaned["revenue_eur"]
            if cleaned.get("siren"):
                org.siren = cleaned["siren"]

        # Save profile in tenant settings
        regs = compute_applicable_regulations({**cleaned, "org_name": org_name})
        await self._merge_wizard_state(
            current_step=2,
            profile={**cleaned, "org_name": org_name},
            regulations=regs,
        )

        await self.db.commit()
        return {"success": True, "profile": {**cleaned, "org_name": org_name}, "suggested_regulations": regs, "next_step": 2}

    # ── Step 2: Regulations ────────────────────────────────────────────────
    async def set_regulations(self, selected_codes: List[str]) -> dict:
        """Persist the regulations the user confirms as applicable."""
        state = await self.get_status()
        all_regs = state.get("regulations") or {}
        kept = {k: v for k, v in all_regs.items() if k in selected_codes}
        # Allow user to manually enable a regulation not suggested
        for code in selected_codes:
            if code not in kept:
                kept[code] = {"level": "manual", "wave": None, "label": code}

        await self._merge_wizard_state(current_step=3, regulations=kept)
        await self.db.commit()
        return {"success": True, "regulations": kept, "next_step": 3}

    # ── Step 3: Indicators ─────────────────────────────────────────────────
    async def list_suggested_indicators(self) -> List[Dict[str, Any]]:
        """Return the list of indicators recommended for this tenant's profile."""
        state = await self.get_status()
        sector = state["profile"].get("sector", "general")
        indicators = list(_BASE_INDICATORS)
        if sector in _SECTOR_EXTRA:
            indicators += _SECTOR_EXTRA[sector]

        # Cross-check regulations: mark which framework is relevant
        reg_codes = set(state.get("regulations", {}).keys())
        for ind in indicators:
            framework = (ind.get("framework") or "").upper()
            ind["relevant"] = bool(
                ("CSRD" in reg_codes and framework.startswith("ESRS"))
                or ("BEGES" in reg_codes and "GES" in ind.get("name", ""))
                or ("SFDR" in reg_codes and framework == "SFDR")
                or ("TAXONOMY_EU" in reg_codes and framework == "EU TAXONOMY")
                or True  # default to suggest all base indicators
            )
        return indicators

    async def select_indicators(self, codes: List[str]) -> dict:
        """Seed selected indicators in DB. Idempotent."""
        indicators_data = await self.list_suggested_indicators()
        # Restrict to codes the user picked
        to_seed = [i for i in indicators_data if i["code"] in codes]

        created = 0
        for ind_data in to_seed:
            existing = await self.db.execute(
                select(Indicator).where(
                    Indicator.tenant_id == self.tenant_id,
                    Indicator.code == ind_data["code"],
                )
            )
            if existing.scalar_one_or_none():
                continue
            self.db.add(Indicator(
                tenant_id=self.tenant_id,
                code=ind_data["code"],
                name=ind_data["name"],
                pillar=ind_data["pillar"],
                category=ind_data["category"],
                unit=ind_data["unit"],
                framework=ind_data["framework"],
                description=ind_data["name"],
                is_active=True,
            ))
            created += 1

        await self._merge_wizard_state(current_step=4, selected_indicators=codes)
        await self.db.commit()
        return {"success": True, "indicators_created": created, "next_step": 4}

    # ── Step 4: Import choice ──────────────────────────────────────────────
    async def set_import_choice(self, choice: str) -> dict:
        """Record the user's choice for initial data source: fec, csv, or skip."""
        if choice not in {"template", "fec", "csv", "skip"}:
            choice = "skip"
        await self._merge_wizard_state(current_step=5, import_choice=choice)
        await self.db.commit()
        return {"success": True, "import_choice": choice, "next_step": 5}

    # ── Step 5: Complete ───────────────────────────────────────────────────
    async def mark_complete(self) -> dict:
        """Flip the onboarding_done flag and stamp the completion time."""
        from app.models.tenant import Tenant as TenantModel
        tenant = await self.db.get(TenantModel, self.tenant_id)
        if tenant is None:
            return {"success": False, "error": "Tenant not found"}

        settings_copy = dict(tenant.settings or {})
        settings_copy["onboarding_done"] = True
        settings_copy["onboarding_completed_at"] = datetime.now(timezone.utc).isoformat()
        wizard_state = dict(settings_copy.get("onboarding", {}))
        wizard_state["current_step"] = 6  # past last step
        wizard_state["completed_at"] = settings_copy["onboarding_completed_at"]
        settings_copy["onboarding"] = wizard_state
        tenant.settings = settings_copy

        await self.db.commit()
        return {"success": True, "completed_at": settings_copy["onboarding_completed_at"]}

    # ── Backward-compatible single-shot setup ──────────────────────────────
    async def setup(self, org_name: str, sector: str = "general", mark_done: bool = True) -> dict:
        """One-shot setup (legacy path) — seeds the basic profile and base indicators."""
        await self.set_profile({"org_name": org_name, "sector": sector})

        # Seed all base + sector indicators
        all_codes = [i["code"] for i in _BASE_INDICATORS]
        if sector in _SECTOR_EXTRA:
            all_codes += [i["code"] for i in _SECTOR_EXTRA[sector]]
        await self.select_indicators(all_codes)
        await self.set_import_choice("skip")

        if mark_done:
            await self.mark_complete()

        return {"success": True, "org_name": org_name, "sector": sector, "indicators_created": len(all_codes)}

    # ── Internal helpers ────────────────────────────────────────────────────
    async def _merge_wizard_state(self, **patch) -> None:
        """Merge new keys into tenant.settings['onboarding'] without overwriting siblings."""
        from app.models.tenant import Tenant as TenantModel
        tenant = await self.db.get(TenantModel, self.tenant_id)
        if tenant is None:
            return
        settings_copy = dict(tenant.settings or {})
        wizard_state = dict(settings_copy.get("onboarding", {}))
        for key, value in patch.items():
            if value is not None:
                wizard_state[key] = value
        # also denormalize sector at the root for backward compat
        if "profile" in patch and isinstance(patch["profile"], dict):
            settings_copy["onboarding_sector"] = patch["profile"].get("sector", "general")
        settings_copy["onboarding"] = wizard_state
        tenant.settings = settings_copy

    @staticmethod
    def _clean_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
        """Coerce types and drop None values from the incoming profile."""
        out: Dict[str, Any] = {}
        for key in ("org_name", "sector", "country_code", "siren"):
            value = profile.get(key)
            if value is not None:
                out[key] = str(value)
        for key in ("employee_count",):
            value = profile.get(key)
            if value is not None:
                try:
                    out[key] = int(value)
                except (TypeError, ValueError):
                    pass
        for key in ("revenue_eur",):
            value = profile.get(key)
            if value is not None:
                try:
                    out[key] = float(Decimal(str(value)))
                except (TypeError, ValueError):
                    pass
        if "is_listed" in profile:
            out["is_listed"] = bool(profile["is_listed"])
        return out
