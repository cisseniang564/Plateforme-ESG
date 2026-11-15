import { describe, it, expect } from 'vitest';
import templates from '@/pages/Templates/SectoralTemplates.tsx?raw';
import users from '@/pages/Settings/UserManagement.tsx?raw';
import setup from '@/pages/Setup/FirstTimeSetup.tsx?raw';
import csrd from '@/pages/Compliance/CSRDProgress.tsx?raw';
import demarrer from '@/pages/Docs/content/demarrer.ts?raw';
import carbone from '@/pages/Docs/content/carbone.ts?raw';
import collecter from '@/pages/Docs/content/collecter.ts?raw';
import indicateurs from '@/pages/Docs/content/indicateurs.ts?raw';

describe('Templates sectoriels', () => {
  it("n'affichent ni ne créent de valeurs", () => {
    expect(templates).not.toContain('e.value');
    expect(templates).not.toContain('estimées et modifiables');
    expect(templates).toContain("api.post('/templates/sectoral/revert'");
  });
  it('ne promettent plus ~50 % de couverture CSRD', () => {
    expect(setup).not.toContain('~50% de couverture');
    expect(csrd).not.toContain('~50%');
  });
});

describe('Rôles', () => {
  it("ne proposent plus un rôle inexistant côté serveur", () => {
    expect(users).not.toContain("'esg_analyst'");
    expect(users).toContain("name: 'data_entry'");
  });
});

describe("Aide intégrée à jour", () => {
  it('sans affirmations corrigées depuis', () => {
    for (const bad of ['Base Empreinte ADEME 2024', 'moyennes sectorielles (ADEME, INSEE)', 'données de démonstration', '14 indicateurs standards', 'gain de points estimé']) {
      for (const src of [demarrer, carbone, collecter, indicateurs]) expect(src).not.toContain(bad);
    }
  });
});
