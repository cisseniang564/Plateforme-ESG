// Fonctions pures de la page « Saisie manuelle » (testées dans src/tests/dataEntryHelpers.test.ts).

export interface EntryLike {
  id?: string; pillar: string; category?: string | null; metric_name: string;
  value_numeric?: number | null; value_text?: string | null; unit?: string | null;
  period_start?: string | null; data_source?: string | null; verification_status?: string | null;
}

export type PillarFilter = 'all' | 'environmental' | 'social' | 'governance';
export type VerifFilter = 'all' | 'verified' | 'pending';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function filterEntries<T extends EntryLike>(entries: T[], f: { search: string; pillar: PillarFilter; verif: VerifFilter }): T[] {
  const q = norm(f.search.trim());
  return entries.filter(e => {
    if (f.pillar !== 'all' && e.pillar !== f.pillar) return false;
    const verified = e.verification_status === 'verified';
    if (f.verif === 'verified' && !verified) return false;
    if (f.verif === 'pending' && verified) return false;
    if (!q) return true;
    return norm(`${e.metric_name} ${e.category ?? ''} ${e.data_source ?? ''}`).includes(q);
  });
}

export function countByPillar(entries: EntryLike[]): Record<PillarFilter, number> {
  const out: Record<PillarFilter, number> = { all: entries.length, environmental: 0, social: 0, governance: 0 };
  for (const e of entries) if (e.pillar in out) out[e.pillar as PillarFilter] += 1;
  return out;
}

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// CSV lisible par Excel (BOM + guillemets échappés) : une ligne par saisie affichée.
export function entriesToCsv(entries: EntryLike[]): string {
  const head = ['Indicateur', 'Pilier', 'Catégorie', 'Valeur', 'Unité', 'Période', 'Source', 'Statut'].map(esc).join(',');
  const rows = entries.map(e => [
    e.metric_name, e.pillar, e.category ?? '',
    e.value_numeric ?? e.value_text ?? '', e.unit ?? '', e.period_start ?? '', e.data_source ?? '',
    e.verification_status === 'verified' ? 'vérifiée' : 'à vérifier',
  ].map(esc).join(',')).join('\n');
  return '﻿' + head + '\n' + rows;
}
