import { describe, it, expect } from 'vitest';
import src from '../pages/Compliance/ClimateScenarios.tsx?raw';

describe('ClimateScenarios — pas de chiffres sans source', () => {
  it("n'affiche plus de PIB ni de prix du carbone attribués à IEA/NGFS/IPCC sans source", () => {
    expect(src).not.toMatch(/gdpImpact|carbonPrice2030/);
    expect(src).not.toMatch(/250 \$\/tCO2/);
    expect(src).toContain('SOURCE_URLS');
  });
  it("n'annonce plus « sauvegardée » quand l'enregistrement serveur échoue", () => {
    expect(src).not.toMatch(/catch \{ \/\* silent/);
    expect(src).toContain('saveFailed');
  });
  it('relit les données locales aussi quand le serveur répond vide', () => {
    expect(src).toContain('loadLocal');
  });
  it('précise que les notes par défaut sont génériques', () => {
    expect(src).toContain('defaultsNote');
  });
});
