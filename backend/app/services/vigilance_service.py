"""
Vigilance Service — operations for the Plan de vigilance + alert channel.

Provides:
  * Plan CRUD (one per tenant per year).
  * Risk mapping CRUD + matrix aggregates for the heatmap.
  * Action CRUD + status transitions.
  * Alert intake (anonymous public + authenticated) + case_number generation.
  * Compliance audit: checks if the year's plan has all 5 mandatory components
    + active risks/actions/alerts to flag what's missing.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vigilance import (
    VigilancePlan, VigilanceRisk, VigilanceAction, VigilanceAlert,
    VigilancePlanStatus, AlertStatus, ActionStatus,
)

logger = logging.getLogger(__name__)


# ─── Compliance check ──────────────────────────────────────────────────────
def evaluate_plan_completeness(plan: VigilancePlan) -> Dict[str, Any]:
    """
    Return a score (0-100) and a checklist for the 5 mandatory components +
    coverage flags. Used for UI badges and to drive the "completion bar".
    """
    components = {
        "risk_mapping_summary": bool(plan.risk_mapping_summary and plan.risk_mapping_summary.strip()),
        "assessment_procedures": bool(plan.assessment_procedures and plan.assessment_procedures.strip()),
        "mitigation_actions": bool(plan.mitigation_actions and plan.mitigation_actions.strip()),
        "alert_mechanism": bool(plan.alert_mechanism and plan.alert_mechanism.strip()),
        "monitoring_scheme": bool(plan.monitoring_scheme and plan.monitoring_scheme.strip()),
    }
    coverage = {
        "covers_subsidiaries": plan.covers_subsidiaries,
        "covers_suppliers": plan.covers_suppliers,
        "covers_subcontractors": plan.covers_subcontractors,
    }

    component_score = sum(components.values()) / len(components) * 70  # 70% weight
    coverage_score = sum(coverage.values()) / len(coverage) * 20      # 20% weight
    stakeholder_score = (10 if plan.stakeholders_consulted else 0)    # 10% weight

    return {
        "score": round(component_score + coverage_score + stakeholder_score),
        "components": components,
        "coverage": coverage,
        "stakeholders_consulted": bool(plan.stakeholders_consulted),
    }


# ─── Service ────────────────────────────────────────────────────────────────
class VigilanceService:
    """Operations on the vigilance domain. Tenant-scoped."""

    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    # ── Plans ──────────────────────────────────────────────────────────────
    async def get_or_create_plan(self, year: int) -> VigilancePlan:
        """Return the plan for *year*, creating it if missing."""
        stmt = (
            select(VigilancePlan)
            .where(VigilancePlan.tenant_id == self.tenant_id)
            .where(VigilancePlan.year == year)
            .limit(1)
        )
        result = await self.db.execute(stmt)
        plan = result.scalar_one_or_none()
        if plan is not None:
            return plan

        plan = VigilancePlan(tenant_id=self.tenant_id, year=year, status="draft")
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan

    async def update_plan(self, year: int, patch: Dict[str, Any]) -> VigilancePlan:
        plan = await self.get_or_create_plan(year)
        for key, value in patch.items():
            if hasattr(plan, key) and key not in {"id", "tenant_id", "created_at", "updated_at"}:
                setattr(plan, key, value)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan

    async def list_plans(self) -> List[VigilancePlan]:
        stmt = (
            select(VigilancePlan)
            .where(VigilancePlan.tenant_id == self.tenant_id)
            .order_by(VigilancePlan.year.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Risks ──────────────────────────────────────────────────────────────
    async def list_risks(
        self,
        plan_id: Optional[UUID] = None,
        category: Optional[str] = None,
    ) -> List[VigilanceRisk]:
        stmt = select(VigilanceRisk).where(VigilanceRisk.tenant_id == self.tenant_id)
        if plan_id:
            stmt = stmt.where(VigilanceRisk.plan_id == plan_id)
        if category:
            stmt = stmt.where(VigilanceRisk.category == category)
        stmt = stmt.order_by(
            (VigilanceRisk.severity * VigilanceRisk.likelihood).desc(),
            VigilanceRisk.created_at.desc(),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_risk(self, data: Dict[str, Any]) -> VigilanceRisk:
        risk = VigilanceRisk(
            tenant_id=self.tenant_id,
            **{k: v for k, v in data.items() if k != "tenant_id"},
        )
        self.db.add(risk)
        await self.db.commit()
        await self.db.refresh(risk)
        return risk

    async def update_risk(self, risk_id: UUID, patch: Dict[str, Any]) -> Optional[VigilanceRisk]:
        risk = await self.db.get(VigilanceRisk, risk_id)
        if risk is None or risk.tenant_id != self.tenant_id:
            return None
        for key, value in patch.items():
            if hasattr(risk, key) and key not in {"id", "tenant_id", "created_at", "updated_at"}:
                setattr(risk, key, value)
        await self.db.commit()
        await self.db.refresh(risk)
        return risk

    async def delete_risk(self, risk_id: UUID) -> bool:
        risk = await self.db.get(VigilanceRisk, risk_id)
        if risk is None or risk.tenant_id != self.tenant_id:
            return False
        await self.db.delete(risk)
        await self.db.commit()
        return True

    async def risk_heatmap(self, plan_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Aggregate risks into a 5×5 severity × likelihood matrix."""
        risks = await self.list_risks(plan_id=plan_id)
        # Initialize 5x5 grid
        matrix = [[0 for _ in range(5)] for _ in range(5)]
        for r in risks:
            sev = max(1, min(5, r.severity))
            lik = max(1, min(5, r.likelihood))
            matrix[sev - 1][lik - 1] += 1

        by_category: Dict[str, int] = {}
        by_scope: Dict[str, int] = {}
        for r in risks:
            by_category[r.category] = by_category.get(r.category, 0) + 1
            by_scope[r.scope] = by_scope.get(r.scope, 0) + 1

        critical_count = sum(1 for r in risks if r.gross_score >= 15)
        mitigated_count = sum(
            1 for r in risks
            if r.residual_severity is not None and r.residual_likelihood is not None
        )

        return {
            "matrix": matrix,  # matrix[sev-1][lik-1] = count
            "total": len(risks),
            "by_category": by_category,
            "by_scope": by_scope,
            "critical_count": critical_count,
            "mitigated_count": mitigated_count,
        }

    # ── Actions ────────────────────────────────────────────────────────────
    async def list_actions(
        self,
        risk_id: Optional[UUID] = None,
        status: Optional[str] = None,
    ) -> List[VigilanceAction]:
        stmt = select(VigilanceAction).where(VigilanceAction.tenant_id == self.tenant_id)
        if risk_id:
            stmt = stmt.where(VigilanceAction.risk_id == risk_id)
        if status:
            stmt = stmt.where(VigilanceAction.status == status)
        stmt = stmt.order_by(VigilanceAction.deadline.asc().nullslast(), VigilanceAction.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_action(self, data: Dict[str, Any]) -> VigilanceAction:
        action = VigilanceAction(
            tenant_id=self.tenant_id,
            **{k: v for k, v in data.items() if k != "tenant_id"},
        )
        self.db.add(action)
        await self.db.commit()
        await self.db.refresh(action)
        return action

    async def update_action(self, action_id: UUID, patch: Dict[str, Any]) -> Optional[VigilanceAction]:
        action = await self.db.get(VigilanceAction, action_id)
        if action is None or action.tenant_id != self.tenant_id:
            return None
        for key, value in patch.items():
            if hasattr(action, key) and key not in {"id", "tenant_id", "created_at", "updated_at"}:
                setattr(action, key, value)
        # Auto-stamp completed_at if status moves to done
        if patch.get("status") == "done" and action.completed_at is None:
            action.completed_at = date.today()
        await self.db.commit()
        await self.db.refresh(action)
        return action

    # ── Alerts ─────────────────────────────────────────────────────────────
    async def list_alerts(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[VigilanceAlert]:
        stmt = select(VigilanceAlert).where(VigilanceAlert.tenant_id == self.tenant_id)
        if status:
            stmt = stmt.where(VigilanceAlert.status == status)
        if category:
            stmt = stmt.where(VigilanceAlert.category == category)
        stmt = stmt.order_by(VigilanceAlert.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_alert_by_case_number(self, case_number: str) -> Optional[VigilanceAlert]:
        """Public lookup — used by anonymous reporters to check their case."""
        stmt = (
            select(VigilanceAlert)
            .where(VigilanceAlert.tenant_id == self.tenant_id)
            .where(VigilanceAlert.case_number == case_number.upper())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_alert(self, data: Dict[str, Any]) -> VigilanceAlert:
        """
        Create an alert. Auto-generates a case_number like "VIG-2026-0042".

        If reporter_email is provided, marks is_anonymous=False automatically.
        """
        # Atomic-ish case number generation: count existing alerts for this
        # tenant in current year, add 1, zero-pad.
        year = datetime.now(timezone.utc).year
        count_stmt = (
            select(func.count(VigilanceAlert.id))
            .where(VigilanceAlert.tenant_id == self.tenant_id)
            .where(VigilanceAlert.case_number.like(f"VIG-{year}-%"))
        )
        result = await self.db.execute(count_stmt)
        next_n = (result.scalar() or 0) + 1
        case_number = f"VIG-{year}-{next_n:04d}"

        # is_anonymous = True if no email provided
        if data.get("reporter_email"):
            data["is_anonymous"] = False
        else:
            data["is_anonymous"] = True
            data.pop("reporter_name", None)
            data.pop("reporter_email", None)

        alert = VigilanceAlert(
            tenant_id=self.tenant_id,
            case_number=case_number,
            **{k: v for k, v in data.items() if k != "tenant_id" and k != "case_number"},
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def update_alert(self, alert_id: UUID, patch: Dict[str, Any]) -> Optional[VigilanceAlert]:
        alert = await self.db.get(VigilanceAlert, alert_id)
        if alert is None or alert.tenant_id != self.tenant_id:
            return None
        for key, value in patch.items():
            if hasattr(alert, key) and key not in {"id", "tenant_id", "case_number", "created_at", "updated_at"}:
                setattr(alert, key, value)
        if patch.get("status") in {"closed", "dismissed"} and alert.closed_at is None:
            alert.closed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    # ── Compliance summary (used by dashboard) ──────────────────────────────
    async def compliance_summary(self, year: Optional[int] = None) -> Dict[str, Any]:
        year = year or datetime.now(timezone.utc).year
        plan = await self.get_or_create_plan(year)

        heatmap = await self.risk_heatmap(plan_id=plan.id)

        # Action stats
        all_actions = await self.list_actions()
        by_status: Dict[str, int] = {}
        for a in all_actions:
            by_status[a.status] = by_status.get(a.status, 0) + 1
        overdue_actions = sum(
            1 for a in all_actions
            if a.deadline and a.deadline < date.today() and a.status not in {"done", "cancelled"}
        )

        # Alert stats
        all_alerts = await self.list_alerts()
        alerts_open = sum(1 for a in all_alerts if a.status not in {"closed", "dismissed"})
        alerts_total_year = sum(
            1 for a in all_alerts
            if a.created_at.year == year
        )

        completeness = evaluate_plan_completeness(plan)

        return {
            "year": year,
            "plan_id": str(plan.id),
            "plan_status": plan.status,
            "completeness": completeness,
            "risks": heatmap,
            "actions": {
                "total": len(all_actions),
                "by_status": by_status,
                "overdue": overdue_actions,
            },
            "alerts": {
                "total": len(all_alerts),
                "open": alerts_open,
                "year_to_date": alerts_total_year,
            },
        }
