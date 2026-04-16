import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by vitest, so the factory must be
// self-contained. We import the mocked module after the vi.mock declarations
// to get references to the spies.

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { items: [] } }),
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon" />
  );
  return {
    Calculator: Icon, CheckCircle: Icon, TrendingUp: Icon, TrendingDown: Icon,
    Leaf: Icon, Users: Icon, Scale: Icon, ArrowLeft: Icon,
  };
});

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('2026-04-15'),
}));

vi.mock('@/components/common/Card', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/common/Button', () => ({
  default: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/common/Spinner', () => ({
  default: ({ size }: { size?: string }) => <span data-testid={`spinner-${size ?? 'default'}`} />,
}));

vi.mock('@/components/charts/RadarChart', () => ({
  default: () => <div data-testid="radar-chart" />,
}));

// Import mocked module AFTER vi.mock calls so we get the spy references
import api from '@/services/api';
import ScoreCalculation from '@/pages/Scores/ScoreCalculation';

// Typed references to the mocked functions
const mockedApiGet = api.get as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderComponent() {
  return render(
    <MemoryRouter>
      <ScoreCalculation />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScoreCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiGet.mockResolvedValue({ data: { items: [] } });
  });

  it('renders without crashing', async () => {
    expect(() => renderComponent()).not.toThrow();
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledWith('/organizations'));
  });

  it('displays the page heading "Calcul de Score ESG"', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText('Calcul de Score ESG')).toBeInTheDocument(),
    );
  });

  it('displays the "Calcul ESG" badge', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText('Calcul ESG')).toBeInTheDocument(),
    );
  });

  it('displays the organisation selector after loading', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByTitle('Sélectionner une organisation')).toBeInTheDocument(),
    );
    const select = screen.getByTitle('Sélectionner une organisation');
    expect(select.tagName).toBe('SELECT');
  });

  it('includes "Toutes les organisations" as default option', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText('Toutes les organisations')).toBeInTheDocument(),
    );
  });

  it('renders organisation options when API returns data', async () => {
    mockedApiGet.mockResolvedValueOnce({
      data: {
        items: [
          { id: 'org-1', name: 'Acme Corp' },
          { id: 'org-2', name: 'GreenTech' },
        ],
      },
    });
    renderComponent();
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());
    expect(screen.getByText('GreenTech')).toBeInTheDocument();
  });

  it('renders a date input for the calculation date', async () => {
    renderComponent();
    await waitFor(() => {
      const dateInput = screen.getByTitle('Date de calcul du score ESG');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });
  });

  it('renders the "Calculer le Score" button', async () => {
    renderComponent();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Calculer le Score/i }),
      ).toBeInTheDocument(),
    );
  });

  it('"Calculer le Score" button is enabled when a date is present', async () => {
    renderComponent();
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Calculer le Score/i });
      expect(btn).not.toBeDisabled();
    });
  });

  it('shows the "Aucun résultat" placeholder before any calculation', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText('Aucun résultat')).toBeInTheDocument(),
    );
  });

  it('shows the "Paramètres de calcul" section heading', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText('Paramètres de calcul')).toBeInTheDocument(),
    );
  });

  it('calls GET /organizations on mount', async () => {
    renderComponent();
    await waitFor(() =>
      expect(mockedApiGet).toHaveBeenCalledWith('/organizations'),
    );
  });
});
