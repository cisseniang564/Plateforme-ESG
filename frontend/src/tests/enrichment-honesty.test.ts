import { describe, it, expect } from 'vitest';
import page from '@/pages/ESG/DataEnrichment.tsx?raw';

describe('Enrichissement honesty', () => {
  it('never asks the server to generate ESG data nor promises it', () => {
    expect(page).toContain('generer_donnees: false');
    expect(page).not.toMatch(/Génération automatique de 12 mois/);
    expect(page).not.toContain('donnees_generees');
    expect(page).not.toMatch(/Données & IA/);
  });
});
