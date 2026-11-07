import { describe, it, expect } from 'vitest';
import multi from '../pages/Reports/MultiStandardMapping.tsx?raw';
import ixbrl from '../pages/Compliance/IXBRLTagging.tsx?raw';

describe('Multi-standards — plus de valeurs d’exemple', () => {
  it("ne contient aucune valeur ni statut d'exemple dans la table de correspondance", () => {
    expect(multi).not.toMatch(/value: '[^']+'/);
    expect(multi).not.toMatch(/status: 'validated'.*gri:/);
    expect(multi).not.toContain('1 234 ETP');
  });
  it("n'affiche plus de couverture par défaut (100/90/43/43)", () => {
    expect(multi).not.toMatch(/csrd: 100, gri: 90/);
    expect(multi).toContain('loadError');
  });
});

describe('IXBRL — pas de promesse de dépôt', () => {
  it("n'affirme plus « prêt pour dépôt ESEF »", () => {
    expect(ixbrl).not.toMatch(/prêt pour dépôt ESEF/);
    expect(ixbrl).toContain('compliance.ixbrl.report.notOfficial');
  });
});
