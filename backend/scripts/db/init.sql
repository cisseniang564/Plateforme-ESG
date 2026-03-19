-- ============================================================================
-- Fichier: /home/claude/esg-saas-platform/backend/scripts/db/init.sql
-- Description: Script d'initialisation PostgreSQL pour Docker
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS esg_data;

-- Grant privileges (already handled by POSTGRES_USER in docker-compose)
-- Additional grants can be added here if needed