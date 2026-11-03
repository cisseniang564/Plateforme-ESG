import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gaia = vi.hoisted(() => ({ listAnalyses: vi.fn(), getAnalysis: vi.fn(), uploadReport: vi.fn(), askGaia: vi.fn(), deleteAnalysis: vi.fn() }));
const quest = vi.hoisted(() => ({ listQuestionnaires: vi.fn(), getQuestionnaire: vi.fn(), saveAnswers: vi.fn(), exportQuestionnaire: vi.fn(), createQuestionnaire: vi.fn(), deleteQuestionnaire: vi.fn() }));
vi.mock('@/services/gaiaService', () => ({ ...gaia, gaiaErrorMessage: (_e: unknown, f: string) => f }));
vi.mock('@/services/questionnaireService', () => ({ ...quest, questionnaireErrorMessage: (_e: unknown, f: string) => f }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }) }));

import GaiaPage from '@/pages/Gaia/GaiaPage';
import QuestionnairesPage from '@/pages/Questionnaires/QuestionnairesPage';

beforeEach(() => {
  Object.values(gaia).forEach(f => f.mockReset());
  Object.values(quest).forEach(f => f.mockReset());
  toast.mockReset();
  gaia.listAnalyses.mockResolvedValue([]);
  quest.listQuestionnaires.mockResolvedValue([]);
});

describe('Gaïa : exemple de démonstration', () => {
  it('ouvre une analyse fictive, étiquetée, sans appel serveur ni questions', async () => {
    render(<MemoryRouter><GaiaPage /></MemoryRouter>);
    fireEvent.click((await screen.findAllByRole('button', { name: /Voir un exemple/ }))[0]);
    expect(await screen.findByText(/Exemple fictif\./)).toBeInTheDocument();
    expect(screen.getByText(/Exemple Industries SA \(fictive\)/)).toBeInTheDocument();
    expect(gaia.getAnalysis).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: /Poser une question/ }));
    expect(screen.getByText(/disponibles sur vos propres rapports/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument();
  });
});

describe('Questionnaires : exemple de démonstration', () => {
  it('ouvre un questionnaire fictif, étiqueté, sans enregistrement ni export', async () => {
    render(<MemoryRouter><QuestionnairesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Voir un exemple de questionnaire/ }));
    expect(await screen.findByText(/Exemple fictif\./)).toBeInTheDocument();
    expect(screen.getByText(/Client Exemple \(fictif\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exporter en Excel/ }));
    expect(quest.exportQuestionnaire).not.toHaveBeenCalled();
    expect(quest.saveAnswers).not.toHaveBeenCalled();
  });
});
