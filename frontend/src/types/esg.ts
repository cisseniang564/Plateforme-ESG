// ============================================================================
// Types ESG - Indicateurs, Scores, Méthodologies
// ============================================================================

export type ESGPillar = 'environmental' | 'social' | 'governance';

export interface Indicator {
  id: string;
  code: string;
  name: string;
  pillar: ESGPillar;
  unit: string;
  description?: string;
  weight?: number;
  methodology_id: string;
}

export interface Score {
  id: string;
  indicator_id: string;
  organization_id: string;
  value: number;
  period: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  status: 'draft' | 'validated' | 'published';
  created_at: string;
}

export interface Methodology {
  id: string;
  name: string;
  version: string;
  description?: string;
  pillars: ESGPillar[];
  is_active: boolean;
}

export interface DataUpload {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  rows_processed: number;
  errors_count: number;
  uploaded_at: string;
}

export interface Report {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'regulatory';
  period: string;
  status: 'draft' | 'final';
  created_at: string;
  file_url?: string;
}
