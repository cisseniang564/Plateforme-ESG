#!/usr/bin/env python3
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/scripts/db/seed_data.py
# Description: Script pour insérer les données initiales (seed data)
# ============================================================================

"""
Seed initial data into ESGFlow database.

This script creates:
- System permissions
- System roles (tenant_admin, esg_admin, esg_manager, etc.)
- Demo tenant with admin user
- Demo organization

Usage:
    python scripts/db/seed_data.py
"""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.role import Permission, Role, UserRole
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.security import get_password_hash


async def create_permissions():
    """Create system permissions."""
    
    print("\n📋 Creating system permissions...")
    
    permissions_data = [
        # User management
        ("user:create", "user", "create", "Create new users"),
        ("user:read", "user", "read", "View user information"),
        ("user:update", "user", "update", "Update user information"),
        ("user:delete", "user", "delete", "Delete users"),
        
        # Data management
        ("data:upload", "data", "upload", "Upload data files"),
        ("data:validate", "data", "validate", "Validate uploaded data"),
        ("data:delete", "data", "delete", "Delete data"),
        ("data:read", "data", "read", "View data"),
        
        # Scores
        ("score:calculate", "score", "calculate", "Calculate ESG scores"),
        ("score:read", "score", "read", "View ESG scores"),
        ("score:configure", "score", "configure", "Configure scoring methodology"),
        
        # Reports
        ("report:generate", "report", "generate", "Generate reports"),
        ("report:export", "report", "export", "Export reports"),
        ("report:read", "report", "read", "View reports"),
        
        # Organizations
        ("org:create", "organization", "create", "Create organizations"),
        ("org:read", "organization", "read", "View organizations"),
        ("org:update", "organization", "update", "Update organizations"),
        ("org:delete", "organization", "delete", "Delete organizations"),
        
        # Tenant management
        ("tenant:configure", "tenant", "configure", "Configure tenant settings"),
        ("tenant:read", "tenant", "read", "View tenant information"),
        
        # Audit
        ("audit:read", "audit", "read", "View audit logs"),
    ]
    
    async with AsyncSessionLocal() as db:
        created_count = 0
        
        for name, resource, action, description in permissions_data:
            # Check if permission already exists
            stmt = select(Permission).where(Permission.name == name)
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if not existing:
                permission = Permission(
                    name=name,
                    resource=resource,
                    action=action,
                    description=description,
                )
                db.add(permission)
                created_count += 1
        
        await db.commit()
        
        print(f"✅ Created {created_count} permissions")
        
        return True


