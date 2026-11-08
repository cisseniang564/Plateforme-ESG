import { describe, it, expect } from 'vitest';
import taxo from '../pages/Features/TaxonomieUEPage.tsx?raw';
import carbone from '../pages/Features/BilanCarbonePage.tsx?raw';
import decarb from '../pages/Features/DecarbonationPage.tsx?raw';
import dma from '../pages/Features/DoubleMaterialitePage.tsx?raw';
import enJson from '../i18n/locales/en.json';

const all = { taxo, carbone, decarb, dma };
const f = (enJson as any).features;
const en = JSON.stringify([f.taxonomieUe, f.bilanCarbone, f.decarbonation, f.doubleMaterialite]);

describe('Pages Fonctionnalités (3) : pas de promesses non tenues', () => {
  it.each(Object.entries(all))('%s : pas de formulation trompeuse', (_n, src) => {
    for (const re of [/600 facteurs/i, /mis à jour automatiquement/i, /conforme à l.ISO 14064/i, /accepté par l'ADEME/i,
      /suggestions IA/i, /intervalles de confiance/i, /export certifiable/i, /prêts? pour publication/i, /24 (actions|leviers)/i,
      /validable SBTi/i, /jusqu'à 5 scénarios/i, /rapport de matérialité PDF avec/i]) {
      expect(src).not.toMatch(re);
    }
  });
  it('taxonomie : gaz/nucléaire non pris en charge', () => {
    expect(taxo).toMatch(/ne les prend pas en charge/);
  });
  it('en.json aligné', () => {
    for (const re of [/600 emission factors/i, /ISO 14064 compliant/i, /AI analyzes/i, /confidence intervals/i, /24 pre-configured/i, /ready for publication/i]) {
      expect(en).not.toMatch(re);
    }
  });
});
