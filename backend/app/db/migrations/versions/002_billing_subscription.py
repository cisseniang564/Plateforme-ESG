"""Add Stripe billing columns to tenants table

Revision ID: 002
Revises: 001
Create Date: 2026-03-22 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Stripe subscription tracking columns to tenants."""
    op.add_column('tenants', sa.Column(
        'stripe_subscription_id', sa.String(100), nullable=True
    ))
    op.add_column('tenants', sa.Column(
        'stripe_subscription_status', sa.String(50), nullable=True
    ))
    op.add_column('tenants', sa.Column(
        'stripe_current_period_end',
        sa.TIMESTAMP(timezone=True),
        nullable=True
    ))
    op.add_column('tenants', sa.Column(
        'trial_ends_at',
        sa.TIMESTAMP(timezone=True),
        nullable=True
    ))


def downgrade() -> None:
    """Remove Stripe subscription columns from tenants."""
    op.drop_column('tenants', 'trial_ends_at')
    op.drop_column('tenants', 'stripe_current_period_end')
    op.drop_column('tenants', 'stripe_subscription_status')
    op.drop_column('tenants', 'stripe_subscription_id')
