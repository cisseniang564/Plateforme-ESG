import { describe, it, expect } from 'vitest';
import indicators from '@/pages/Indicators/IndicatorsList.tsx?raw';

describe('Indicateurs — initialisation du catalogue', () => {
  it("n'écrase pas le nom de l'organisation avec un libellé par défaut", () => {
    expect(indicators).not.toContain('Mon Organisation');
    expect(indicators).not.toContain("'/onboarding/setup'");
  });
  it('utilise les indicateurs suggérés et affiche le nombre réellement créé', () => {
    expect(indicators).toContain('/onboarding/indicators/suggested');
    expect(indicators).toContain('indicators_created');
  });
});
