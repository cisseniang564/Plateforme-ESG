import { describe, it, expect } from 'vitest';
import src from '../pages/Scores/ScoresDashboard.tsx?raw';

describe('Scores ESG : refonte sans perte de fonction', () => {
  it('garde les sources de données réelles', () => {
    for (const call of ['getDashboard', 'recalculateAll', '/organizations?limit=1', '/benchmarks/sector/', '/scores/history']) {
      expect(src).toContain(call);
    }
  });
  it('garde les actions : période, recalcul, export, liens', () => {
    expect(src).toContain('setRecalcPeriod');
    expect(src).toContain('onClick={handleRecalculateAll}');
    expect(src).toContain('onClick={handleExportCSV}');
    for (const to of ['/app/organizations', '/app/benchmarking', '/app/data-entry', '/app/dashboard/pillar/']) expect(src).toContain(to);
  });
  it('menu de période accessible (aria, Échap, clic extérieur)', () => {
    expect(src).toContain('aria-expanded={periodMenuOpen}');
    expect(src).toContain("e.key === 'Escape'");
  });
  it('plus de médailles ni d’emoji, plus de dégradé violet', () => {
    expect(src).not.toMatch(/🥇|🥈|🥉|🏆|📈|▲|▼/);
    expect(src).not.toMatch(/from-purple-900/);
  });
  it('animations désactivées si l’utilisateur réduit les mouvements', () => {
    expect(src).toContain('motion-safe:transition-[width]');
  });
});
