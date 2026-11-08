import { describe, it, expect } from 'vitest';
import csddd from '../pages/Resources/GuideCsdddPage.tsx?raw';
import pme from '../pages/Resources/GuideCsrdPmePage.tsx?raw';
import carbone from '../pages/Resources/GuideBilanCarbonePage.tsx?raw';
import scope3 from '../pages/Resources/Scope3FecPage.tsx?raw';
import taxo from '../pages/Resources/TaxonomiePage.tsx?raw';
import omnibus from '../pages/Resources/OmnibusCsrdPage.tsx?raw';
import checklist from '../pages/Resources/ChecklistCsrdPage.tsx?raw';
import index from '../pages/Resources/ResourcesIndex.tsx?raw';
import enJson from '../i18n/locales/en.json';

const pages = { csddd, pme, carbone, scope3, taxo, omnibus, checklist, index };

describe('Guides Ressources : réalité produit et réglementaire', () => {
  it.each(Object.entries(pages))('%s : pas de promesse produit inventée', (_n, src) => {
    for (const re of [/ADEME 2024/, /Climatiq pour/, /certifiable/i, /en 1 clic/i, /temps réel selon les textes/i,
      /remplit automatiquement 80/i, /Evidence Vault/i, /Économie 70-90/i, /accélère la collecte et la rédaction d'environ/i,
      /CDP-ready/i, /note de qualité de 0 à 100/i, /Connecteur Enedis/i]) {
      expect(src).not.toMatch(re);
    }
  });
  it('CSDDD : régime Omnibus I (5 000 salariés, 1,5 Md€, 2029, 3 %)', () => {
    expect(csddd).toMatch(/26 juillet <strong>2029/);
    expect(csddd).toMatch(/3 %/);
    for (const re of [/Vague 2/, /Vague 3/, /5 % du CA mondial/, /26 juillet 2027/, /~6 000/, /EcoVadis-compatibles/]) {
      expect(csddd).not.toMatch(re);
    }
  });
  it('Guide PME : seuils post-Omnibus, plus de PME cotées en vague 3', () => {
    expect(pme).not.toMatch(/2 des 3 seuils/);
    expect(pme).not.toMatch(/>250 sal|&gt;250 sal/);
    expect(pme).not.toMatch(/Vague 3/);
  });
  it('en.json aligné', () => {
    const r = (enJson as any).resources;
    const en = JSON.stringify([r.guideCsddd, r.guideCsrdPme, r.guideBilanCarbone, r.scope3Fec, r.taxonomie, r.checklist.bottomCta]);
    for (const re of [/ADEME 2024/, /Climatiq for/, /fills 80/i, /Evidence Vault/i, /5% of net worldwide turnover/i, /26 July <strong>2027/]) {
      expect(en).not.toMatch(re);
    }
  });
});
