"""
Materiality and Risk models for ESG assessment.
"""
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, Text, ForeignKey, DateTime, JSON
from uuid import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class MaterialityIssue(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Materiality Issue - Double Materiality Assessment (CSRD compliant).
    """
    __tablename__ = "materiality_issues"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Double Materiality Scores (0-100)
    financial_impact: Mapped[float] = mapped_column(Float, default=50.0)
    esg_impact: Mapped[float] = mapped_column(Float, default=50.0)
    
    # Metadata
    stakeholders: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_sources: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_material: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # CSRD IRO classification (ESRS 1 §43): qualifies each material issue as an
    # Impact / Risk / Opportunity, optionally bound to an ESRS topic (E1…G1).
    iro_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)            # 'impact' | 'risk' | 'opportunity'
    iro_actual_or_potential: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 'actual' | 'potential' (impacts only)
    esrs_topic: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)          # 'E1'..'E5' | 'S1'..'S4' | 'G1'

    # Traçabilité de l'évaluation : la méthode et les hypothèses doivent pouvoir être expliquées
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)                 # justification des deux notes
    time_horizon: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)        # 'short' | 'medium' | 'long'
    value_chain: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)         # 'own' | 'upstream' | 'downstream'

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="materiality_issues")
    risks: Mapped[list["ESGRisk"]] = relationship(
        "ESGRisk", back_populates="materiality_issue", cascade="all, delete-orphan"
    )


class ESGRisk(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    ESG Risk - Risk register with probability and impact assessment.
    """
    __tablename__ = "esg_risks"

    materiality_issue_id: Mapped[Optional[UUID]] = mapped_column(
    ForeignKey("materiality_issues.id"), nullable=True
)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Risk Assessment (1-5)
    probability: Mapped[int] = mapped_column(Integer, default=3)
    impact: Mapped[int] = mapped_column(Integer, default=3)
    risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Mitigation
    mitigation_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mitigation_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    responsible_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="active")
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="esg_risks")
    materiality_issue: Mapped[Optional["MaterialityIssue"]] = relationship(
        "MaterialityIssue", back_populates="risks"
    )


class MaterialityValidation(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Validation datée de la matrice par la direction : copie figée des enjeux + empreinte.
    Journal en ajout seul : aucune route ne modifie ni ne supprime une validation.
    """
    __tablename__ = "materiality_validations"

    version: Mapped[int] = mapped_column(Integer, nullable=False)                       # n-ième validation du client
    validated_by_user_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    validator_name: Mapped[str] = mapped_column(String(200), nullable=False)
    validator_role: Mapped[str] = mapped_column(String(200), nullable=False)
    validated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    threshold: Mapped[float] = mapped_column(Float, nullable=False, default=60.0)
    issue_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    material_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    snapshot: Mapped[list] = mapped_column(JSON, nullable=False)
    snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False)
