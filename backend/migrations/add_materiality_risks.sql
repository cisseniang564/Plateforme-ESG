-- Migration: Add Materiality Issues and ESG Risks tables

-- Table: materiality_issues
CREATE TABLE IF NOT EXISTS materiality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Double Materiality Scores
    financial_impact FLOAT DEFAULT 50.0 CHECK (financial_impact >= 0 AND financial_impact <= 100),
    esg_impact FLOAT DEFAULT 50.0 CHECK (esg_impact >= 0 AND esg_impact <= 100),
    
    -- Metadata
    stakeholders TEXT,
    data_sources TEXT,
    is_material BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20),
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: esg_risks
CREATE TABLE IF NOT EXISTS esg_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    materiality_issue_id UUID REFERENCES materiality_issues(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Risk Assessment (1-5)
    probability INTEGER DEFAULT 3 CHECK (probability >= 1 AND probability <= 5),
    impact INTEGER DEFAULT 3 CHECK (impact >= 1 AND impact <= 5),
    risk_score INTEGER,
    
    -- Mitigation
    mitigation_plan TEXT,
    mitigation_status VARCHAR(50),
    responsible_person VARCHAR(255),
    target_date TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    severity VARCHAR(20),
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_materiality_tenant ON materiality_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materiality_category ON materiality_issues(category);
CREATE INDEX IF NOT EXISTS idx_materiality_material ON materiality_issues(is_material);

CREATE INDEX IF NOT EXISTS idx_risks_tenant ON esg_risks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risks_category ON esg_risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON esg_risks(severity);
CREATE INDEX IF NOT EXISTS idx_risks_status ON esg_risks(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_materiality_issues_updated_at BEFORE UPDATE ON materiality_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_esg_risks_updated_at BEFORE UPDATE ON esg_risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO materiality_issues (tenant_id, name, description, category, financial_impact, esg_impact, is_material, priority, stakeholders)
SELECT 
    t.id,
    'Émissions de CO2',
    'Réduction des émissions de gaz à effet de serre scope 1, 2 et 3',
    'environmental',
    75.0,
    85.0,
    true,
    'high',
    'Investisseurs, Régulateurs, ONG environnementales'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM materiality_issues WHERE name = 'Émissions de CO2')
LIMIT 1;

INSERT INTO materiality_issues (tenant_id, name, description, category, financial_impact, esg_impact, is_material, priority, stakeholders)
SELECT 
    t.id,
    'Diversité et Inclusion',
    'Promotion de la diversité et de l''égalité des chances',
    'social',
    60.0,
    70.0,
    true,
    'high',
    'Employés, Syndicats, Société civile'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM materiality_issues WHERE name = 'Diversité et Inclusion')
LIMIT 1;

INSERT INTO materiality_issues (tenant_id, name, description, category, financial_impact, esg_impact, is_material, priority, stakeholders)
SELECT 
    t.id,
    'Éthique et Conformité',
    'Respect des normes éthiques et réglementations',
    'governance',
    80.0,
    75.0,
    true,
    'high',
    'Actionnaires, Autorités de régulation, Clients'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM materiality_issues WHERE name = 'Éthique et Conformité')
LIMIT 1;

INSERT INTO esg_risks (tenant_id, title, description, category, probability, impact, risk_score, severity, status, mitigation_plan, responsible_person)
SELECT 
    t.id,
    'Risque de pénurie d''eau',
    'Insuffisance des ressources en eau dans les zones opérationnelles clés',
    'environmental',
    4,
    5,
    20,
    'critical',
    'active',
    'Mise en place de systèmes de recyclage et réduction de 30% de la consommation d''ici 2025',
    'Directeur RSE'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM esg_risks WHERE title = 'Risque de pénurie d''eau')
LIMIT 1;

INSERT INTO esg_risks (tenant_id, title, description, category, probability, impact, risk_score, severity, status, mitigation_plan, responsible_person)
SELECT 
    t.id,
    'Turnover élevé des employés',
    'Risque de perte de talents et savoir-faire',
    'social',
    3,
    4,
    12,
    'high',
    'active',
    'Programme de rétention: augmentation salaires +5%, formation continue, télétravail',
    'DRH'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM esg_risks WHERE title = 'Turnover élevé des employés')
LIMIT 1;

INSERT INTO esg_risks (tenant_id, title, description, category, probability, impact, risk_score, severity, status, mitigation_plan, responsible_person)
SELECT 
    t.id,
    'Non-conformité CSRD',
    'Risque de non-conformité avec la directive européenne',
    'governance',
    2,
    5,
    10,
    'medium',
    'mitigated',
    'Audit externe, formation équipe, mise en place plateforme ESGFlow',
    'CFO'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM esg_risks WHERE title = 'Non-conformité CSRD')
LIMIT 1;
