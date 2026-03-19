-- Table for MANUAL data entry (complements DataUpload for file imports)
CREATE TABLE IF NOT EXISTS data_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'annual',
    
    -- Categorization
    pillar VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    metric_name VARCHAR(200) NOT NULL,
    
    -- Value (flexible: numeric OR text)
    value_numeric FLOAT,
    value_text TEXT,
    unit VARCHAR(50),
    
    -- Metadata
    data_source VARCHAR(200),
    verification_status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    attachments JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    CONSTRAINT check_value CHECK (value_numeric IS NOT NULL OR value_text IS NOT NULL)
);

CREATE INDEX idx_data_entries_tenant ON data_entries(tenant_id);
CREATE INDEX idx_data_entries_org ON data_entries(organization_id);
CREATE INDEX idx_data_entries_period ON data_entries(period_start, period_end);
CREATE INDEX idx_data_entries_pillar ON data_entries(pillar);
CREATE INDEX idx_data_entries_category ON data_entries(category);

-- Add comment
COMMENT ON TABLE data_entries IS 'Manual data entry records (complements data_uploads for file imports)';
