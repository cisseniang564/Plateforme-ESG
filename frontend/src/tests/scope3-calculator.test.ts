import { describe, it, expect } from 'vitest';
import src from '../pages/Carbon/Scope3Calculator.tsx?raw';

describe('Scope3Calculator — honnêteté et robustesse', () => {
  it("le champ distance est un aller simple (le backend multiplie par 2)", () => {
    expect(src).toContain('Distance aller simple (km)');
    expect(src).not.toMatch(/km A\/R/);
  });
  it('ne prétend plus des défauts « INSEE » non vérifiés', () => {
    expect(src).not.toMatch(/INSEE/);
  });
  it('signale un échec de chargement des facteurs et les résultats périmés', () => {
    expect(src).toContain('loadError');
    expect(src).toContain('stale');
  });
  it("échappe l'export CSV", () => {
    expect(src).toMatch(/const esc = /);
  });
});
