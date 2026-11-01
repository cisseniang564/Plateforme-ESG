"""
Questionnaire RSE reçu d'un client (donneur d'ordre, banque…) et ses réponses pré-remplies.

Le fichier d'origine n'est jamais conservé : on garde les questions extraites, les réponses
(pré-remplies puis validées par l'utilisateur) et un extrait du texte.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class ClientQuestionnaire(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "client_questionnaires"

    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    client_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="processing", comment="processing | ready | failed"
    )
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # [{id, section, text, answer_type, answer, status, confidence, sources:[{label,value,unit,period,verified}], note}]
    questions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    text_excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
