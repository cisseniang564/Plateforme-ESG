import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const issue = (id: string, name: string, category: string, fin: number, esg: number, extra: Record<string, unknown> = {}) => ({
  id, name, category, financial_impact: fin, esg_impact: esg, is_material: fin > 60 || esg > 60, priority: 'medium', ...extra,
});

// Catégories atypiques, comme sur la capture : aucune ne s'écrit « environmental ».
const ISSUES = [
  issue('a', 'Protection des données', 'G1', 92, 88, { esrs_topic: 'G1', iro_type: 'risk' }),
  issue('b', 'Émissions de GES', 'ESG', 78, 92, { esrs_topic: 'E1' }),
  issue('c', 'Attraction des talents', 'Social', 88, 76),
  issue('d', 'Déchets informatiques', 'divers', 36, 20),
];

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn((url: string) => Promise.resolve({ data: url.includes('issues') ? ISSUES : [] })),
    post: vi.fn(), put: vi.fn(), delete: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
// Traductions françaises réelles : le test lit ce que verrait l'utilisateur.
vi.mock('react-i18next', async () => {
  const fr = (await import('@/i18n/locales/fr.json')).default as Record<string, unknown>;
  const lookup = (key: string): string | undefined =>
    key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), fr) as string | undefined;
  return {
    useTranslation: () => ({
      t: (key: string, d?: unknown) => lookup(key) ?? (typeof d === 'string' ? d : key),
      i18n: { language: 'fr' },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
  };
});

import MaterialityMatrix from '@/pages/Materiality/MaterialityMatrix';

async function renderPage() {
  render(<MemoryRouter><MaterialityMatrix /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Évaluation en cours')).toBeInTheDocument());
}

describe('Matrice de matérialité', () => {
  beforeEach(() => vi.clearAllMocks());

  it('range chaque enjeu dans son pilier, même avec une catégorie atypique, et garde un total juste', async () => {
    await renderPage();
    const table = screen.getByText('Enjeux par catégorie et matérialité').closest('div')!;
    const rows = within(table).getAllByRole('row');
    const cell = (label: string) => rows.find(r => within(r).queryByText(label))!;
    // E1 (ESG + sujet E1) → environnement ; Social ; G1 → gouvernance ; « divers » → Non classé
    expect(within(cell('Non classé')).getAllByRole('cell').map(c => c.textContent)).toEqual(['Non classé', '0', '1', '1']);
    const row = (label: string) => within(cell(label)).getAllByRole('cell').map(c => c.textContent);
    expect(row('Environnemental')).toEqual(['Environnemental', '1', '0', '1']);
    expect(row('Social')).toEqual(['Social', '1', '0', '1']);
    expect(row('Gouvernance')).toEqual(['Gouvernance', '1', '0', '1']);
    // Le pied de tableau compte les 4 enjeux : plus d'enjeux « perdus » hors des trois piliers.
    const footer = rows.find(r => r.closest('tfoot'))!;
    expect(within(footer).getAllByRole('cell').map(c => c.textContent)).toEqual(['Total', '3', '1', '4']);
  });

  it('numérote le graphique comme le tableau des enjeux (rang par score)', async () => {
    await renderPage();
    // Le plus fort score cumulé (Protection des données) porte le n°1 partout.
    const topics = screen.getByText('Enjeu', { selector: 'th' }).closest('table')!;
    const firstRow = within(topics).getAllByRole('row')[1];
    expect(within(firstRow).getByText('1')).toBeInTheDocument();
    expect(firstRow).toHaveTextContent('Protection des données');
  });

  it('filtre par recherche et signale ce qu\'il reste à documenter', async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText('Rechercher un enjeu…'), { target: { value: 'talents' } });
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Liste' }));
    expect(screen.getByText('Attraction des talents')).toBeInTheDocument();
    expect(screen.queryByText('Émissions de GES')).not.toBeInTheDocument();
    expect(screen.getByText(/À documenter/)).toHaveTextContent('justification');
  });
});

describe('Validation par la direction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('propose de valider une matrice jamais validée, et exige l\'attestation et la fonction', async () => {
    await renderPage();
    expect(screen.getByText(/n'a pas encore été validée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Valider la matrice' }));
    const dialog = screen.getByRole('dialog', { name: 'Valider la matrice' });
    const submit = within(dialog).getByRole('button', { name: 'Valider' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Fonction'), { target: { value: 'Direction générale' } });
    expect(submit).toBeDisabled();                                   // il manque l'attestation
    fireEvent.click(within(dialog).getByLabelText(/J'atteste/));
    expect(submit).toBeEnabled();
  });
});
