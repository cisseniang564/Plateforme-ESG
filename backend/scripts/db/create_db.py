#!/usr/bin/env python3
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/scripts/db/create_db.py
# Description: Script pour créer la base de données PostgreSQL
# ============================================================================

"""
Create PostgreSQL database for ESGFlow.

This script creates the database and the database user if they don't exist.
Run this before running Alembic migrations.

Usage:
    python scripts/db/create_db.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from app.config import settings


def create_database():
    """Create database and user if they don't exist."""
    
    print("=" * 70)
    print("ESGFlow - Database Creation")
    print("=" * 70)
    
    # Connect to PostgreSQL server (default postgres database)
    try:
        print(f"\n📡 Connecting to PostgreSQL server at {settings.DATABASE_HOST}:{settings.DATABASE_PORT}...")
        
        conn = psycopg2.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            user="postgres",  # Default superuser
            password=input("Enter PostgreSQL superuser (postgres) password: "),
            database="postgres",
        )
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✅ Connected successfully!")
        
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        print("\nMake sure:")
        print("  1. PostgreSQL is running")
        print("  2. You have the correct credentials")
        print("  3. PostgreSQL is accessible at the specified host/port")
        sys.exit(1)
    
    # Create user if not exists
    try:
        print(f"\n👤 Creating user '{settings.DATABASE_USER}'...")
        
        cursor.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM pg_catalog.pg_roles WHERE rolname = '{settings.DATABASE_USER}'
                ) THEN
                    CREATE USER {settings.DATABASE_USER} WITH PASSWORD '{settings.DATABASE_PASSWORD}';
                END IF;
            END
            $$;
            """
        )
        
        print(f"✅ User '{settings.DATABASE_USER}' created or already exists")
        
    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)
    
    # Create database if not exists
    try:
        print(f"\n💾 Creating database '{settings.DATABASE_NAME}'...")
        
        # Check if database exists
        cursor.execute(
            f"""
            SELECT 1 FROM pg_database WHERE datname = '{settings.DATABASE_NAME}'
            """
        )
        
        exists = cursor.fetchone()
        
        if exists:
            print(f"⚠️  Database '{settings.DATABASE_NAME}' already exists")
        else:
            cursor.execute(f"CREATE DATABASE {settings.DATABASE_NAME} OWNER {settings.DATABASE_USER}")
            print(f"✅ Database '{settings.DATABASE_NAME}' created successfully")
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)
    
    # Grant privileges
    try:
        print(f"\n🔐 Granting privileges to '{settings.DATABASE_USER}'...")
        
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {settings.DATABASE_NAME} TO {settings.DATABASE_USER}")
        
        print(f"✅ Privileges granted")
        
    except Exception as e:
        print(f"⚠️  Warning: Could not grant privileges: {e}")
    
    # Close connection
    cursor.close()
    conn.close()
    
    # Connect to the new database and enable extensions
    try:
        print(f"\n🔌 Enabling PostgreSQL extensions...")
        
        conn = psycopg2.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD,
            database=settings.DATABASE_NAME,
        )
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Enable uuid-ossp extension for UUID generation
        cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
        print("  ✅ uuid-ossp extension enabled")
        
        # Enable pgcrypto for additional crypto functions
        cursor.execute("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"")
        print("  ✅ pgcrypto extension enabled")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"⚠️  Warning: Could not enable extensions: {e}")
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ Database setup completed successfully!")
    print("=" * 70)
    print(f"""
Database Configuration:
  Host: {settings.DATABASE_HOST}
  Port: {settings.DATABASE_PORT}
  Database: {settings.DATABASE_NAME}
  User: {settings.DATABASE_USER}
  
Next steps:
  1. Run migrations: alembic upgrade head
  2. Seed initial data: python scripts/db/seed_data.py
  3. Start the API: uvicorn app.main:app --reload
    """)


if __name__ == "__main__":
    create_database()