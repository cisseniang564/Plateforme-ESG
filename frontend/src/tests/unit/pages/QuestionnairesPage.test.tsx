import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const detail = {
  id: 'q1', title: 'RSE 2025.xlsx', client_name: 'Groupe Exemple', status: 'ready', created_at: '2025-10-28T10:00:00Z',
  counts: { total: 3, validated: 1, prefilled: 1, to_complete: 1 }, error: null,
  questions: [
    { id: 'a', section: 'Climat', text: 'Émissions de scope 1 ?', answer_type: 'number', answer: '1 280 tCO2e', status: 'prefilled', confidence: 'high',
      sources: [{ label: 'Émissions Scope 1', value: '1280', unit: 'tCO2e', period: '2024', verified: true }], note: null },
    { id: 'b', section: 'Social', text: 'Effectif total ?', answer_type: 'number', answer: '340', status: 'validated', confidence: 'high', sources: [], note: null },
    { id: 'c', section: 'Gouvernance', text: 'Politique anticorruption ?', answer_type: 'yes_no', answer: null, status: 'to_complete', confidence: null, sources: [], note: null },
  ],
};
const summary = { id: 'q1', title: detail.title, client_name: detail.client_name, status: 'ready', created_at: detail.created_at, counts: detail.counts };

const svc = vi.hoisted(() => ({
  listQuestionnaires: vi.fn(), getQuestionnaire: vi.fn(), saveAnswers: vi.fn(), exportQuestionnaire: vi.fn(),
  createQuestionnaire: vi.fn(), deleteQuestionnaire: vi.fn(),
}));
vi.mock('@/services/questionnaireService', () => ({ ...svc, questionnaireErrorMessage: (_e: unknown, f: string) => f }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import QuestionnairesPage from '@/pages/Questionnaires/QuestionnairesPage';

const renderPage = () => render(<MemoryRouter><QuestionnairesPage /></MemoryRouter>);

beforeEach(() => {
  Object.values(svc).forEach(f => f.mockReset());
  svc.listQuestionnaires.mockResolvedValue([summary]);
  svc.exportQuestionnaire.mockResolvedValue(undefined);
  svc.getQuestionnaire.mockResolvedValue(structuredClone(detail));
  svc.saveAnswers.mockImplementation(async (_id: string, answers: Record<string, { answer: string | null; status: string }>) => ({
    ...detail, questions: detail.questions.map(q => ({ ...q, ...(answers[q.id] ?? {}) })),
  }));
});

async function openDetail() {
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: /^RSE 2025\.xlsx/ }));
  await screen.findByRole('list', { name: 'Avancement' });
}

describe('Questionnaires — liste', () => {
  it('affiche l’avancement de chaque questionnaire', async () => {
    renderPage();
    expect(await screen.findByText(/1\/3 validées · 1 à relire · 1 à compléter/)).toBeInTheDocument();
  });
  it('sans questionnaire : explique les trois étapes', async () => {
    svc.listQuestionnaires.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Aucun questionnaire pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText(/Vous relisez, complétez, puis exportez en Excel/)).toBeInTheDocument();
  });
});

describe('Questionnaires — relecture', () => {
  it('ouvre la première question à traiter, avec sa source cliquable', async () => {
    await openDetail();
    expect(screen.getByRole('heading', { level: 2, name: 'Émissions de scope 1 ?' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Ouvrir la donnée/ });
    expect(link).toHaveAttribute('href', '/app/data-entry?search=%C3%89missions%20Scope%201');
    expect(screen.getByText('Vérifiée')).toBeInTheDocument();
    expect(screen.getByText('Confiance élevée')).toBeInTheDocument();
  });
  it('indique l’étape 3 (relecture) et la part déjà préparée', async () => {
    await openDetail();
    const steps = screen.getByRole('list', { name: 'Avancement' });
    expect(within(steps).getByText('Relecture').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/67 % des réponses sont déjà préparées/)).toBeInTheDocument();
  });
  it('« Valider et passer à la suivante » valide puis ouvre la question restante', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: /Valider et passer à la suivante/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Politique anticorruption ?' })).toBeInTheDocument();
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
  });
  it('une question sans réponse ne peut pas être validée et propose de saisir la donnée', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: /Question 3/ }));
    expect(screen.getByRole('button', { name: /Valider et passer à la suivante/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Saisir la donnée' })).toBeInTheDocument();
  });
  it('Exporter enregistre d’abord les modifications', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: /Valider et passer à la suivante/ }));
    fireEvent.click(screen.getByRole('button', { name: /Exporter en Excel/ }));
    await waitFor(() => expect(svc.exportQuestionnaire).toHaveBeenCalled());
    expect(svc.saveAnswers).toHaveBeenCalledTimes(1);
    expect(svc.saveAnswers.mock.invocationCallOrder[0]).toBeLessThan(svc.exportQuestionnaire.mock.invocationCallOrder[0]);
  });
  it('une fois tout validé, l’export devient l’étape en cours', async () => {
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: /Valider et passer à la suivante/ }));
    fireEvent.click(screen.getByRole('button', { name: /Question 3/ }));
    fireEvent.change(screen.getByLabelText(/Votre réponse/), { target: { value: 'Oui' } });
    const steps = screen.getByRole('list', { name: 'Avancement' });
    expect(within(steps).getByText('Export').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});

describe('Questionnaires — échec', () => {
  it('propose de coller les questions quand le fichier est illisible', async () => {
    svc.getQuestionnaire.mockResolvedValue({ ...detail, status: 'failed', error: 'Aucune question détectée.', questions: [] });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^RSE 2025\.xlsx/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucune question détectée.');
    fireEvent.click(screen.getByRole('button', { name: 'Coller les questions' }));
    expect(await screen.findByLabelText('Questions à coller')).toBeInTheDocument();
  });
});
