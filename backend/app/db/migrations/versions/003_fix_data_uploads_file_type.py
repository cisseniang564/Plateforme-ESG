"""Fix data_uploads.file_type VARCHAR(50) → VARCHAR(255)

The MIME type for .xlsx files is
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' (70 chars),
which overflows the previous VARCHAR(50) constraint.

Revision ID: 003_fix_data_uploads_file_type
Revises: 002_billing_subscription
Create Date: 2026-03-26
"""
from alembic import op
import sqlalchemy as sa

revision = "003_fix_data_uploads_file_type"
down_revision = "002_billing_subscription"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Élargir file_type pour accepter les MIME types longs (xlsx = 70 chars)
    op.alter_column(
        "data_uploads",
        "file_type",
        existing_type=sa.String(50),
        type_=sa.String(255),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Tronquer les valeurs existantes avant de rétrécir la colonne
    op.execute(
        "UPDATE data_uploads SET file_type = LEFT(file_type, 50) WHERE LENGTH(file_type) > 50"
    )
    op.alter_column(
        "data_uploads",
        "file_type",
        existing_type=sa.String(255),
        type_=sa.String(50),
        existing_nullable=False,
    )
