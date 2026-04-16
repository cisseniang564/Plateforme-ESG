"""
Data Upload model - Track ESG data imports.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import String, Integer, JSON, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class DataUpload(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Track uploaded data files and their processing status.
    """
    
    __tablename__ = "data_uploads"
    
    # File info
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Original filename",
    )
    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="File size in bytes",
    )
    file_type: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="MIME type",
    )
    
    # Upload info
    uploaded_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Processing status
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        comment="Status: pending, processing, completed, failed",
    )
    
    # Data info
    total_rows: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Total rows in file",
    )
    valid_rows: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Number of valid rows imported",
    )
    invalid_rows: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Number of invalid rows skipped",
    )
    
    # Metadata - renommé en file_metadata pour éviter conflit avec SQLAlchemy
    data_preview: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="Preview of first 10 rows",
    )
    validation_errors: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="Validation errors by row",
    )
    file_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional metadata (columns, date range, etc.)",
    )
    
    # Error tracking
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Error message if processing failed",
    )
    
    # Processing timestamps
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    uploader: Mapped[Optional["User"]] = relationship("User", foreign_keys=[uploaded_by])
    
    def __repr__(self) -> str:
        return f"<DataUpload(id={self.id}, filename='{self.filename}', status='{self.status}')>"
    
    @property
    def is_processing(self) -> bool:
        return self.status == "processing"
    
    @property
    def is_completed(self) -> bool:
        return self.status == "completed"
    
    @property
    def is_failed(self) -> bool:
        return self.status == "failed"
    
    @property
    def success_rate(self) -> Optional[float]:
        """Calculate success rate of imported rows."""
        if self.total_rows and self.total_rows > 0:
            return (self.valid_rows or 0) / self.total_rows * 100
        return None
