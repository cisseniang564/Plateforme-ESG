import { describe, it, expect } from 'vitest';
import list from '../pages/Indicators/IndicatorsList.tsx?raw';
import cmp from '../pages/Indicators/IndicatorComparison.tsx?raw';

describe('Indicateurs — pas de valeur dérivée du code, comparaison fiable', () => {
  it("n'invente plus de taux de complétion à partir de la lettre du code", () => {
    expect(list).not.toMatch(/charCodeAt|getCompletion/);
  });
  it("ne compte plus comme « dans la cible » un indicateur sans cible", () => {
    expect(cmp).toContain('r.target > 0 && r.current >= r.target');
    expect(cmp).toContain('filtered.filter(r => r.target > 0)');
  });
  it('signale la troncature à 20 indicateurs et les statistiques en échec', () => {
    expect(cmp).toContain('indicators.comparisonTruncated');
    expect(cmp).toContain('indicators.statsPartialError');
  });
});
