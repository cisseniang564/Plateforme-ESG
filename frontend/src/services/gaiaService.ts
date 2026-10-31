import api from '@/services/api';

export interface GaiaIndicator { name: string; value?: string | null; unit?: string | null; year?: string | null; page?: number | null }
export interface GaiaEsrs { standard: string; label: string; coverage: 'complete' | 'partial' | 'absent'; score: number; evidence: string }
export interface GaiaRecommendation { priority: 'haute' | 'moyenne' | 'basse'; action: string }
export interface GaiaFlag { claim: string; why: string; page?: number | null }

export interface GaiaResult {
  company?: string | null;
  report_title?: string | null;
  reporting_year?: string | null;
  summary: string;
  maturity_score: number;
  maturity_comment: string;
  indicators: GaiaIndicator[];
  esrs_coverage: GaiaEsrs[];
  strengths: string[];
  gaps: string[];
  recommendations: GaiaRecommendation[];
  flags: GaiaFlag[];
}

export interface GaiaAnalysisSummary {
  id: string;
  filename: string;
  status: 'processing' | 'done' | 'failed';
  page_count: number | null;
  created_at: string | null;
  company?: string | null;
  reporting_year?: string | null;
  maturity_score?: number | null;
}

export interface GaiaAnalysisDetail extends GaiaAnalysisSummary {
  error?: string | null;
  result?: GaiaResult | null;
  model?: string | null;
}

/** Message lisible à partir d'une erreur d'API. */
export function gaiaErrorMessage(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export async function listAnalyses(): Promise<GaiaAnalysisSummary[]> {
  const r = await api.get('/gaia/analyses');
  return r.data.items ?? [];
}

export async function getAnalysis(id: string): Promise<GaiaAnalysisDetail> {
  return (await api.get(`/gaia/analyses/${id}`)).data;
}

export async function uploadReport(file: File): Promise<GaiaAnalysisSummary> {
  const form = new FormData();
  form.append('file', file);
  return (await api.post('/gaia/analyses', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 })).data;
}

export async function askGaia(id: string, question: string): Promise<string> {
  return (await api.post(`/gaia/analyses/${id}/ask`, { question }, { timeout: 120_000 })).data.answer;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await api.delete(`/gaia/analyses/${id}`);
}
