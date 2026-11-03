// Logique pure de la page Rapports (testée dans src/tests/reportsHelpers.test.ts).
// Un seul calcul de couverture ESRS dans toute l'application : celui de l'API /esrs/gap-analysis.

export type SectionStatus = 'ready' | 'partial' | 'missing' | 'manual';

export interface GapSection {
  code: string; label: string; coverage_pct: number; status: SectionStatus;
  disclosures_auto: number; disclosures_covered: number; disclosures_missing: number; disclosures_manual: number;
}
export interface GapAnalysis {
  overall_coverage_pct: number; total_entries: number;
  total_auto_disclosures: number; covered_disclosures: number; sections: GapSection[];
}

export const STATUS_META: Record<SectionStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; action: string }> = {
  ready:   { label: 'Prêt',          tone: 'success', action: 'Relire' },
  partial: { label: 'Partiel',       tone: 'warning', action: 'Compléter' },
  missing: { label: 'Manquant',      tone: 'danger',  action: 'Saisir' },
  manual:  { label: 'À documenter',  tone: 'neutral', action: 'Rédiger' },
};

export const statusMeta = (s: string) => STATUS_META[s as SectionStatus] ?? STATUS_META.missing;

/** Texte « ce qui manque » pour une section. */
export function missingText(s: Pick<GapSection, 'status' | 'disclosures_missing' | 'disclosures_manual'>): string {
  if (s.status === 'manual') return s.disclosures_manual > 1 ? `${s.disclosures_manual} exigences narratives à rédiger` : 'Exigence narrative à rédiger';
  if (s.disclosures_missing === 0) return '—';
  return s.disclosures_missing > 1 ? `${s.disclosures_missing} exigences sans donnée` : '1 exigence sans donnée';
}

export interface Measures {
  entered: number; verified: number;
  coveragePct: number | null; covered: number | null; measurable: number | null;
}

/**
 * Deux mesures distinctes, nommées sans ambiguïté :
 *  - « Données saisies » : ce que vous avez renseigné (et la part vérifiée) ;
 *  - « Exigences ESRS couvertes » : ce que la CSRD demande et que vos données permettent de remplir.
 * Sans analyse ESRS disponible, la couverture est null : on affiche « — », jamais 0 ni une estimation.
 */
export function buildMeasures(entries: { verification_status?: string | null }[], gap: GapAnalysis | null): Measures {
  return {
    entered: gap?.total_entries ?? entries.length,
    verified: entries.filter(e => e.verification_status === 'verified').length,
    coveragePct: gap ? gap.overall_coverage_pct : null,
    covered: gap ? gap.covered_disclosures : null,
    measurable: gap ? gap.total_auto_disclosures : null,
  };
}

export const coverageTone = (pct: number): 'success' | 'warning' | 'danger' => (pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger');
export const coverageBar = (pct: number): string => (pct >= 80 ? '#047857' : pct >= 50 ? '#d97706' : '#b91c1c');
