import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get } }));

import PlatformSignups from '@/pages/Platform/PlatformSignups';

const DATA = {
  summary: { total_users: 3, total_tenants: 3, new_7d: 2, new_30d: 3, active_7d: 1, never_logged_in: 1 },
  items: [
    { user_id: 'a', email: 'anna@exemple.fr', full_name: 'Anna Martin', company: 'Martin SAS', plan_tier: 'eti', created_at: '2026-11-03T10:00:00Z', last_login_at: '2026-11-04T08:00:00Z', email_verified: true, trial_ends_at: '2026-11-17T10:00:00Z', entries_count: 12 },
    { user_id: 'b', email: 'luc@exemple.fr', full_name: 'Luc Durand', company: 'Durand SA', plan_tier: 'eti', created_at: '2026-11-02T10:00:00Z', last_login_at: null, email_verified: false, trial_ends_at: null, entries_count: 0 },
  ],
};

beforeEach(() => { get.mockClear(); });

describe('Inscriptions et activité (exploitant)', () => {
  it('affiche le résumé et les comptes, avec « Jamais » pour qui ne s’est pas connecté', async () => {
    get.mockResolvedValue({ data: DATA });
    render(<PlatformSignups />);
    expect(await screen.findByText('Anna Martin')).toBeInTheDocument();
    expect(screen.getByText('Martin SAS')).toBeInTheDocument();
    expect(screen.getByText('Jamais', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Résumé' })).toHaveTextContent('Jamais connectés');
    expect(get).toHaveBeenCalledWith('/admin/platform/signups');
  });
  it('explique l’accès réservé en cas de 403', async () => {
    get.mockImplementation(() => Promise.reject({ response: { status: 403 } }));
    render(<PlatformSignups />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Accès réservé à l’exploitant'));
  });
  it('signale une erreur de chargement', async () => {
    get.mockImplementation(() => Promise.reject(new Error('réseau')));
    render(<PlatformSignups />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger'));
  });
});
