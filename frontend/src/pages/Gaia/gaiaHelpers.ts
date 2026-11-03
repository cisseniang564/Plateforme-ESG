// Logique pure de la page Gaïa (testée dans src/tests/gaiaHelpers.test.ts).
import type { GaiaEsrs, GaiaIndicator, GaiaResult } from '@/services/gaiaService';

export type CoverageKey = GaiaEsrs['coverage'];

export const COVERAGE_LABEL: Record<CoverageKey, string> = { complete: 'Complet', partial: 'Partiel', absent: 'Absent' };

export function coverageCounts(list: GaiaEsrs[]): Record<CoverageKey, number> {
  const c: Record<CoverageKey, number> = { complete: 0, partial: 0, absent: 0 };
  for (const e of list) if (e.coverage in c) c[e.coverage] += 1;
  return c;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
/** Phrase de bilan de la couverture, accordée : « 2 normes complètes, 1 partielle, 1 absente sur 4 analysées. » */
export function coverageSentence(c: Record<CoverageKey, number>, total: number): string {
  return `${plural(c.complete, 'norme complète', 'normes complètes')}, ${plural(c.partial, 'partielle', 'partielles')}, ${plural(c.absent, 'absente', 'absentes')} sur ${total} analysée${total > 1 ? 's' : ''}.`;
}

/** « ESRS E1 » devient « E1 » ; « ESRS 2 » garde son préfixe pour rester lisible. */
export function shortStandard(code: string): string {
  const c = String(code ?? '').trim();
  return /^ESRS\s*\d/i.test(c) ? c.replace(/^ESRS\s*/i, 'ESRS ') : c.replace(/^ESRS\s*/i, '');
}

/** Un chiffre est « non publié » quand le rapport n'en donne aucune valeur : on le dit, on ne met pas un tiret muet. */
export function isUnpublished(i: Pick<GaiaIndicator, 'value'>): boolean {
  return i.value == null || String(i.value).trim() === '';
}

export function indicatorValue(i: Pick<GaiaIndicator, 'value' | 'unit'>): string {
  return isUnpublished(i) ? 'Non publié' : `${i.value}${i.unit ? ` ${i.unit}` : ''}`;
}

export const pageLabel = (page?: number | null): string => (page ? `p. ${page}` : '—');

export type TabKey = 'summary' | 'figures' | 'esrs' | 'gaps' | 'ask';
export interface TabDef { key: TabKey; label: string; count?: number }

/** Onglets réellement utiles : on masque ceux qui seraient vides, sauf la synthèse et les questions. */
export function tabsFor(r: GaiaResult): TabDef[] {
  const gapsCount = (r.gaps?.length ?? 0) + (r.flags?.length ?? 0);
  const tabs: TabDef[] = [{ key: 'summary', label: 'Synthèse' }];
  if (r.indicators?.length) tabs.push({ key: 'figures', label: 'Chiffres clés', count: r.indicators.length });
  if (r.esrs_coverage?.length) tabs.push({ key: 'esrs', label: 'Couverture ESRS', count: r.esrs_coverage.length });
  if (gapsCount > 0) tabs.push({ key: 'gaps', label: 'Écarts et vigilance', count: gapsCount });
  tabs.push({ key: 'ask', label: 'Poser une question' });
  return tabs;
}

/** Nombre de chiffres dont le rapport ne donne pas la valeur. */
export const unpublishedCount = (list: GaiaIndicator[]): number => list.filter(isUnpublished).length;
