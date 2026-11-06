import { describe, it, expect } from 'vitest';
import src from '../pages/Carbon/BilanCarbone.tsx?raw';

describe('BilanCarbone — pas de données inventées', () => {
  it("n'a plus d'estimation « IA » codée en dur", () => {
    expect(src).not.toMatch(/aiEstimate/);
    expect(src).not.toMatch(/applyAllAI|applyAI/);
    expect(src).not.toMatch(/estimations? IA/i);
  });
  it("n'affiche plus de benchmark 78 % ni de statut de trajectoire inventé", () => {
    expect(src).not.toMatch(/78\s?%|78%/);
    expect(src).not.toMatch(/onTrack|offTrack/);
    expect(src).not.toMatch(/width: '5%'/);
  });
  it('sauvegarde les Scopes 1 et 2 et signale les erreurs de chargement', () => {
    expect(src).toContain('/carbon/save-scope12');
    expect(src).toContain('loadError');
  });
  it("échappe l'export CSV", () => {
    expect(src).toMatch(/const esc = /);
    expect(src).toMatch(/r\.map\(esc\)/);
  });
});
