import { describe, it, expect } from 'vitest';
import landing from '../pages/Landing/LandingPage.tsx?raw';
import en from '../i18n/locales/en.json';

const home = (en as any).landing.home;
const get = (path: string) => path.split('.').reduce((o: any, k) => o?.[k], home);

describe('page d’accueil : refonte', () => {
  it('chaque clé statique landing.home.* du code existe en anglais', () => {
    const keys = [...landing.matchAll(/\bh\('([\w.]+)'/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(40);
    const missing = keys.filter(k => typeof get(k) !== 'string');
    expect(missing).toEqual([]);
  });

  it('les groupes de clés dynamiques existent en anglais', () => {
    for (const p of ['esrsGroups.E', 'esrs.E1', 'esrs.G1', 'pipeline.trace.desc', 'data.automate.items.1',
      'security.access.desc', 'resources.checklist.desc', 'about.review.desc', 'footer.company.links.4']) {
      expect(typeof get(p), p).toBe('string');
    }
  });

  it('structure accessible : lien d’évitement, main, un seul h1', () => {
    expect(landing).toMatch(/href="#contenu"/);
    expect(landing).toMatch(/<main id="contenu">/);
    expect(landing.match(/<h1\b/g)?.length).toBe(1);
  });

  it('la page reste en thème clair même si le thème sombre est actif', () => {
    expect(landing).toMatch(/useLightTheme\(\)/);
  });

  it('aucune statistique client ni témoignage inventé', () => {
    expect(landing).not.toMatch(/testimonial|témoignage client|\d+\s?%\s+de nos clients|clients nous font confiance/i);
  });

  it('les webhooks annoncés correspondent à six événements', () => {
    expect(landing.match(/const WEBHOOK_EVENTS = \[([^\]]+)\]/)![1].split(',').length).toBe(6);
  });
});
