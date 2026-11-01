import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const row = (id: string, over: Record<string, unknown> = {}) => ({
  id, period_start: '2024-01-01', period_end: '2024-12-31', period_type: 'annual', pillar: 'environmental',
  category: 'emissions', metric_name: 'Émissions Scope 1', value_numeric: 120.5, unit: 'tCO2e',
  data_source: null, collection_method: 'manual', verification_status: 'pending', notes: null, ...over,
});
const ROWS = [
  row('a'),
  row('b', { metric_name: '3.186', value_numeric: 2022, collection_method: 'csv_import' }),
  row('c', { pillar: 'social', metric_name: 'Effectif total', category: 'effectifs', value_numeric: 340, unit: 'ETP', verification_status: 'verified' }),
];
const STATS = { total: 250, by_pillar: { environmental: 150, social: 60, governance: 40 }, by_verification_status: { verified: 50, pending: 200 }, by_period: { '2024': 200, '2023': 50 } };

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get, post: vi.fn(), put, delete: del } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', async () => {
  const fr = (await import('@/i18n/locales/fr.json')).default as Record<string, unknown>;
  const lookup = (key: string): string | undefined =>
    key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), fr) as string | undefined;
  return { useTranslation: () => ({ t: (key: string, d?: unknown) => lookup(key) ?? (typeof d === 'string' ? d : key), i18n: { language: 'fr' } }), Trans: ({ children }: { children: React.ReactNode }) => children };
});

import DataEntryForm from '@/pages/DataEntry/DataEntryForm';

const listCalls = () => get.mock.calls.filter(c => c[0] === '/data-entry/');

async function renderPage() {
  render(<MemoryRouter><DataEntryForm /></MemoryRouter>);
  await screen.findByRole('table');
}

beforeEach(() => {
  get.mockReset(); put.mockReset(); del.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/data-entry/') return Promise.resolve({ data: ROWS, headers: { 'x-total-count': '250' } });
    if (url === '/data-entry/stats') return Promise.resolve({ data: STATS });
    if (url === '/organizations') return Promise.resolve({ data: { items: [] } });
    return Promise.resolve({ data: {} });
  });
});

describe('Saisie manuelle — tableau', () => {
  it('affiche les KPI globaux (stats serveur) et le total réel, pas les seules lignes chargées', async () => {
    await renderPage();
    const kpis = screen.getByRole('region', { name: /indicateurs clés/i });
    await waitFor(() => expect(within(kpis).getByText('250')).toBeInTheDocument());
    expect(within(kpis).getByText('20 %')).toBeInTheDocument();
    expect(screen.getByText(/1–25 sur 250/)).toBeInTheDocument();
  });

  it('rend un code seul lisible et signale la valeur ressemblant à une année', async () => {
    await renderPage();
    expect(screen.getByText('3.186')).toBeInTheDocument();
    expect(screen.getByText('Emissions')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/proche d'une année/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ressemble à une année/i)).toBeInTheDocument();
  });

  it('verrouille les saisies vérifiées : pas de case ni de suppression', async () => {
    await renderPage();
    expect(screen.getByLabelText('Sélectionner Effectif total')).toBeDisabled();
    expect(screen.queryByLabelText(/Supprimer Effectif total/)).toBeNull();
    expect(screen.getByLabelText('Sélectionner Émissions Scope 1')).not.toBeDisabled();
  });

  it('trie côté serveur au clic sur un en-tête', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^valeur/i }));
    await waitFor(() => expect(listCalls().at(-1)![1].params).toMatchObject({ sort_by: 'value_numeric', order: 'desc', offset: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /^valeur/i }));
    await waitFor(() => expect(listCalls().at(-1)![1].params.order).toBe('asc'));
  });

  it('pagine côté serveur', async () => {
    await renderPage();
    fireEvent.click(screen.getByLabelText('Page suivante'));
    await waitFor(() => expect(listCalls().at(-1)![1].params).toMatchObject({ limit: 25, offset: 25 }));
    expect(await screen.findByText(/Page 2 \/ 10/)).toBeInTheDocument();
  });

  it('filtre par pilier côté serveur et revient à la page 1', async () => {
    await renderPage();
    fireEvent.click(screen.getByLabelText('Page suivante'));
    fireEvent.click(screen.getByRole('button', { name: /^Social/ }));
    await waitFor(() => expect(listCalls().at(-1)![1].params).toMatchObject({ pillar: 'social', offset: 0 }));
  });
});

describe('Saisie manuelle — détail', () => {
  it('modifie une saisie non vérifiée via PUT', async () => {
    put.mockResolvedValue({ data: {} });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Émissions Scope 1/ }));
    await screen.findByRole('dialog');
    const input = document.getElementById('de-value') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/ }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/data-entry/a', expect.objectContaining({ value_numeric: 99 })));
  });

  it('affiche une saisie vérifiée en lecture seule', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Effectif total/ }));
    expect(await screen.findByText(/est verrouillée/i)).toBeInTheDocument();
    expect(document.getElementById('de-value')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Enregistrer$/ })).toBeNull();
  });
});
