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

import support from '@/pages/Support/Support.tsx?raw';
describe('Support — pas de faux canaux ni de statut codé en dur', () => {
  it('ne contient ni faux téléphone, ni chat fictif, ni statut figé', () => {
    for (const bad of ['+33 1 23 45 67 89', '01 23 45 67 89', 'Chat disponible', 'Tous les services opérationnels', '< 4 heures', 'esgflow.com', "link: '#'"]) {
      expect(support).not.toContain(bad);
    }
    expect(support).toContain('support@greenconnect.cloud');
  });
});

import layout from '@/components/layout/Layout.tsx?raw';
describe('Layout — pas de statut « opérationnel » figé', () => {
  it('renvoie vers la page de statut mesurée', () => {
    expect(layout).not.toContain('Tous les services opérationnels');
    expect(layout).toContain('to="/status"');
  });
});
