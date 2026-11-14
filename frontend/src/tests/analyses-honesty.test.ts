import { describe, it, expect } from 'vitest';
import decarb from '@/pages/Decarbonation/DecarbonationPlan.tsx?raw';
import intel from '@/pages/Analytics/IntelligenceDashboard.tsx?raw';
import insights from '@/pages/Analytics/AIInsights.tsx?raw';
import bench from '@/pages/Benchmarking/BenchmarkingDashboard.tsx?raw';

describe('Analyses honesty', () => {
  it('decarbonation catalog has no pre-filled impact, cost, roi or progress', () => {
    const catalog = decarb.slice(decarb.indexOf('const CATALOG'), decarb.indexOf('const CATEGORIES'));
    expect(catalog).not.toMatch(/impact: [1-9]/);
    expect(catalog).not.toMatch(/cost: [1-9]/);
    expect(catalog).not.toMatch(/status: '(en_cours|terminé)'/);
    expect(decarb).not.toContain('NET_ZERO_2050');
    expect(decarb).not.toContain('EU ETS 50');
    expect(decarb).not.toContain('Source : CDR.fyi');
  });
  it('intelligence dashboard has no hardcoded sector scores nor fake export', () => {
    expect(intel).not.toContain('sectorBenchmarks_BASE');
    expect(intel).not.toContain('Plan de décarbonation exporté');
    expect(intel).not.toMatch(/saving: '-\d/);
  });
  it('ai insights does not show a fixed point gain', () => {
    expect(insights).not.toContain('score_gain_est}');
  });
  it('benchmarking never claims public references', () => {
    expect(bench).not.toContain('CDP / MSCI / ADEME');
    expect(bench).toContain('insufficient_cohort');
  });
});
