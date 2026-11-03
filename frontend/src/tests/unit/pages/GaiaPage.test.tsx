import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const result = {
  company: 'Entreprise X', report_title: 'Rapport RSE 2024', reporting_year: '2024', summary: 'Scope 1 et 2 publiés ; scope 3 absent.',
  maturity_score: 58, maturity_comment: 'Démarche encore partielle.',
  indicators: [
    { name: 'Émissions scope 1', value: '1 150', unit: 'tCO2e', year: '2024', page: 24 },
    { name: 'Émissions scope 3', value: null, unit: null, year: null, page: null },
  ],
  esrs_coverage: [
    { standard: 'ESRS E1', label: 'Changement climatique', coverage: 'complete', score: 90, evidence: 'Scopes 1 et 2 chiffrés.' },
    { standard: 'ESRS E3', label: 'Eau', coverage: 'absent', score: 0, evidence: '' },
  ],
  strengths: ['Scopes 1 et 2 publiés'], gaps: ['Scope 3 non chiffré'],
  recommendations: [{ priority: 'haute', action: 'Chiffrer le scope 3' }],
  flags: [{ claim: 'Neutralité carbone 2030', why: 'Aucun plan détaillé.', page: 12 }],
};
const done = { id: 'a1', filename: 'rse-2024.pdf', status: 'done', page_count: 68, created_at: '2026-11-02T10:00:00Z', company: 'Entreprise X', reporting_year: '2024', maturity_score: 58, result };
const summary = { id: 'a1', filename: 'rse-2024.pdf', status: 'done', page_count: 68, created_at: done.created_at, company: 'Entreprise X', reporting_year: '2024', maturity_score: 58 };

const svc = vi.hoisted(() => ({ listAnalyses: vi.fn(), getAnalysis: vi.fn(), uploadReport: vi.fn(), askGaia: vi.fn(), deleteAnalysis: vi.fn() }));
vi.mock('@/services/gaiaService', () => ({ ...svc, gaiaErrorMessage: (_e: unknown, f: string) => f }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }) }));

import GaiaPage from '@/pages/Gaia/GaiaPage';
const renderPage = () => render(<MemoryRouter><GaiaPage /></MemoryRouter>);

beforeEach(() => {
  Object.values(svc).forEach(f => f.mockReset());
  svc.listAnalyses.mockResolvedValue([summary]);
  svc.getAnalysis.mockResolvedValue(structuredClone(done));
  svc.askGaia.mockResolvedValue('Le scope 1 est de 1 150 tCO2e (p. 24).');
  svc.deleteAnalysis.mockResolvedValue(undefined);
});

const openAnalysis = async () => { renderPage(); fireEvent.click(await screen.findByRole('button', { name: /^Entreprise X/ })); await screen.findByRole('tablist'); };

describe('Gaïa — état vide', () => {
  it('un seul état vide, qui dit quoi faire, et pas de carte « Analyses récentes » vide', async () => {
    svc.listAnalyses.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Analysez un rapport en 30 secondes')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Analyses récentes')).toBeNull());
    expect(screen.queryByText(/Aucune analyse pour le moment/)).toBeNull();
    expect(screen.queryByText(/Aucune analyse sélectionnée/)).toBeNull();
  });
});

describe('Gaïa — résultat à onglets', () => {
  it('affiche la provenance IA et la synthèse', async () => {
    await openAnalysis();
    expect(screen.getByText('Généré par IA · à vérifier')).toBeInTheDocument();
    expect(screen.getByText('Scope 1 et 2 publiés ; scope 3 absent.')).toBeInTheDocument();
  });
  it('les onglets sont Synthèse, Chiffres, ESRS, Écarts, Question', async () => {
    await openAnalysis();
    const names = within(screen.getByRole('tablist')).getAllByRole('tab').map(t => t.textContent);
    expect(names).toEqual(['Synthèse', 'Chiffres clés2', 'Couverture ESRS2', 'Écarts et vigilance2', 'Poser une question']);
  });
  it('chiffres : la page est affichée, et une valeur absente est « Non publié »', async () => {
    await openAnalysis();
    fireEvent.click(screen.getByRole('tab', { name: /Chiffres clés/ }));
    expect(screen.getByText('1 150 tCO2e')).toBeInTheDocument();
    expect(screen.getByText('p. 24')).toBeInTheDocument();
    expect(screen.getByText('Non publié')).toBeInTheDocument();
    expect(screen.getByText(/1 indicateur\(s\) ne sont pas chiffrés/)).toBeInTheDocument();
  });
  it('ESRS : décompte textuel et codes courts', async () => {
    await openAnalysis();
    fireEvent.click(screen.getByRole('tab', { name: /Couverture ESRS/ }));
    expect(screen.getByText(/1 norme complète, 0 partielle, 1 absente sur 2 analysées/)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Couverture par norme' })).getByText('E1')).toBeInTheDocument();
  });
  it('écarts : lien vers la collecte et page des points de vigilance', async () => {
    await openAnalysis();
    fireEvent.click(screen.getByRole('tab', { name: /Écarts et vigilance/ }));
    expect(screen.getByRole('link', { name: /Renseigner ces données/ })).toHaveAttribute('href', '/app/data-entry');
    expect(screen.getByText('p. 12')).toBeInTheDocument();
  });
  it('question : envoie et affiche la réponse', async () => {
    await openAnalysis();
    fireEvent.click(screen.getByRole('tab', { name: /Poser une question/ }));
    fireEvent.click(screen.getByRole('button', { name: /Quelles sont les émissions/ }));
    expect(await screen.findByText(/Le scope 1 est de 1 150 tCO2e/)).toBeInTheDocument();
    expect(svc.askGaia).toHaveBeenCalledWith('a1', expect.stringContaining('émissions'));
  });
});

describe('Gaïa — suppression et échec', () => {
  it('demande confirmation avant de supprimer', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Supprimer Entreprise X/ }));
    expect(await screen.findByText(/Supprimer cette analyse/)).toBeInTheDocument();
    expect(svc.deleteAnalysis).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(svc.deleteAnalysis).toHaveBeenCalledWith('a1'));
  });
  it('un PDF illisible : message clair et nouvelle tentative', async () => {
    svc.getAnalysis.mockResolvedValue({ ...done, status: 'failed', error: 'Aucun texte extrait.', result: null });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Entreprise X/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun texte extrait.');
    expect(screen.getByText(/Si le PDF est un scan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir un autre fichier' })).toBeInTheDocument();
  });
});
