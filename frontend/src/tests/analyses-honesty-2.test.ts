import { describe, it, expect } from 'vitest';
import bilan from '@/pages/Carbon/BilanCarbone.tsx?raw';
import scope3 from '@/pages/Carbon/Scope3Calculator.tsx?raw';
import materiality from '@/pages/Materiality/MaterialityMatrix.tsx?raw';

describe('Analyses honesty (2)', () => {
  it('bilan carbone shows no hardcoded ADEME factor values', () => {
    expect(bilan).not.toMatch(/ademe_factor/);
    expect(bilan).not.toContain('Source : Base Empreinte');
  });
  it('scope 3 calculator flags factors as indicative and unaudited', () => {
    expect(scope3).toContain('scope3.factorsDisclaimer');
    expect(scope3).not.toContain('méthodologie ADEME Base Empreinte 2024');
  });
  it('materiality suggestions are not AI and write neutral impacts', () => {
    expect(materiality).toContain('financial_impact: 50, esg_impact: 50');
    expect(materiality).not.toMatch(/financial_impact: s\.financial_impact/);
  });
});
