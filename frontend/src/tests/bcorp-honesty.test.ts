import { describe, it, expect } from 'vitest';
import src from '../pages/Compliance/BCorp.tsx?raw';
import en from '../i18n/locales/en.json';

describe('BCorp — pas de verdict d’éligibilité', () => {
  it("n'affiche plus « Éligible à la certification » ni « Leader B Corp »", () => {
    expect(src).not.toMatch(/Éligible à la certification|Leader B Corp|Non éligible/);
    expect((en as any).compliance.bcorp.status).toBeUndefined();
  });
  it("précise que le barème de 80 points a été remplacé et que l'outil est indicatif", () => {
    expect(src).toContain('compliance.bcorp.disclaimer');
    expect(JSON.stringify((en as any).compliance.bcorp.disclaimer)).toMatch(/seven impact topics/);
  });
});
