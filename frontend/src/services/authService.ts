import api from './api';
import type { LoginRequest, LoginResponse } from '@/types/api';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', data);
    
    // Stocker les tokens dans localStorage
    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
    }
    
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
    if (r.data.tokens) {
      localStorage.setItem('access_token', r.data.tokens.access_token);
      localStorage.setItem('refresh_token', r.data.tokens.refresh_token);
    }
    return r.data;
  },
};
