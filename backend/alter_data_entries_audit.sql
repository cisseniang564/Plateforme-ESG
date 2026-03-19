-- Add audit fields to data_entries
ALTER TABLE data_entries 
ADD COLUMN IF NOT EXISTS collection_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS calculation_method TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS quality_score FLOAT,
ADD COLUMN IF NOT EXISTS quality_flags JSONB,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_entries_verification ON data_entries(verification_status);
CREATE INDEX IF NOT EXISTS idx_data_entries_creator ON data_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_data_entries_verifier ON data_entries(verified_by);

-- Update existing records to set created_by from context (can't do automatically)
COMMENT ON COLUMN data_entries.collection_method IS 'How data was collected';
COMMENT ON COLUMN data_entries.calculation_method IS 'Formula used to calculate';
COMMENT ON COLUMN data_entries.quality_score IS 'Data quality score 0-100';
