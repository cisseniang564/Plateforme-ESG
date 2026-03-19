# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/db/migrations/versions/001_initial_schema.py
# Description: Migration initiale - Création de toutes les tables de base
# ============================================================================

"""Initial schema - tenants, users, organizations, roles

Revision ID: 001
Revises: 
Create Date: 2025-02-11 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema."""
    
    # ========================================================================
    # Create PostgreSQL functions for Row-Level Security
    # ========================================================================
    
    # Function to set tenant context
    op.execute("""
        CREATE OR REPLACE FUNCTION set_tenant_context(
            p_tenant_id uuid,
            p_user_id uuid
        ) RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
            PERFORM set_config('app.current_user_id', p_user_id::text, false);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)
    
    # Function to prevent audit log modification
    op.execute("""
        CREATE OR REPLACE FUNCTION raise_exception_immutable()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'This table is immutable. No updates or deletes allowed.';
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # ========================================================================
    # Table: tenants
    # ========================================================================
    
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('plan_tier', sa.String(50), nullable=False, server_default='starter'),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('stripe_customer_id', sa.String(100), nullable=True),
        sa.Column('settings', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('feature_flags', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('max_users', sa.Integer, nullable=False, server_default='10'),
        sa.Column('max_orgs', sa.Integer, nullable=False, server_default='5'),
        sa.Column('max_monthly_api_calls', sa.Integer, nullable=False, server_default='10000'),
        sa.Column('data_retention_months', sa.Integer, nullable=False, server_default='24'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_index('ix_tenants_slug', 'tenants', ['slug'])
    op.create_index('ix_tenants_status', 'tenants', ['status'])
    
    # ========================================================================
    # Table: organizations
    # ========================================================================
    
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parent_org_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('legal_name', sa.String(255), nullable=True),
        sa.Column('org_type', sa.String(50), nullable=False),
        sa.Column('siren', sa.String(20), nullable=True),
        sa.Column('lei_code', sa.String(20), nullable=True),
        sa.Column('vat_number', sa.String(30), nullable=True),
        sa.Column('sector_code', sa.String(20), nullable=True),
        sa.Column('country_code', sa.String(3), nullable=True),
        sa.Column('employee_count', sa.Integer, nullable=True),
        sa.Column('revenue_eur', sa.Numeric(15, 2), nullable=True),
        sa.Column('surface_m2', sa.Integer, nullable=True),
        sa.Column('consolidation_method', sa.String(50), nullable=True),
        sa.Column('ownership_percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_org_id'], ['organizations.id'], ondelete='SET NULL'),
    )
    
    op.create_index('ix_organizations_tenant', 'organizations', ['tenant_id'])
    op.create_index('ix_organizations_parent', 'organizations', ['parent_org_id'])
    op.create_index('ix_organizations_siren', 'organizations', ['siren'])
    op.create_index('ix_organizations_sector', 'organizations', ['sector_code'])
    
    # Enable RLS on organizations
    op.execute("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY")
    
    # Create RLS policy for organizations
    op.execute("""
        CREATE POLICY tenant_isolation ON organizations
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    """)
    
    # ========================================================================
    # Table: users
    # ========================================================================
    
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('auth_provider', sa.String(50), nullable=False, server_default='local'),
        sa.Column('auth_provider_id', sa.String(255), nullable=True),
        sa.Column('first_name', sa.String(100), nullable=True),
        sa.Column('last_name', sa.String(100), nullable=True),
        sa.Column('job_title', sa.String(150), nullable=True),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('locale', sa.String(10), nullable=False, server_default='en'),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'),
        sa.Column('notification_preferences', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    )
    
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_tenant', 'users', ['tenant_id'])
    
    # Enable RLS on users
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    
    # Create RLS policy for users
    op.execute("""
        CREATE POLICY tenant_isolation ON users
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    """)
    
    # ========================================================================
    # Table: permissions
    # ========================================================================
    
    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('resource', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('description', sa.String, nullable=True),
    )
    
    op.create_index('ix_permissions_name', 'permissions', ['name'])
    op.create_index('ix_permissions_resource', 'permissions', ['resource'])
    
    # ========================================================================
    # Table: roles
    # ========================================================================
    
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String, nullable=True),
        sa.Column('is_system_role', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    )
    
    op.create_index('ix_roles_tenant', 'roles', ['tenant_id'])
    
    # ========================================================================
    # Table: role_permissions (many-to-many)
    # ========================================================================
    
    op.create_table(
        'role_permissions',
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
    )
    
    # ========================================================================
    # Table: user_roles
    # ========================================================================
    
    op.create_table(
        'user_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ondelete='SET NULL'),
    )
    
    op.create_index('ix_user_roles_user', 'user_roles', ['user_id'])
    op.create_index('ix_user_roles_role', 'user_roles', ['role_id'])
    op.create_index('ix_user_roles_org', 'user_roles', ['org_id'])
    
    # ========================================================================
    # Table: user_org_access
    # ========================================================================
    
    op.create_table(
        'user_org_access',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('access_level', sa.String(20), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    op.create_index('ix_user_org_access_user', 'user_org_access', ['user_id'])
    op.create_index('ix_user_org_access_org', 'user_org_access', ['org_id'])


def downgrade() -> None:
    """Downgrade database schema."""
    
    # Drop tables in reverse order
    op.drop_table('user_org_access')
    op.drop_table('user_roles')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
    op.drop_table('users')
    op.drop_table('organizations')
    op.drop_table('tenants')
    
    # Drop functions
    op.execute("DROP FUNCTION IF EXISTS raise_exception_immutable()")
    op.execute("DROP FUNCTION IF EXISTS set_tenant_context(uuid, uuid)")