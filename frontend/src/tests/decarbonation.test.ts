import { describe, it, expect } from 'vitest';
import src from '../pages/Decarbonation/DecarbonationPlan.tsx?raw';

describe('DecarbonationPlan — pas de chiffres inventés', () => {
  it("n'a plus de base d'émissions fictive", () => {
    expect(src).not.toMatch(/DEFAULT_BASE_EMISSIONS|12_500/);
    expect(src).toContain('decarb.noBaseline');
  });
  it("n'affiche plus de capex ni de pourcentages de risque inventés", () => {
    expect(src).not.toMatch(/capex:\s*baseEmissions/);
    expect(src).not.toMatch(/\+300%|\+40%|~80€\/t|140%|Couvre 70%/);
  });
  it("n'invente plus d'avancement de 50 % pour « en cours »", () => {
    expect(src).not.toMatch(/'en_cours' \? '50%'/);
  });
  it('permet d’ajuster gains/coûts et les persiste, et signale les échecs', () => {
    expect(src).toContain('onEdit');
    expect(src).toMatch(/impact: a\.impact, cost: a\.cost/);
    expect(src).toContain('saved === false');
    expect(src).toContain('loadError');
  });
});
