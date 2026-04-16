import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock api (used by UserProfile directly for PATCH /auth/me and POST /auth/send-verification)
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Mock authService (used for changePassword)
vi.mock('@/services/authService', () => ({
  authService: {
    changePassword: vi.fn().mockResolvedValue({}),
  },
}));

// Mock lucide-react icons to avoid SVG render issues in jsdom
vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => (
    <span className={className} data-testid="icon" />
  );
  return {
    User: Icon, Mail: Icon, Briefcase: Icon, Lock: Icon, Shield: Icon,
    CheckCircle: Icon, Loader2: Icon, AlertCircle: Icon, Eye: Icon,
    EyeOff: Icon, Camera: Icon, Key: Icon, XCircle: Icon, Save: Icon,
    ExternalLink: Icon, ArrowLeft: Icon,
  };
});

// Mock BackButton (depends on useNavigate, simpler to stub)
vi.mock('@/components/common/BackButton', () => ({
  default: ({ label }: { label?: string }) => <button>{label ?? 'Retour'}</button>,
}));

import UserProfile from '@/pages/Profile/UserProfile';

// ── Store factory ─────────────────────────────────────────────────────────────

function makeStore(user: object | null = null) {
  return configureStore({
    reducer: {
      auth: (
        state = { user, isAuthenticated: !!user, isInitializing: false, loading: false, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action: any,
      ) => {
        if (action.type === 'auth/setUser') return { ...state, user: action.payload };
        return state;
      },
    },
  });
}

function renderWithStore(user: object | null = null) {
  const store = makeStore(user);
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>
    </Provider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when user is null', () => {
    // Should not throw even with no authenticated user
    expect(() => renderWithStore(null)).not.toThrow();
  });

  it('displays the page title "Mon profil"', () => {
    renderWithStore(null);
    expect(screen.getByText('Mon profil')).toBeInTheDocument();
  });

  it('displays the subtitle about personal information', () => {
    renderWithStore(null);
    expect(
      screen.getByText('Gérez vos informations personnelles et votre sécurité.'),
    ).toBeInTheDocument();
  });

  it('displays user full name derived from first_name and last_name', () => {
    const user = {
      id: 'u1',
      tenant_id: 't1',
      email: 'alice@example.com',
      first_name: 'Alice',
      last_name: 'Dupont',
      job_title: 'RSE Manager',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };
    renderWithStore(user);
    // The component builds displayName as "Alice Dupont"
    expect(screen.getAllByText('Alice Dupont').length).toBeGreaterThan(0);
  });

  it('displays user email from the Redux store', () => {
    const user = {
      id: 'u1',
      tenant_id: 't1',
      email: 'alice@example.com',
      first_name: 'Alice',
      last_name: 'Dupont',
      job_title: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };
    renderWithStore(user);
    // Email appears in the disabled email input value and in the banner text
    const emailInputs = screen.getAllByDisplayValue('alice@example.com');
    expect(emailInputs.length).toBeGreaterThan(0);
  });

  it('falls back to email as display name when first/last name are null', () => {
    const user = {
      id: 'u2',
      tenant_id: 't1',
      email: 'noname@example.com',
      first_name: null,
      last_name: null,
      job_title: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };
    renderWithStore(user);
    // When no name is set, displayName = email
    expect(screen.getAllByText('noname@example.com').length).toBeGreaterThan(0);
  });

  it('renders the "Enregistrer" button for profile form', () => {
    renderWithStore(null);
    expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument();
  });

  it('renders the "Changer de mot de passe" section heading', () => {
    renderWithStore(null);
    expect(screen.getByText('Changer de mot de passe')).toBeInTheDocument();
  });

  it('renders the "Zone de danger" section', () => {
    renderWithStore(null);
    expect(screen.getByText('Zone de danger')).toBeInTheDocument();
  });

  it('renders the 2FA section', () => {
    renderWithStore(null);
    expect(screen.getByText('Authentification à deux facteurs')).toBeInTheDocument();
  });

  it('shows "Activer la 2FA" button when mfa_enabled is false', () => {
    const user = {
      id: 'u3',
      tenant_id: 't1',
      email: 'alice@example.com',
      first_name: 'Alice',
      last_name: null,
      job_title: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      mfa_enabled: false,
    };
    renderWithStore(user);
    expect(screen.getByRole('button', { name: /Activer la 2FA/i })).toBeInTheDocument();
  });

  it('shows "Activée" badge when mfa_enabled is true', () => {
    const user = {
      id: 'u4',
      tenant_id: 't1',
      email: 'alice@example.com',
      first_name: 'Alice',
      last_name: null,
      job_title: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      mfa_enabled: true,
    };
    renderWithStore(user);
    expect(screen.getByText('Activée')).toBeInTheDocument();
  });

  it('shows email verification banner when email is not verified', () => {
    const user = {
      id: 'u5',
      tenant_id: 't1',
      email: 'unverified@example.com',
      first_name: 'Bob',
      last_name: null,
      job_title: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      email_verified_at: null,
    };
    renderWithStore(user);
    expect(screen.getByText('Email non vérifié')).toBeInTheDocument();
  });

  it('does NOT show email verification banner when email is verified', () => {
    const user = {
      id: 'u6',
      tenant_id: 't1',
      email: 'verified@example.com',
      first_name: 'Carol',
      last_name: null,
      job_title: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      email_verified_at: '2024-02-01T00:00:00Z',
    };
    renderWithStore(user);
    expect(screen.queryByText('Email non vérifié')).not.toBeInTheDocument();
  });
});
