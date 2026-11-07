import { describe, it, expect } from 'vitest';
import breakdown from '../pages/Scores/ScoreBreakdown.tsx?raw';
import orgScoring from '../pages/Scores/OrganizationScoring.tsx?raw';
import history from '../pages/Scores/ScoreHistory.tsx?raw';

describe('Scores — erreurs visibles, pas de note par défaut', () => {
  it("ScoreBreakdown distingue erreur / absence de score et n'invente plus la note C", () => {
    expect(breakdown).toContain('loadError');
    expect(breakdown).toContain('sbd.noScore');
    expect(breakdown).not.toContain("getGradeMeta('C', t)");
  });
  it("OrganizationScoring signale l'échec de chargement des scores", () => {
    expect(orgScoring).toContain('scores.loadScoresError');
  });
  it("ScoreHistory n'avale plus l'échec du chargement des organisations", () => {
    expect(history).not.toMatch(/\.catch\(\(\) => \{\}\)/);
  });
});
