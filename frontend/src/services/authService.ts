import api from './api';
import type { LoginRequest, LoginResponse } from '@/types/api';

/**
 * Auth service.
 *
 * Tokens are managed via httpOnly cookies set by the backend
 * (`access_token`, `refresh_token`). The frontend never reads or writes
 * tokens directly — they flow with the request automatically thanks to
 * `withCredentials: true` on the axios instance.
 *
 * This protects against XSS-based token exfiltration (cookies marked
 * httpOnly are not accessible to `document.cookie`).
 */
export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', data);
    // Tokens are now in httpOnly cookies — nothing to store client-side.
    return response.data;
  },

  async logout(): Promise<void> {
    // The backend clears both cookies. We don't keep any token client-side
    // anymore, so there is nothing to scrub locally.
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort: even on failure the user will be redirected to /login.
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, new_password: newPassword });
  },

  async updateProfile(data: { first_name?: string; last_name?: string; job_title?: string }) {
    const r = await api.patch('/auth/me', data);
    return r.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  // ── 2FA ───────────────────────────────────────────────────────────────────

  async get2FASetup(): Promise<{ secret: string; uri: string }> {
    const r = await api.get('/auth/2fa/setup');
    return r.data;
  },

  async enable2FA(totpCode: string): Promise<{ backup_codes: string[] }> {
    const r = await api.post('/auth/2fa/enable', { totp_code: totpCode });
    return r.data;
  },

  async disable2FA(password: string): Promise<void> {
    await api.post('/auth/2fa/disable', { password });
  },

  async verify2FA(tempToken: string, totpCode: string): Promise<LoginResponse> {
    const r = await api.post<LoginResponse>('/auth/2fa/verify', {
      temp_token: tempToken,
      totp_code: totpCode,
    });
    // Tokens set via httpOnly cookies by the backend.
    return r.data;
  },
};
