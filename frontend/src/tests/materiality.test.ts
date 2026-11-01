import { describe, expect, it } from 'vitest';
import { catOf, missingDocumentation, normCatKey } from '@/pages/Materiality/materialityHelpers';

describe('pilier d\'un enjeu', () => {
  it.each([
    ['environmental', 'environmental'], ['Environnement', 'environmental'], ['Environnemental', 'environmental'],
    ['Social', 'social'], ['Sociale', 'social'], ['Gouvernance', 'governance'], ['governance', 'governance'],
    ['E1', 'environmental'], ['ESRS S2', 'social'], ['G1', 'governance'], ['Climat', 'environmental'], ['Éthique', 'governance'],
  ])('%s → %s', (stored, expected) => {
    expect(normCatKey(stored)).toBe(expected);
  });

  it('retombe sur le sujet ESRS quand la catégorie est inconnue', () => {
    expect(catOf({ category: 'ESG', esrs_topic: 'S1' })).toBe('social');
    expect(catOf({ category: '', esrs_topic: 'E4' })).toBe('environmental');
    expect(catOf({ category: 'divers', esrs_topic: 'G1' })).toBe('governance');
  });

  it('classe « other » quand rien ne permet de décider, sans inventer un pilier', () => {
    expect(catOf({ category: 'divers' })).toBe('other');
    expect(catOf({ category: 'ESG', esrs_topic: null })).toBe('other');
  });

  it('la catégorie prime sur le sujet ESRS', () => {
    expect(catOf({ category: 'social', esrs_topic: 'E1' })).toBe('social');
  });
});

describe('documentation d\'un enjeu matériel', () => {
  it('liste ce qui manque', () => {
    expect(missingDocumentation({})).toEqual(['justification', 'sujet ESRS', 'impact/risque/opportunité', 'horizon de temps', 'parties prenantes']);
  });
  it('un enjeu complet n\'a rien à signaler', () => {
    expect(missingDocumentation({ rationale: 'Enquête 2025', esrs_topic: 'E1', iro_type: 'impact', time_horizon: 'long', stakeholders: 'Salariés' })).toEqual([]);
  });
  it('une justification faite d\'espaces compte pour absente', () => {
    expect(missingDocumentation({ rationale: '   ', esrs_topic: 'E1', iro_type: 'risk', time_horizon: 'short', stakeholders: 'x' })).toEqual(['justification']);
  });
});
