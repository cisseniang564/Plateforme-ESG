import { describe, it, expect } from 'vitest';
import dash from '../pages/Scores/ScoresDashboard.tsx?raw';
import hook from '../hooks/useESGScoring.ts?raw';

describe('Scores — plus de données de démonstration dans le tenant réel', () => {
  it('le bouton et le hook de génération de données simulées ont disparu', () => {
    expect(dash).not.toMatch(/populateSampleData|handlePopulateSampleData|scores\.demoData/);
    expect(hook).not.toMatch(/populate-sample-data|populateSampleData/);
  });
  it("l'export CSV neutralise les formules et échappe les guillemets", () => {
    expect(dash).toContain('const esc = ');
    expect(dash).toMatch(/replace\(\/"\/g, '""'\)/);
  });
});
