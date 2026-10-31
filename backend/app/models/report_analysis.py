"""
Analyse d'un rapport existant (RSE, DPEF, CSRD…) par l'IA Gaïa.

On garde le résultat structuré et un extrait du texte (pour répondre aux questions
de l'utilisateur sans relire le fichier). Le fichier d'origine n'est jamais stocké.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class ReportAnalysis(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "report_analyses"

    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="processing", comment="processing | done | failed"
    )
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    text_excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
