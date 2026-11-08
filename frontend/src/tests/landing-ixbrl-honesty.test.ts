import { describe, it, expect } from 'vitest';
import landing from '../pages/Landing/LandingPage.tsx?raw';
import enJson from '../i18n/locales/en.json';

describe('Landing : iXBRL et FEC sans promesse excessive', () => {
  it('fr', () => {
    for (const re of [/iXBRL\/ESEF\) , GRI/, /iXBRL\/ESEF\), GRI ou TCFD en 1 clic/, /prêt pour le dépôt/, /iXBRL ready/,
      /exigé par l.ESMA/, /5 minutes au lieu de 3 mois/, /GAIN 200-400/, /Publiez et certifiez/, /150 concepts/]) {
      expect(landing).not.toMatch(re);
    }
  });
  it('en', () => {
    const en = JSON.stringify((enJson as any).landing.lp.diff);
    for (const re of [/5 minutes instead of 3 months/, /SAVES 200-400/, /Real iXBRL/, /ESMA 2026 REQUIREMENT/]) expect(en).not.toMatch(re);
  });
});
