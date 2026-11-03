import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/Analytics/IntelligenceDashboard', () => ({ default: () => <div>contenu-analyse</div> }));
vi.mock('@/pages/Analytics/AIInsights', () => ({ default: ({ embedded }: { embedded?: boolean }) => <div>contenu-reco{embedded ? '-integre' : ''}</div> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }) }));

import InsightsIA from '@/pages/Analytics/InsightsIA';

const Where = () => { const l = useLocation(); return <p data-testid="url">{l.pathname + l.search}</p>; };
const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><InsightsIA /><Where /></MemoryRouter>);

describe('Insights IA — deux onglets', () => {
  it('ouvre l’analyse par défaut', async () => {
    renderAt('/app/intelligence');
    expect(await screen.findByText('contenu-analyse')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Analyse' })).toHaveAttribute('aria-selected', 'true');
  });
  it('?tab=recommandations ouvre les recommandations, en mode intégré (sans second en-tête)', async () => {
    renderAt('/app/intelligence?tab=recommandations');
    expect(await screen.findByText('contenu-reco-integre')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recommandations' })).toHaveAttribute('aria-selected', 'true');
  });
  it('changer d’onglet met l’URL à jour (lien partageable)', async () => {
    renderAt('/app/intelligence');
    await screen.findByText('contenu-analyse');
    fireEvent.click(screen.getByRole('tab', { name: 'Recommandations' }));
    expect(await screen.findByText('contenu-reco-integre')).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/app/intelligence?tab=recommandations');
    fireEvent.click(screen.getByRole('tab', { name: 'Analyse' }));
    expect(await screen.findByText('contenu-analyse')).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent(/^\/app\/intelligence$/);
  });
});
