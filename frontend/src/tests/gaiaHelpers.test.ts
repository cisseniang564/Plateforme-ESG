import { describe, expect, it } from 'vitest';
import { coverageCounts, coverageSentence, indicatorValue, isUnpublished, pageLabel, shortStandard, tabsFor, unpublishedCount } from '@/pages/Gaia/gaiaHelpers';
import type { GaiaResult } from '@/services/gaiaService';

const base: GaiaResult = { summary: 's', maturity_score: 50, maturity_comment: '', indicators: [], esrs_coverage: [], strengths: [], gaps: [], recommendations: [], flags: [] };

describe('couverture ESRS', () => {
  it('compte par niveau', () => {
    const l = [{ standard: 'E1', label: '', coverage: 'complete' as const, score: 90, evidence: '' }, { standard: 'E2', label: '', coverage: 'absent' as const, score: 0, evidence: '' }, { standard: 'E3', label: '', coverage: 'absent' as const, score: 0, evidence: '' }];
    expect(coverageCounts(l)).toEqual({ complete: 1, partial: 0, absent: 2 });
  });
  it('phrase de bilan accordée', () => {
    expect(coverageSentence({ complete: 2, partial: 1, absent: 0 }, 3)).toBe('2 normes complètes, 1 partielle, 0 absente sur 3 analysées.');
    expect(coverageSentence({ complete: 1, partial: 0, absent: 0 }, 1)).toBe('1 norme complète, 0 partielle, 0 absente sur 1 analysée.');
  });
  it('code court', () => {
    expect(shortStandard('ESRS E1')).toBe('E1');
    expect(shortStandard('ESRS 2')).toBe('ESRS 2');
    expect(shortStandard('G1')).toBe('G1');
  });
});

describe('chiffres relevés', () => {
  it('une valeur absente est dite « Non publié », jamais un tiret muet ni « null »', () => {
    expect(isUnpublished({ value: null })).toBe(true);
    expect(isUnpublished({ value: '  ' })).toBe(true);
    expect(isUnpublished({ value: '0' })).toBe(false);
    expect(indicatorValue({ value: null, unit: 'tCO2e' })).toBe('Non publié');
    expect(indicatorValue({ value: '1 150', unit: 'tCO2e' })).toBe('1 150 tCO2e');
    expect(indicatorValue({ value: '62' })).toBe('62');
  });
  it('page et décompte', () => {
    expect(pageLabel(24)).toBe('p. 24');
    expect(pageLabel(null)).toBe('—');
    expect(unpublishedCount([{ name: 'a', value: null }, { name: 'b', value: '1' }])).toBe(1);
  });
});

describe('onglets du résultat', () => {
  it('toujours Synthèse et Question ; les onglets vides sont masqués', () => {
    expect(tabsFor(base).map(t => t.key)).toEqual(['summary', 'ask']);
  });
  it('affiche chiffres, ESRS et écarts quand il y a du contenu, avec leur effectif', () => {
    const r = { ...base, indicators: [{ name: 'a' }], esrs_coverage: [{ standard: 'E1', label: '', coverage: 'partial' as const, score: 40, evidence: '' }], gaps: ['x'], flags: [{ claim: 'c', why: 'w' }] };
    const t = tabsFor(r);
    expect(t.map(x => x.key)).toEqual(['summary', 'figures', 'esrs', 'gaps', 'ask']);
    expect(t.find(x => x.key === 'gaps')?.count).toBe(2);
  });
});
