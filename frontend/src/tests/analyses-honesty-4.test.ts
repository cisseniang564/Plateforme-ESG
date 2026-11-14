import { describe, it, expect } from 'vitest';
import ir from '@/pages/InvestorRelations/InvestorRelations.tsx?raw';
import surveys from '@/pages/Stakeholders/StakeholderSurveys.tsx?raw';

describe('Relations investisseurs — pas de données inventées', () => {
  it('ne contient plus de notations, documents ou chiffres factices', () => {
    for (const fake of ['Sustainalytics', 'Medium (28.4)', 'Bureau Veritas', 'Votre Entreprise SA', '28 500 tCO₂e', 'Silver (58/100)']) {
      if (fake === 'Sustainalytics') continue; // nom de fournisseur légitime
      expect(ir).not.toContain(fake);
    }
  });
});

describe('Enquêtes parties prenantes — pas de sondage de démo', () => {
  it("n'injecte ni sondage de démo ni réponses aléatoires", () => {
    expect(surveys).not.toContain('buildDemoSurvey');
    expect(surveys).not.toContain('Math.random');
    expect(surveys).not.toContain('@example.com');
  });
});

import ixbrl from '@/pages/Compliance/IXBRLTagging.tsx?raw';
describe('iXBRL — texte de rapport', () => {
  it("n'est pas pré-rempli avec un texte d'exemple", () => {
    expect(ixbrl).toContain("saved?.reportText ?? ''");
    expect(ixbrl).not.toContain('saved?.reportText ?? DEMO_TEXT');
  });
});
