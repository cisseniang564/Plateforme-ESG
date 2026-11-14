import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ROWS = [
  { id: 'a', metric_name: 'Émissions Scope 1', value_numeric: 0, value_text: null, unit: 'tCO2e', pillar: 'environmental', category: 'emissions',
    period_start: '2024-01-01', period_end: '2024-12-31', collection_method: 'automatic', verification_status: 'pending', data_source: null },
  { id: 'b', metric_name: 'Effectif total', value_numeric: 340, value_text: null, unit: 'ETP', pillar: 'social', category: 'effectifs',
    period_start: '2024-01-01', period_end: '2024-12-31', collection_method: 'manual', verification_status: 'verified', data_source: 'SIRH' },
];
const STATS = {
  total: 250, by_pillar: { environmental: 150, social: 100 }, by_verification_status: { verified: 50, pending: 190, flagged: 10 },
  by_collection_method: { manual: 200, automatic: 50 }, by_category: {}, by_metric: {}, by_period: { '2024': 200, '2023': 50 }, date_range: { min: null, max: null },
};

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get, post, put: vi.fn(), delete: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/hooks/usePlan', () => ({ usePlan: () => ({ can: () => true, loading: false }) }));
vi.mock('@/i18n/config', () => ({ default: { language: 'fr' } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, d?: unknown, o?: Record<string, unknown>) => {
      const opts = (typeof d === 'object' && d ? d : o) as Record<string, unknown> | undefined;
      const text = typeof d === 'string' ? d : key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k] ?? ''));
    },
    i18n: { language: 'fr' },
  }),
}));

import MyDataDashboard from '@/pages/DataEntry/MyDataDashboard';
import DataExport from '@/pages/DataEntry/DataExport';
import ImportCSV from '@/pages/DataEntry/ImportCSV';

beforeEach(() => {
  get.mockReset(); post.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/data-entry/') return Promise.resolve({ data: ROWS, headers: { 'x-total-count': '250' } });
    if (url === '/data-entry/stats') return Promise.resolve({ data: STATS });
    if (url === '/organizations') return Promise.resolve({ data: { items: [{ id: 'o1', name: 'Siège' }] } });
    return Promise.resolve({ data: {} });
  });
});

describe('Mes données', () => {
  it('affiche le total réel, la valeur 0, une origine honnête et pagine côté serveur', async () => {
    render(<MemoryRouter><MyDataDashboard /></MemoryRouter>);
    await screen.findByRole('table');
    expect(screen.getByText('1–25 sur 250')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2); // KPI « Rejetées » + valeur 0 de la saisie
    expect(screen.getAllByText('Estimation sectorielle').length).toBeGreaterThan(0);
    expect(screen.queryByText(/IA/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    await waitFor(() => expect(get.mock.calls.some(c => c[0] === '/data-entry/' && c[1]?.params?.offset === 25)).toBe(true));
  });

  it('exige un motif avant de rejeter', async () => {
    render(<MemoryRouter><MyDataDashboard /></MemoryRouter>);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: /Rejeter Émissions Scope 1/ }));
    const dialog = await screen.findByRole('dialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === 'Rejeter')!;
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motif du rejet'), { target: { value: 'Unité erronée' } });
    expect(confirm).not.toBeDisabled();
    post.mockResolvedValue({ data: {} });
    fireEvent.click(confirm);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/data-validation/entries/a/validate', { action: 'reject', reason: 'Unité erronée' }));
  });
});

describe('Export', () => {
  it('annonce le nombre exact de lignes et les années réellement présentes', async () => {
    render(<MemoryRouter><DataExport /></MemoryRouter>);
    expect(await screen.findByText('250 ligne(s) seront exportées.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2023' })).toBeInTheDocument();
    expect(screen.queryByText(/JSON/)).toBeNull();
  });
});

describe('Import de fichier', () => {
  it("annonce la destination d'un fichier fournisseurs et n'exige pas Indicateur / Valeur", async () => {
    post.mockResolvedValue({ data: {
      upload_id: 'u1', intent: 'suppliers', filename: 'fournisseurs.csv', total_rows: 2, columns: ['name', 'global_score'],
      detected_mapping: {}, preview: [{ name: 'ACME', global_score: 72 }], validation: { valid_rows: 0, invalid_rows: 2 },
    } });
    const { container } = render(<MemoryRouter><ImportCSV /></MemoryRouter>);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['name,global_score\nACME,72\n'], 'fournisseurs.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Analyser le fichier' }));
    expect(await screen.findByText('Supply chain')).toBeInTheDocument();
    expect(screen.queryByText('Correspondance des colonnes')).toBeNull();
    expect(screen.getByRole('button', { name: 'Importer 2 ligne(s)' })).not.toBeDisabled();
  });
});
