-- Fix: data_uploads.file_type VARCHAR(50) → VARCHAR(255)
-- Raison : le MIME type .xlsx fait 70 caractères (dépasse 50)
-- Application : docker compose exec postgres psql -U esgflow_user -d esgflow_dev -f /tmp/fix.sql

ALTER TABLE data_uploads
    ALTER COLUMN file_type TYPE VARCHAR(255);

-- Vérification
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'data_uploads' AND column_name = 'file_type';
