import { describe, it, expect } from 'vitest';
import src from '../pages/LCA/LCADashboard.tsx?raw';

describe('LCADashboard — honnêteté et robustesse', () => {
  it("ne compte plus un produit sans volume annuel comme 1 unité/an", () => {
    expect(src).not.toMatch(/annual_volume \|\| 1/);
    expect(src).toContain('withoutVolume');
  });
  it("ne revendique plus PEF / ISO 14006 et précise que ce n'est pas une ACV certifiée", () => {
    expect(src).not.toMatch(/ISO 14040\/14044 · PEF/);
    expect(src).not.toMatch(/ISO 14006/);
    expect(src).toContain('lca.disclaimer');
    expect(src).toContain('lca.eco.disclaimer');
  });
  it('signale une erreur de chargement et valide le formulaire', () => {
    expect(src).toContain('loadError');
    expect(src).toContain('lca.toast.noInput');
    expect(src).toContain('lca.toast.volumeInvalid');
  });
  it("le bouton fermer n'est plus une icône poubelle", () => {
    expect(src).toMatch(/onClick=\{onClose\}[^>]*aria-label/);
  });
});
