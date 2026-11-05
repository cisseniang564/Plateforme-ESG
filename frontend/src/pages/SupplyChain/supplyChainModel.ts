import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

export type RiskLevel = 'Critique' | 'Élevé' | 'Moyen' | 'Faible';
export type EvalStatus = 'Évalué' | 'En cours' | 'Non évalué' | 'Refus';

export interface Supplier {
  id: string;
  name: string;
  country: string;
  category: string;
  spend: number; // k€ / an
  employees: number;
  risk: RiskLevel;
  status: EvalStatus;
  scores: { env: number; social: number; gov: number };
  globalScore: number;
  lastEval: string | null;
  flags: string[];
  contactEmail: string;
  linkActive: boolean;
  portalToken: string | null;
  completed: boolean;
  answers: Record<string, any> | null;
}

export interface Question {
  id: string;
  section: string;
  question: string;
  type: 'number' | 'boolean' | 'select';
  unit?: string;
  required: boolean;
  help?: string;
  options?: string[];
}

export const RISK_ORDER: RiskLevel[] = ['Critique', 'Élevé', 'Moyen', 'Faible'];
export const STATUS_ORDER: EvalStatus[] = ['Évalué', 'En cours', 'Non évalué', 'Refus'];

/** Seuils du score global (identiques au backend : supply_chain_service.RISK_THRESHOLDS). */
export const RISK_THRESHOLDS: { level: RiskLevel; label: string }[] = [
  { level: 'Faible', label: '≥ 70' },
  { level: 'Moyen', label: '50 – 69' },
  { level: 'Élevé', label: '30 – 49' },
  { level: 'Critique', label: '< 30' },
];

export function riskFromScore(score: number): RiskLevel {
  if (score >= 70) return 'Faible';
  if (score >= 50) return 'Moyen';
  if (score >= 30) return 'Élevé';
  return 'Critique';
}

export const RISK_CFG: Record<RiskLevel, { color: string; bg: string; border: string; dot: string; bar: string }> = {
  Critique: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', bar: 'bg-red-500' },
  Élevé: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  Moyen: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', bar: 'bg-amber-400' },
  Faible: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500', bar: 'bg-green-500' },
};

export const STATUS_CFG: Record<EvalStatus, { color: string; bg: string; icon: any }> = {
  Évalué: { color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  'En cours': { color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  'Non évalué': { color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertTriangle },
  Refus: { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export const CATEGORIES = ['Matières premières', 'Logistique', 'Sous-traitance', 'Emballages', 'IT & Numérique', 'Énergie', 'Services'];

/** Convertit une ligne de l'API en Supplier. Les libellés risk/status viennent du serveur. */
export function mapSupplier(s: any): Supplier {
  const risk: RiskLevel = (RISK_ORDER as string[]).includes(s.risk) ? s.risk : riskFromScore(Number(s.global_score) || 0);
  const status: EvalStatus = (STATUS_ORDER as string[]).includes(s.status) ? s.status : 'Non évalué';
  return {
    id: String(s.id),
    name: s.name ?? '',
    country: s.country ?? '',
    category: s.category ?? '',
    spend: Number(s.spend_k_eur ?? s.spend ?? 0) || 0,
    employees: Number(s.employees ?? 0) || 0,
    risk,
    status,
    scores: {
      env: Math.round(Number(s.env_score) || 0),
      social: Math.round(Number(s.social_score) || 0),
      gov: Math.round(Number(s.gov_score) || 0),
    },
    globalScore: Math.round(Number(s.global_score) || 0),
    lastEval: s.last_scored_at ?? null,
    flags: Array.isArray(s.flags) ? s.flags : [],
    contactEmail: s.contact_email ?? '',
    linkActive: Boolean(s.questionnaire_link_active),
    portalToken: s.portal_token ?? null,
    completed: Boolean(s.questionnaire_completed),
    answers: s.questionnaire_data ?? null,
  };
}

/** Un fournisseur sans évaluation n'a pas de risque connu : on ne l'affiche pas comme « Moyen ». */
export function hasScore(s: Supplier): boolean {
  return s.globalScore > 0 && s.status === 'Évalué';
}

export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  // Neutralise l'injection de formules à l'ouverture dans Excel / Sheets
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\n');
}

export function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function apiErrorMessage(err: any, fallback: string): string {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && typeof d.message === 'string') return d.message;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg);
  return fallback;
}

export function portalUrl(token: string): string {
  return `${window.location.origin}/supplier-portal/${token}`;
}