async def create_system_roles():
    """Create system roles with permissions."""
    
    print("\n👥 Creating system roles...")
    
    async with AsyncSessionLocal() as db:
        # Get all permissions
        stmt = select(Permission)
        result = await db.execute(stmt)
        all_permissions = result.scalars().all()
        
        permissions_map = {p.name: p for p in all_permissions}
        
        # Define roles and their permissions
        roles_data = [
            {
                "name": "tenant_admin",
                "description": "Full access to tenant configuration and user management",
                "permissions": [
                    "user:create", "user:read", "user:update", "user:delete",
                    "tenant:configure", "tenant:read",
                    "org:create", "org:read", "org:update", "org:delete",
                    "data:upload", "data:validate", "data:delete", "data:read",
                    "score:calculate", "score:read", "score:configure",
                    "report:generate", "report:export", "report:read",
                    "audit:read",
                ],
            },
            {
                "name": "esg_admin",
                "description": "ESG data administrator - configure methodology, validate data",
                "permissions": [
                    "data:upload", "data:validate", "data:delete", "data:read",
                    "score:calculate", "score:read", "score:configure",
                    "report:generate", "report:export", "report:read",
                    "org:read",
                    "user:read",
                ],
            },
            {
                "name": "esg_manager",
                "description": "ESG manager - upload data, calculate scores, generate reports",
                "permissions": [
                    "data:upload", "data:validate", "data:read",
                    "score:calculate", "score:read",
                    "report:generate", "report:export", "report:read",
                    "org:read",
                ],
            },
            {
                "name": "data_contributor",
                "description": "Data contributor - upload and view data only",
                "permissions": [
                    "data:upload", "data:read",
                    "org:read",
                ],
            },
            {
                "name": "auditor",
                "description": "Auditor - read-only access with audit trail",
                "permissions": [
                    "data:read",
                    "score:read",
                    "report:read",
                    "audit:read",
                    "org:read",
                    "user:read",
                ],
            },
            {
                "name": "viewer",
                "description": "Viewer - read-only access to dashboards and reports",
                "permissions": [
                    "score:read",
                    "report:read",
                    "org:read",
                ],
            },
        ]
        
        created_count = 0
        
        for role_data in roles_data:
            # Check if role already exists
            stmt = select(Role).where(
                Role.name == role_data["name"],
                Role.is_system_role == True
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if not existing:
                role = Role(
                    name=role_data["name"],
                    description=role_data["description"],
                    is_system_role=True,
                    tenant_id=None,  # System role
                )
                
                # Add permissions
                for perm_name in role_data["permissions"]:
                    if perm_name in permissions_map:
                        role.permissions.append(permissions_map[perm_name])
                
                db.add(role)
                created_count += 1
        
        await db.commit()
        
        print(f"✅ Created {created_count} system roles")
        
        return True


async def create_demo_tenant():
    """Create demo tenant with admin user and organization."""
    
    print("\n🏢 Creating demo tenant...")
    
    async with AsyncSessionLocal() as db:
        # Check if demo tenant exists
        stmt = select(Tenant).where(Tenant.slug == "demo-company")
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            print("⚠️  Demo tenant already exists")
            return False
        
        # Create tenant
        tenant = Tenant(
            name="Demo Company",
            slug="demo-company",
            plan_tier="pro",
            status="active",
        )
        db.add(tenant)
        await db.flush()
        
        print(f"  ✅ Created tenant: {tenant.name} ({tenant.slug})")
        
        # Create admin user
        admin_user = User(
            tenant_id=tenant.id,
            email="admin@demo.esgflow.com",
            password_hash=get_password_hash("Admin123!"),
            first_name="Admin",
            last_name="Demo",
            job_title="ESG Manager",
            auth_provider="local",
            is_active=True,
        )
        admin_user.verify_email()
        db.add(admin_user)
        await db.flush()
        
        print(f"  ✅ Created admin user: {admin_user.email}")
        
        # Assign tenant_admin role
        stmt = select(Role).where(
            Role.name == "tenant_admin",
            Role.is_system_role == True
        )
        result = await db.execute(stmt)
        admin_role = result.scalar_one_or_none()
        
        if admin_role:
            user_role = UserRole(
                user_id=admin_user.id,
                role_id=admin_role.id,
                org_id=None,  # Tenant-wide
            )
            db.add(user_role)
            print(f"  ✅ Assigned role: tenant_admin")
        
        # Create demo organization
        org = Organization(
            tenant_id=tenant.id,
            name="Demo Group",
            org_type="group",
            sector_code="55.10",  # Hotels and similar accommodation
            country_code="FRA",
            employee_count=500,
            is_active=True,
        )
        db.add(org)
        await db.flush()
        
        print(f"  ✅ Created organization: {org.name}")
        
        # Create subsidiary
        subsidiary = Organization(
            tenant_id=tenant.id,
            parent_org_id=org.id,
            name="Demo Hotel Paris",
            org_type="site",
            sector_code="55.10",
            country_code="FRA",
            employee_count=50,
            is_active=True,
        )
        db.add(subsidiary)
        
        print(f"  ✅ Created subsidiary: {subsidiary.name}")
        
        await db.commit()
        
        print(f"\n✅ Demo tenant created successfully!")
        print(f"""
Demo Credentials:
  Email: admin@demo.esgflow.com
  Password: Admin123!
  Tenant: demo-company
        """)
        
        return True


async def main():
    """Main seed function."""
    
    print("=" * 70)
    print("ESGFlow - Database Seeding")
    print("=" * 70)
    
    try:
        # Create permissions
        await create_permissions()
        
        # Create system roles
        await create_system_roles()
        
        # Create demo tenant
        await create_demo_tenant()
        
        print("\n" + "=" * 70)
        print("✅ Database seeding completed successfully!")
        print("=" * 70)
        print("""
Next steps:
  1. Start the API: uvicorn app.main:app --reload
  2. Login with demo credentials at http://localhost:8000/docs
  3. Try the /api/v1/auth/login endpoint
        """)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())