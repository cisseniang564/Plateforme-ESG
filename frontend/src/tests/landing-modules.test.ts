import { describe, it, expect } from 'vitest';
import landing from '../pages/Landing/LandingPage.tsx?raw';

// L'explorateur de modules est rangé par catégories : chaque module doit y figurer une fois.
describe('landing : explorateur de modules par catégories', () => {
  const modules = [...landing.matchAll(/^ {4}id: '([a-z0-9]+)',\n {4}icon:/gm)].map(m => m[1]);
  const block = landing.match(/const MODULE_CATEGORIES[\s\S]*?\n\];/)![0];
  const classed = [...block.matchAll(/modules: \[([^\]]*)\]/g)].flatMap(m => [...m[1].matchAll(/'([a-z0-9]+)'/g)].map(x => x[1]));

  it('22 modules, tous classés exactement une fois', () => {
    expect(modules).toHaveLength(22);
    expect([...classed].sort()).toEqual([...modules].sort());
  });
  it("l'aperçu est signalé comme illustratif", () => {
    expect(landing).toContain('Aperçu illustratif · données fictives');
  });
});
