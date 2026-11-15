import { describe, it, expect } from 'vitest';
import src from '../pages/Carbon/BilanCarbone.tsx?raw';

describe('Bilan carbone : refonte sans perte de fonction', () => {
  it('garde tous les appels au serveur', () => {
    for (const call of ['/carbon/scope-summary', '/carbon/save-scope3', '/carbon/save-scope12', '/carbon/beges-export.xlsx']) {
      expect(src).toContain(call);
    }
    expect(src).toContain("navigate('/app/carbon/fec-wizard')");
  });
  it('garde les quatre vues et l’export CSV', () => {
    for (const k of ["'overview'", "'scope3'", "'decomposition'", "'sankey'"]) expect(src).toContain(k);
    expect(src).toContain('onClick={exportCSV}');
  });
  it('onglets et accordéons accessibles au clavier', () => {
    expect(src).toContain('role="tablist"');
    expect(src).toContain('aria-selected={on}');
    expect(src).toContain('aria-expanded={isExpanded}');
  });
  it('plus d’emoji dans les onglets ni de jargon « DB »', () => {
    expect(src).not.toMatch(/📊|📋|📈|🌊|⬆|⬇/);
    expect(src).not.toMatch(/Sauvegarder en DB/);
  });
  it('deux familles de couleurs pour les catégories : amont et aval', () => {
    expect(src).toContain('UPSTREAM_SHADES');
    expect(src).toContain('DOWNSTREAM_SHADES');
    expect(src).not.toMatch(/softHex|borderHex/);
  });
  it('animations désactivées si l’utilisateur réduit les mouvements', () => {
    expect(src).toContain('motion-safe:transition-[width]');
  });
});
