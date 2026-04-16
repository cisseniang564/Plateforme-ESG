import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '@/services/authService';

// Mock the api module (default export)
vi.mock('@/services/api', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
    },
  };
});

import api from '@/services/api';

const mockedApi = api as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const mockUser = {
  id: 'user-123',
  tenant_id: 'tenant-456',
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Dupont',
  job_title: 'RSE Manager',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockTokens = {
  access_token: 'access-abc',
  refresh_token: 'refresh-xyz',
  token_type: 'bearer' as const,
  expires_in: 3600,
};

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns the LoginResponse on success', async () => {
      const loginResponse = { user: mockUser, tokens: mockTokens };
      mockedApi.post.mockResolvedValueOnce({ data: loginResponse });

      const result = await authService.login({ email: 'alice@example.com', password: 'Secret1!' });

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'alice@example.com',
        password: 'Secret1!',
      });
      expect(result).toEqual(loginResponse);
    });

    it('stores access_token and refresh_token in localStorage on success', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { user: mockUser, tokens: mockTokens } });

      await authService.login({ email: 'alice@example.com', password: 'Secret1!' });

      expect(localStorage.getItem('access_token')).toBe('access-abc');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-xyz');
    });

    it('does not store tokens when response has no tokens field (2FA required)', async () => {
      const twoFaResponse = { user: mockUser, requires_2fa: true, temp_token: 'tmp-tok' };
      mockedApi.post.mockResolvedValueOnce({ data: twoFaResponse });

      await authService.login({ email: 'alice@example.com', password: 'Secret1!' });

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('throws on network / HTTP error', async () => {
      const error = new Error('Network Error');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(
        authService.login({ email: 'bad@example.com', password: 'wrong' }),
      ).rejects.toThrow('Network Error');
    });

    it('throws on 401 Unauthorized', async () => {
      const apiError = { response: { status: 401, data: { detail: 'Invalid credentials' } } };
      mockedApi.post.mockRejectedValueOnce(apiError);

      await expect(
        authService.login({ email: 'alice@example.com', password: 'WrongPass1' }),
      ).rejects.toMatchObject({ response: { status: 401 } });
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('calls POST /auth/logout', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('removes access_token from localStorage on success', async () => {
      localStorage.setItem('access_token', 'old-token');
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('removes refresh_token from localStorage on success', async () => {
      localStorage.setItem('refresh_token', 'old-refresh');
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('still clears localStorage even when API call fails', async () => {
      localStorage.setItem('access_token', 'stale-token');
      localStorage.setItem('refresh_token', 'stale-refresh');
      mockedApi.post.mockRejectedValueOnce(new Error('Server error'));

      // logout uses try/finally so it should always clean up
      await expect(authService.logout()).rejects.toThrow();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  // ── getCurrentUser ─────────────────────────────────────────────────────────

  describe('getCurrentUser()', () => {
    it('returns the user data from /auth/me', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(mockedApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('throws when the API returns an error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('calls POST /auth/forgot-password with the email', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await authService.forgotPassword('alice@example.com');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'alice@example.com',
      });
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('calls POST /auth/reset-password with token and new password', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await authService.resetPassword('reset-tok', 'NewPass1!');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-tok',
        new_password: 'NewPass1!',
      });
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('calls POST /auth/change-password with correct payload', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok' } });

      const result = await authService.changePassword('OldPass1', 'NewPass1!');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/change-password', {
        current_password: 'OldPass1',
        new_password: 'NewPass1!',
      });
      expect(result).toEqual({ message: 'ok' });
    });

    it('throws when current password is wrong', async () => {
      const err = { response: { status: 400, data: { detail: 'Mot de passe actuel incorrect.' } } };
      mockedApi.post.mockRejectedValueOnce(err);

      await expect(authService.changePassword('WrongPass', 'NewPass1!')).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────────────

  describe('updateProfile()', () => {
    it('calls PATCH /auth/me and returns updated user data', async () => {
      const updated = { ...mockUser, first_name: 'Bob' };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      const result = await authService.updateProfile({ first_name: 'Bob' });

      expect(mockedApi.patch).toHaveBeenCalledWith('/auth/me', { first_name: 'Bob' });
      expect(result).toEqual(updated);
    });
  });

  // ── verify2FA ─────────────────────────────────────────────────────────────

  describe('verify2FA()', () => {
    it('stores tokens after successful 2FA verification', async () => {
      const loginResponse = { user: mockUser, tokens: mockTokens };
      mockedApi.post.mockResolvedValueOnce({ data: loginResponse });

      const result = await authService.verify2FA('tmp-token', '123456');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/2fa/verify', {
        temp_token: 'tmp-token',
        totp_code: '123456',
      });
      expect(localStorage.getItem('access_token')).toBe('access-abc');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-xyz');
      expect(result).toEqual(loginResponse);
    });
  });
});
