import { describe, expect, it } from 'vitest';
import { buildNextActions, esrsAverage, esrsLevel, gapToTarget, shortCode, trend } from '@/pages/Dashboard/dashboardHelpers';
import page from '@/pages/Dashboard/ExecutiveDashboard.tsx?raw';

const esrs = [
  { code: 'ESRS E1', label: 'Changement climatique', pct: 90 },
  { code: 'ESRS E3', label: 'Eau', pct: 0 },
  { code: 'ESRS S2', label: 'Chaîne de valeur', pct: 30 },
  { code: 'ESRS G1', label: 'Conduite des affaires', pct: 45 },
];

describe('niveaux de couverture ESRS', () => {
  it('trois niveaux, bornes incluses', () => {
    expect(esrsLevel(70)).toBe('covered');
    expect(esrsLevel(69)).toBe('partial');
    expect(esrsLevel(20)).toBe('partial');
    expect(esrsLevel(19)).toBe('missing');
  });
  it('moyenne arrondie, null sans analyse', () => {
    expect(esrsAverage(esrs)).toBe(41);
    expect(esrsAverage([])).toBeNull();
    expect(esrsAverage(null)).toBeNull();
  });
});

describe('prochaines actions', () => {
  it('classe : sans score, puis ESRS les plus bas, puis organisations sous le seuil ; 3 maximum', () => {
    const a = buildNextActions([{ overall_score: null }, { overall_score: 30 }], esrs);
    expect(a.map(x => x.id)).toEqual(['unscored', 'esrs-E3', 'esrs-S2']);
  });
  it('une norme à 0 % est urgente, une à 30 % est un avertissement', () => {
    const a = buildNextActions([{ overall_score: 80 }], esrs);
    expect(a.map(x => [x.id, x.tone])).toEqual([['esrs-E3', 'danger'], ['esrs-S2', 'warning']]);
  });
  it('rien d’urgent : liste vide, aucune action inventée', () => {
    expect(buildNextActions([{ overall_score: 80 }], [{ code: 'E1', label: 'x', pct: 90 }])).toEqual([]);
    expect(buildNextActions([{ overall_score: 80 }], null)).toEqual([]);
  });
  it('accorde le singulier et le pluriel', () => {
    expect(buildNextActions([{ overall_score: null }], null)[0].title).toBe('Calculer le score d’une organisation');
    expect(buildNextActions([{ overall_score: 10 }, { overall_score: 20 }], null)[0].title).toBe('Renforcer 2 organisations sous le seuil');
  });
});

describe('code court des normes', () => {
  it('E1 reste E1, mais ESRS 2 garde son préfixe', () => {
    expect(shortCode('ESRS E1')).toBe('E1');
    expect(shortCode('ESRS 2')).toBe('ESRS 2');
    expect(shortCode('G1')).toBe('G1');
  });
  it('le titre d’action ne répète pas « ESRS »', () => {
    const a = buildNextActions([{ overall_score: 80 }], [{ code: 'ESRS 2', label: 'Informations générales', pct: 0 }]);
    expect(a[0].title).toBe('Compléter la norme ESRS 2');
  });
});

describe('écart et tendance', () => {
  it('écart à l’objectif', () => { expect(gapToTarget(58)).toBe(-17); expect(gapToTarget(80)).toBe(5); });
  it('tendance : dernier point moins l’avant-dernier', () => {
    expect(trend([{ global: 60 }, { global: 64 }])).toBe(4);
    expect(trend([{ global: 60 }])).toBeNull();
  });
});

describe('accueil : même couverture ESRS que la page Rapports', () => {
  it('utilise la couverture globale calculée par le serveur, comme Rapports', () => {
    expect(page).toContain('overall_coverage_pct');
    expect(page).toContain('esrsOverall ?? esrsAverage');
  });
});

describe('accueil : aucune valeur de repli inventée', () => {
  it('plus de « 30 % des organisations » ni de taux de complétude à 70 par défaut', () => {
    expect(page).not.toMatch(/Math\.floor\(totalOrgs \* 0\.3\)/);
    expect(page).not.toMatch(/\? 70 : 0/);
  });
});
