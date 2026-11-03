import { describe, expect, it } from 'vitest';
import { buildMeasures, coverageBar, coverageTone, missingText, statusMeta, type GapAnalysis } from '@/pages/Reports/reportsHelpers';
import page from '@/pages/Reports/ReportsUnified.tsx?raw';

const gap: GapAnalysis = { overall_coverage_pct: 53, total_entries: 100, total_auto_disclosures: 40, covered_disclosures: 21, sections: [] };

describe('deux mesures distinctes', () => {
  it('données saisies et exigences couvertes ne se confondent pas', () => {
    const m = buildMeasures([{ verification_status: 'verified' }, { verification_status: 'pending' }, {}], gap);
    expect(m).toEqual({ entered: 100, verified: 1, coveragePct: 53, covered: 21, measurable: 40 });
  });
  it('sans analyse ESRS : couverture inconnue (null), jamais 0 ni une estimation', () => {
    const m = buildMeasures([{ verification_status: 'verified' }, {}], null);
    expect(m).toEqual({ entered: 2, verified: 1, coveragePct: null, covered: null, measurable: null });
  });
});

describe('états par section', () => {
  it('libellés et actions', () => {
    expect(statusMeta('ready')).toMatchObject({ label: 'Prêt', action: 'Relire' });
    expect(statusMeta('partial').action).toBe('Compléter');
    expect(statusMeta('missing').tone).toBe('danger');
    expect(statusMeta('manual').label).toBe('À documenter');
    expect(statusMeta('???').label).toBe('Manquant');
  });
  it('ce qui manque, accordé', () => {
    expect(missingText({ status: 'ready', disclosures_missing: 0, disclosures_manual: 0 })).toBe('—');
    expect(missingText({ status: 'partial', disclosures_missing: 1, disclosures_manual: 0 })).toBe('1 exigence sans donnée');
    expect(missingText({ status: 'missing', disclosures_missing: 4, disclosures_manual: 0 })).toBe('4 exigences sans donnée');
    expect(missingText({ status: 'manual', disclosures_missing: 0, disclosures_manual: 3 })).toBe('3 exigences narratives à rédiger');
  });
  it('seuils de couleur', () => {
    expect(coverageTone(80)).toBe('success'); expect(coverageTone(50)).toBe('warning'); expect(coverageTone(49)).toBe('danger');
    expect(coverageBar(10)).toBe('#b91c1c');
  });
});

describe('page Rapports : plus de mesures contradictoires', () => {
  it('plus de « taux de complétude » calculé sur la présence d’une valeur numérique', () => {
    expect(page).not.toContain("value_numeric != null).length");
    expect(page).not.toContain('reports.kpi.completeness');
  });
  it('plus de « conformité CSRD » : la page ne prétend pas mesurer la conformité', () => {
    expect(page).not.toContain('reports.hero.csrdConformity');
    expect(page).not.toMatch(/conformité CSRD/i);
  });
  it('la couverture vient de l’analyse ESRS du serveur, comme l’accueil', () => {
    expect(page).toContain("'/esrs/gap-analysis'");
  });
});
