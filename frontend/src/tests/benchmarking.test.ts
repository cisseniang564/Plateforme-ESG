import { describe, it, expect } from 'vitest';
import src from '../pages/Benchmarking/BenchmarkingDashboard.tsx?raw';
import { positionBand } from '../pages/Benchmarking/BenchmarkingDashboard';

describe('BenchmarkingDashboard — honnêteté', () => {
  it('ne contient plus de données maquette ni de rang inventé', () => {
    expect(src).not.toContain('SECTOR_DATA');
    expect(src).not.toMatch(/mockPillar|applyMockWithDelay|rankPos|rankTotal/);
    expect(src).not.toMatch(/Transport|2 450|3 200/);
    expect(src).not.toMatch(/delta >= 20/);
  });
  it("signale les erreurs de chargement et l'absence de score", () => {
    expect(src).toContain('refError');
    expect(src).toContain('benchmarking.noScores');
  });
  it('échappe le CSV', () => {
    expect(src).toContain('function esc(');
  });
  it('positionne le score par bandes du référentiel', () => {
    const q = { p25: 40, median: 55, p75: 70, top10: 85 };
    expect(positionBand(90, q)).toBe('top10');
    expect(positionBand(72, q)).toBe('p75');
    expect(positionBand(60, q)).toBe('median');
    expect(positionBand(45, q)).toBe('p25');
    expect(positionBand(10, q)).toBe('below');
  });
});
