import { describe, it, expect } from 'vitest';
import wizard from '@/pages/Carbon/FECWizard.tsx?raw';
import conn from '@/pages/Data/Connectors.tsx?raw';

describe('FEC honesty', () => {
  it('no overclaim of ADEME emission factors on expenses', () => {
    expect(conn).not.toMatch(/selon les facteurs (d'émission )?ADEME/);
    expect(conn).not.toContain('calcul Scope 3 ADEME');
  });
  it('wizard lists unconverted spend', () => {
    expect(wizard).toContain('not_converted');
  });
});
