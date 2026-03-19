-- Migration 002 : Workflow de validation des données ESG
-- Appliquer avec : docker exec esgflow-postgres psql -U esgflow_user -d esgflow_dev -f /migration_002_apply.sql
-- OU via psql directement quand le container tourne

ALTER TABLE indicator_data
  ADD COLUMN IF NOT EXISTS validation_status  VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewer_notes     TEXT;

CREATE INDEX IF NOT EXISTS ix_indicator_data_validation_status
  ON indicator_data (tenant_id, validation_status);

SELECT 'Migration 002 appliquée avec succès ✅' AS status;
