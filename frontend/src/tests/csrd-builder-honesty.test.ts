import { describe, it, expect } from 'vitest';
import src from '../pages/Reports/CSRDBuilder.tsx?raw';

describe('CSRDBuilder — complétude réelle uniquement', () => {
  it("n'a plus de taux de complétion ni de statut de données en dur", () => {
    expect(src).not.toMatch(/dataStatus: '(complete|partial|missing)', completionPct: \d+/);
    expect(src).toContain("dataStatus: 'unknown', completionPct: null");
  });
  it("ne reprend plus la valeur statique quand l'analyse d'écart est absente", () => {
    expect(src).not.toContain('let completionPct = sec.completionPct');
    expect(src).toContain("setGapState('error')");
    expect(src).toContain('csrd.s2.gapError');
  });
  it('la moyenne ne porte que sur les sections évaluées', () => {
    expect(src).toContain('sec.completionPct !== null');
  });
  it("ne prétend plus produire une déclaration « conforme ESRS »", () => {
    expect(src).not.toMatch(/conforme ESRS/);
  });
});
