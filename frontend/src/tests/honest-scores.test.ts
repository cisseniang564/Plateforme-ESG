import { describe, expect, it } from 'vitest';
import scoresPage from '@/pages/Scores/ScoresDashboard.tsx?raw';
import fr from '@/i18n/locales/fr.json';
import en from '@/i18n/locales/en.json';

// Garde-fou : la page des scores ne doit pas afficher une évolution ou un classement inventés.
describe('page Scores : aucune donnée inventée', () => {
  it('plus de courbe de repli codée en dur', () => {
    expect(scoresPage).not.toMatch(/\[58,\s*59,\s*60/);
  });
  it('plus de texte « 58 → 65 → 69 » dans les traductions', () => {
    expect(JSON.stringify(fr)).not.toContain('58 → 65 → 69');
    expect(JSON.stringify(en)).not.toContain('58 → 65 → 69');
  });
  it('le classement ne dit plus « au-dessus de la moyenne » à tout le monde', () => {
    expect(scoresPage).not.toContain('sectorAboveAvg');
  });
  it('le chargement du classement a une sortie : secteur manquant ou classement indisponible', () => {
    expect(scoresPage).toContain("'no-sector'");
    expect(scoresPage).toContain("'unavailable'");
  });
});
