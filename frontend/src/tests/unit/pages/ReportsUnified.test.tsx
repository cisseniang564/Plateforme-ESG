import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gap = {
  overall_coverage_pct: 53, total_entries: 100, total_auto_disclosures: 40, covered_disclosures: 21,
  sections: [
    { code: 'ESRS E1', label: 'Changement climatique', coverage_pct: 90, status: 'ready', disclosures_auto: 10, disclosures_covered: 9, disclosures_missing: 1, disclosures_manual: 0 },
    { code: 'ESRS E3', label: 'Eau', coverage_pct: 0, status: 'missing', disclosures_auto: 4, disclosures_covered: 0, disclosures_missing: 4, disclosures_manual: 0 },
    { code: 'ESRS G1', label: 'Conduite des affaires', coverage_pct: 50, status: 'partial', disclosures_auto: 6, disclosures_covered: 3, disclosures_missing: 3, disclosures_manual: 0 },
  ],
};
const entries = [{ id: '1', pillar: 'environmental', metric_name: 'Scope 1', value_numeric: 12, verification_status: 'verified' }, { id: '2', pillar: 'social', metric_name: 'Effectif', value_numeric: 3, verification_status: 'pending' }];

const get = vi.hoisted(() => vi.fn());
vi.mock('@/services/api', () => ({ default: { get, post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: unknown, o?: Record<string, unknown>) => {
  const tpl = typeof d === 'string' ? d : _k; const vars = (typeof d === 'object' && d ? d : o) as Record<string, unknown> | undefined;
  return vars ? tpl.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(vars[k] ?? '')) : tpl;
} }) }));
vi.mock('@/components/reports/ReportHistoryPanel', () => ({ default: () => <div>historique</div> }));
vi.mock('@/components/reports/DataChecksPanel', () => ({ default: () => <div>vérifications</div> }));

import ReportsUnified from '@/pages/Reports/ReportsUnified';
const renderPage = () => render(<MemoryRouter><ReportsUnified /></MemoryRouter>);

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/data-entry/') return Promise.resolve({ data: entries });
    if (url === '/organizations') return Promise.resolve({ data: { items: [{ id: 'o1', name: 'Org' }] } });
    if (url === '/esrs/gap-analysis') return Promise.resolve({ data: gap });
    return Promise.resolve({ data: {} });
  });
});

describe('Rapports — deux mesures nommées', () => {
  it('« Données saisies » et « Exigences ESRS couvertes » sont distinctes, avec leur sens', async () => {
    renderPage();
    const m = await screen.findByRole('region', { name: 'Mesures' });
    expect(within(m).getByText('Données saisies')).toBeInTheDocument();
    expect(within(m).getByText('100')).toBeInTheDocument();
    expect(within(m).getByText(/1 vérifiés/)).toBeInTheDocument();
    expect(within(m).getByText('Exigences ESRS couvertes')).toBeInTheDocument();
    expect(within(m).getByText('53 %')).toBeInTheDocument();
    expect(within(m).getByText(/21 exigences sur 40 mesurables/)).toBeInTheDocument();
  });
  it('plus de « complétude 100 % » ni de « conformité CSRD »', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Mesures' });
    expect(screen.queryByText(/Taux de complétude/i)).toBeNull();
    expect(screen.queryByText(/conformité CSRD/i)).toBeNull();
  });
  it('sans analyse ESRS : « — » et un message, jamais 0 %', async () => {
    get.mockImplementation((url: string) => (url === '/esrs/gap-analysis' ? Promise.reject(new Error('x')) : Promise.resolve({ data: url === '/data-entry/' ? entries : { items: [] } })));
    renderPage();
    const m = await screen.findByRole('region', { name: 'Mesures' });
    expect(within(m).getByText('—')).toBeInTheDocument();
    expect(within(m).getByText(/Analyse ESRS indisponible/)).toBeInTheDocument();
    expect(within(m).queryByText('0 %')).toBeNull();
  });
});

describe('Rapports — état par section ESRS', () => {
  it('liste chaque section avec statut, ce qui manque et action', async () => {
    renderPage();
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Prêt')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Manquant')).toBeInTheDocument();
    expect(within(rows[2]).getByText('4 exigences sans donnée')).toBeInTheDocument();
    expect(within(rows[2]).getByRole('button', { name: 'Saisir' })).toBeInTheDocument();
    expect(within(rows[3]).getByText('Partiel')).toBeInTheDocument();
    expect(within(rows[3]).getByRole('button', { name: 'Compléter' })).toBeInTheDocument();
  });
  it('avertit seulement quand la couverture connue est sous 60 %', async () => {
    renderPage();
    expect(await screen.findByText('Couverture inférieure à 60 %.')).toBeInTheDocument();
  });
  it('les onglets sont accessibles et changent de contenu', async () => {
    renderPage();
    await screen.findByRole('table');
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('table')).toBeNull();
  });
});
