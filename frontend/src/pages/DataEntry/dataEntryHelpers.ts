// Fonctions pures de la page « Saisie manuelle » (testées dans src/tests/dataEntryHelpers.test.ts).

export interface EntryLike {
  id?: string; pillar: string; category?: string | null; metric_name: string;
  value_numeric?: number | null; value_text?: string | null; unit?: string | null;
  period_start?: string | null; data_source?: string | null; verification_status?: string | null;
}

export type PillarFilter = 'all' | 'environmental' | 'social' | 'governance';
export type VerifFilter = 'all' | 'verified' | 'pending';
export type SortKey = 'created_at' | 'metric_name' | 'pillar' | 'period_start' | 'value_numeric' | 'verification_status';
export type SortOrder = 'asc' | 'desc';

export interface ListQuery {
  search: string; pillar: PillarFilter; verif: VerifFilter; year: string;
  sortBy: SortKey; order: SortOrder; page: number; pageSize: number;
}

// Paramètres de GET /data-entry/ (les filtres vides sont omis).
export function buildListParams(q: ListQuery): Record<string, string | number> {
  const p: Record<string, string | number> = {
    sort_by: q.sortBy, order: q.order, limit: q.pageSize, offset: (Math.max(q.page, 1) - 1) * q.pageSize,
  };
  if (q.search.trim()) p.search = q.search.trim();
  if (q.pillar !== 'all') p.pillar = q.pillar;
  if (q.verif !== 'all') p.verification_status = q.verif;
  if (q.year) p.year = q.year;
  return p;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
}

// Les imports CSV laissent parfois un code (« 1.1 », « 3.186 ») à la place du libellé :
// on affiche alors la catégorie comme titre et le code en pastille.
const CODE_ONLY = /^[\d\s._\-/]+$/;
export function displayName(e: Pick<EntryLike, 'metric_name' | 'category'>): { title: string; code: string | null } {
  const name = (e.metric_name ?? '').trim();
  if (name === '' || CODE_ONLY.test(name)) {
    const cat = (e.category ?? '').trim();
    return { title: cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Indicateur sans libellé', code: name || null };
  }
  return { title: name, code: null };
}

// Un entier entre 1990 et 2100 saisi comme valeur ressemble à une année : signe classique d'une
// colonne mal associée à l'import. On le signale sans jamais modifier la donnée.
const YEAR_UNITS = /^(an|ans|année|annee|year|years|yr)$/i;
export function looksLikeYear(e: Pick<EntryLike, 'value_numeric' | 'unit'>): boolean {
  const v = e.value_numeric;
  if (v === null || v === undefined || !Number.isInteger(v)) return false;
  if (v < 1990 || v > 2100) return false;
  return !YEAR_UNITS.test((e.unit ?? '').trim());
}

export function formatValue(e: Pick<EntryLike, 'value_numeric' | 'value_text'>): string {
  if (e.value_numeric !== null && e.value_numeric !== undefined) return e.value_numeric.toLocaleString('fr-FR');
  return e.value_text || '—';
}

export function verifiedRate(byStatus: Record<string, number> | undefined, total: number): number {
  if (!total) return 0;
  return Math.round(((byStatus?.verified ?? 0) / total) * 100);
}

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// CSV lisible par Excel (BOM + guillemets échappés) : sert à exporter la sélection.
export function entriesToCsv(entries: EntryLike[]): string {
  const head = ['Indicateur', 'Pilier', 'Catégorie', 'Valeur', 'Unité', 'Période', 'Source', 'Statut'].map(esc).join(',');
  const rows = entries.map(e => [
    e.metric_name, e.pillar, e.category ?? '',
    e.value_numeric ?? e.value_text ?? '', e.unit ?? '', e.period_start ?? '', e.data_source ?? '',
    e.verification_status === 'verified' ? 'vérifiée' : 'à vérifier',
  ].map(esc).join(',')).join('\n');
  return '﻿' + head + '\n' + rows;
}
