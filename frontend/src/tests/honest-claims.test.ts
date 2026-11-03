import { describe, expect, it } from 'vitest';
import prospectTour from '@/components/tour/prospectTour.ts?raw';
import tourSteps from '@/components/tour/tourSteps.ts?raw';
import aiInsights from '@/pages/Analytics/AIInsights.tsx?raw';
import en from '@/i18n/locales/en.json';

// Garde-fou : aucun chiffre de performance « constaté chez nos clients » tant qu'il n'y a pas de clients,
// aucun connecteur annoncé qui n'existe pas, aucune promesse de score.
describe('visites guidées : plus d’affirmation inventée', () => {
  const tours = { prospectTour, tourSteps };
  it.each(Object.entries(tours))('%s : pas de résultat « chez nos clients »', (_n, src) => {
    expect(src).not.toMatch(/chez nos clients/i);
    expect(src).not.toMatch(/gain de score moyen/i);
  });
  it.each(Object.entries(tours))('%s : pas de gain de temps chiffré non mesuré', (_n, src) => {
    expect(src).not.toMatch(/divise par 5/i);
    expect(src).not.toMatch(/jours-homme/i);
  });
  it.each(Object.entries(tours))('%s : pas de connecteur ERP/SIRH annoncé comme branché', (_n, src) => {
    expect(src).not.toMatch(/SAP, Workday, Salesforce/);
  });
  it('pas de « 10 standards ESRS », de XBRL ni de « prêt pour votre commissaire aux comptes »', () => {
    expect(prospectTour).not.toMatch(/10 standards ESRS/);
    expect(prospectTour).not.toMatch(/XBRL/);
    expect(prospectTour).not.toMatch(/commissaire aux comptes/);
  });
  it('les traductions anglaises ne rétablissent pas ces affirmations', () => {
    const t = JSON.stringify((en as any).ptour) + JSON.stringify((en as any).tsteps?.s6Content);
    expect(t).not.toMatch(/among our clients|cuts CSRD report production time by 5|person-days|SAP, Workday|statutory auditor|XBRL/i);
  });
});

describe('recommandations : plus de promesse de score', () => {
  it('plus de total « +40 pts » ni de « pourrait atteindre X/100 »', () => {
    expect(aiInsights).not.toContain('total_gain_estimate');
    expect(aiInsights).not.toMatch(/pourrait atteindre/);
    expect(aiInsights).not.toMatch(/Math\.min\(Math\.round\(data\.scores\.overall\)/);
  });
  it('les gains par action sont étiquetés « indicatif »', () => {
    expect(aiInsights).toContain("'ai.gainIndicative'");
    expect(aiInsights).toContain('ne sont pas calculés à partir de vos données');
  });
});
