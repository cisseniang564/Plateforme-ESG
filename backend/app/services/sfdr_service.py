"""
SFDR Service — CRUD operations for the SFDR disclosure module.

Replaces the previous localStorage-only persistence by providing tenant-scoped
DB-backed operations for:
  * SFDRReport — one per (tenant, fund_id, year)
  * SFDRPAIValue — 18 PAI indicators per report

Aligned with:
  * Reglement (UE) 2019/2088 (SFDR)
  * Reglement Delegue (UE) 2022/1288 (RTS Annexe I — table 1 — 18 PAIs)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sfdr import SFDRReport, SFDRPAIValue, SFDRArticle

logger = logging.getLogger(__name__)


# ─── PAI catalog (RTS Annex I — table 1) ────────────────────────────────────
# 14 mandatory + 4 additional environmental/social = 18 indicators.
# Kept here as the canonical reference (frontend mirrors it for UI labels).
PAI_CATALOG: List[Dict[str, Any]] = [
    {"metric_key": "pai_1_ges_scope123", "pai_number": 1,
     "label": "Émissions de GES (Scope 1, 2, 3)", "unit": "tCO2e", "mandatory": True},
    {"metric_key": "pai_2_carbon_footprint", "pai_number": 2,
     "label": "Empreinte carbone", "unit": "tCO2e/M€", "mandatory": True},
    {"metric_key": "pai_3_ges_intensity", "pai_number": 3,
     "label": "Intensité GES des sociétés investies", "unit": "tCO2e/M€ CA", "mandatory": True},
    {"metric_key": "pai_4_fossil_exposure", "pai_number": 4,
     "label": "Exposition au secteur des combustibles fossiles", "unit": "%", "mandatory": True},
    {"metric_key": "pai_5_non_renewable", "pai_number": 5,
     "label": "Part de consommation et production d'énergie non renouvelable", "unit": "%", "mandatory": True},
    {"metric_key": "pai_6_energy_intensity", "pai_number": 6,
     "label": "Intensité énergétique par secteur à fort impact climat", "unit": "GWh/M€", "mandatory": True},
    {"metric_key": "pai_7_biodiversity", "pai_number": 7,
     "label": "Activités ayant un impact négatif sur la biodiversité", "unit": "%", "mandatory": True},
    {"metric_key": "pai_8_water_emissions", "pai_number": 8,
     "label": "Émissions dans l'eau", "unit": "t/M€", "mandatory": True},
    {"metric_key": "pai_9_hazardous_waste", "pai_number": 9,
     "label": "Ratio de déchets dangereux", "unit": "t/M€", "mandatory": True},
    {"metric_key": "pai_10_un_global_compact", "pai_number": 10,
     "label": "Violations du Pacte mondial des Nations Unies", "unit": "%", "mandatory": True},
    {"metric_key": "pai_11_compliance_mechanism", "pai_number": 11,
     "label": "Absence de mécanismes de conformité au Pacte mondial", "unit": "%", "mandatory": True},
    {"metric_key": "pai_12_gender_pay_gap", "pai_number": 12,
     "label": "Écart de rémunération non corrigé entre les sexes", "unit": "%", "mandatory": True},
    {"metric_key": "pai_13_board_diversity", "pai_number": 13,
     "label": "Diversité de genre au conseil d'administration", "unit": "%", "mandatory": True},
    {"metric_key": "pai_14_controversial_weapons", "pai_number": 14,
     "label": "Exposition aux armes controversées", "unit": "%", "mandatory": True},
    # Additional environmental
    {"metric_key": "pai_15_ghg_sovereign", "pai_number": 15,
     "label": "Intensité de GES des États souverains", "unit": "tCO2e/M€ PIB", "mandatory": False},
    {"metric_key": "pai_16_social_violations_sovereign", "pai_number": 16,
     "label": "Pays investis enfreignant des dispositions sociales", "unit": "%", "mandatory": False},
    # Additional social
    {"metric_key": "pai_17_accidents", "pai_number": 17,
     "label": "Taux d'accidents du travail", "unit": "/M heures", "mandatory": False},
    {"metric_key": "pai_18_human_rights_policy", "pai_number": 18,
     "label": "Absence de politique des droits humains", "unit": "%", "mandatory": False},
]


# ─── Default policy templates per article ──────────────────────────────────
POLICY_TEMPLATES: Dict[str, str] = {
    "article6": (
        "Ce produit financier ne promeut pas de caractéristiques environnementales ou "
        "sociales et n'a pas d'objectif d'investissement durable. Les risques de durabilité "
        "sont toutefois intégrés dans le processus d'investissement conformément à l'article 6 "
        "du règlement SFDR."
    ),
    "article8": (
        "Ce produit financier promeut des caractéristiques environnementales et sociales "
        "conformément à l'article 8 du règlement SFDR (UE 2019/2088). La stratégie intègre "
        "des critères ESG dans la sélection des investissements et applique une politique "
        "d'engagement actionnarial. Les principales incidences négatives (PAI) en matière de "
        "durabilité sont prises en compte selon les indicateurs définis par le RTS."
    ),
    "article9": (
        "Ce produit financier a pour objectif l'investissement durable au sens de l'article 9 "
        "du règlement SFDR (UE 2019/2088). Tous les investissements contribuent à un objectif "
        "environnemental ou social mesurable, sans causer de préjudice important à d'autres "
        "objectifs (principe DNSH). Les pratiques de bonne gouvernance des sociétés investies "
        "sont systématiquement évaluées."
    ),
}


class SFDRService:
    """Tenant-scoped operations for SFDR reports + PAI values."""

    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    # ── Reports ────────────────────────────────────────────────────────────
    async def list_reports(self, year: Optional[int] = None) -> List[SFDRReport]:
        stmt = (
            select(SFDRReport)
            .where(SFDRReport.tenant_id == self.tenant_id)
            .order_by(SFDRReport.year.desc(), SFDRReport.fund_name)
        )
        if year is not None:
            stmt = stmt.where(SFDRReport.year == year)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_report(self, report_id: UUID) -> Optional[SFDRReport]:
        stmt = (
            select(SFDRReport)
            .where(SFDRReport.tenant_id == self.tenant_id)
            .where(SFDRReport.id == report_id)
            .options(selectinload(SFDRReport.pai_values))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_report(
        self, year: int, fund_id: str, fund_name: str,
        article: str = "article8",
    ) -> SFDRReport:
        """Idempotent fetch-or-create per (tenant, fund_id, year)."""
        stmt = (
            select(SFDRReport)
            .where(SFDRReport.tenant_id == self.tenant_id)
            .where(SFDRReport.fund_id == fund_id)
            .where(SFDRReport.year == year)
            .options(selectinload(SFDRReport.pai_values))
            .limit(1)
        )
        result = await self.db.execute(stmt)
        report = result.scalar_one_or_none()
        if report is not None:
            return report

        # Validate article
        try:
            SFDRArticle(article)
        except ValueError:
            article = "article8"

        report = SFDRReport(
            tenant_id=self.tenant_id,
            year=year,
            fund_id=fund_id,
            fund_name=fund_name,
            article=article,
            policy_text=POLICY_TEMPLATES.get(article),
            policy_edited=False,
            status="draft",
        )
        self.db.add(report)
        await self.db.flush()
        return report

    async def update_report(
        self, report_id: UUID, patch: Dict[str, Any],
    ) -> Optional[SFDRReport]:
        report = await self.get_report(report_id)
        if report is None:
            return None

        allowed = {
            "fund_name", "article", "policy_text", "policy_edited",
            "status", "notes",
        }
        for key, value in patch.items():
            if key not in allowed or value is None:
                continue
            if key == "article":
                try:
                    SFDRArticle(value)
                except ValueError:
                    continue
                # If article changed and policy not yet edited, refresh template
                if value != report.article and not report.policy_edited:
                    report.policy_text = POLICY_TEMPLATES.get(value)
            setattr(report, key, value)

        if patch.get("status") == "published" and report.published_at is None:
            report.published_at = datetime.now(timezone.utc)

        report.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return report

    async def delete_report(self, report_id: UUID) -> bool:
        report = await self.get_report(report_id)
        if report is None:
            return False
        await self.db.delete(report)
        await self.db.flush()
        return True

    # ── PAI values ─────────────────────────────────────────────────────────
    async def list_pai_values(self, report_id: UUID) -> List[SFDRPAIValue]:
        stmt = (
            select(SFDRPAIValue)
            .where(SFDRPAIValue.tenant_id == self.tenant_id)
            .where(SFDRPAIValue.report_id == report_id)
            .order_by(SFDRPAIValue.pai_number)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def upsert_pai_value(
        self, report_id: UUID, metric_key: str,
        value: Optional[float] = None, unit: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> SFDRPAIValue:
        """Insert or update a single PAI indicator value."""
        # Resolve canonical info from the catalog
        catalog_entry = next(
            (c for c in PAI_CATALOG if c["metric_key"] == metric_key), None
        )
        if catalog_entry is None:
            raise ValueError(f"Unknown PAI metric_key: {metric_key}")

        stmt = (
            select(SFDRPAIValue)
            .where(SFDRPAIValue.report_id == report_id)
            .where(SFDRPAIValue.metric_key == metric_key)
            .limit(1)
        )
        result = await self.db.execute(stmt)
        pai = result.scalar_one_or_none()

        if pai is None:
            pai = SFDRPAIValue(
                tenant_id=self.tenant_id,
                report_id=report_id,
                metric_key=metric_key,
                pai_number=catalog_entry["pai_number"],
                value=value,
                unit=unit or catalog_entry.get("unit"),
                notes=notes,
            )
            self.db.add(pai)
        else:
            if value is not None:
                pai.value = value
            if unit is not None:
                pai.unit = unit
            if notes is not None:
                pai.notes = notes
            pai.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        return pai

    async def bulk_upsert_pai(
        self, report_id: UUID, entries: List[Dict[str, Any]],
    ) -> List[SFDRPAIValue]:
        """Bulk update PAI values for a report. Idempotent."""
        out: List[SFDRPAIValue] = []
        for entry in entries:
            mk = entry.get("metric_key")
            if not mk:
                continue
            try:
                pai = await self.upsert_pai_value(
                    report_id=report_id,
                    metric_key=mk,
                    value=entry.get("value"),
                    unit=entry.get("unit"),
                    notes=entry.get("notes"),
                )
                out.append(pai)
            except ValueError as exc:
                logger.warning("Skipping unknown PAI: %s", exc)
        return out

    # ── Summary ────────────────────────────────────────────────────────────
    async def get_summary(self, year: int) -> Dict[str, Any]:
        """Dashboard summary for a given year."""
        reports = await self.list_reports(year=year)
        total = len(reports)
        by_article: Dict[str, int] = {"article6": 0, "article8": 0, "article9": 0}
        published = 0
        coverage_total = 0
        coverage_filled = 0

        for r in reports:
            by_article[r.article] = by_article.get(r.article, 0) + 1
            if r.status == "published":
                published += 1
            pai_values = await self.list_pai_values(r.id)
            mandatory_keys = [c["metric_key"] for c in PAI_CATALOG if c["mandatory"]]
            filled = sum(
                1 for p in pai_values
                if p.metric_key in mandatory_keys and p.value is not None
            )
            coverage_total += len(mandatory_keys)
            coverage_filled += filled

        coverage_pct = (
            round((coverage_filled / coverage_total) * 100) if coverage_total else 0
        )
        return {
            "year": year,
            "total_reports": total,
            "by_article": by_article,
            "published": published,
            "draft": total - published,
            "pai_coverage_pct": coverage_pct,
        }
