import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @sentry/react before importing our module
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  withScope: vi.fn((cb: (scope: any) => void) => cb({ setExtras: vi.fn() })),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

describe('Sentry helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── initSentry ─────────────────────────────────────────────────────────────
  describe('initSentry', () => {
    it('does not throw when DSN is empty', async () => {
      const { initSentry } = await import('@/lib/sentry');
      expect(() => initSentry()).not.toThrow();
    });

    it('does not call Sentry.init when DSN is missing', async () => {
      const Sentry = await import('@sentry/react');
      const { initSentry } = await import('@/lib/sentry');
      initSentry();
      // VITE_SENTRY_DSN is empty in test env → init should NOT be called
      expect(Sentry.init).not.toHaveBeenCalled();
    });
  });

  // ── setSentryUser ──────────────────────────────────────────────────────────
  describe('setSentryUser', () => {
    it('calls Sentry.setUser with user data', async () => {
      const Sentry = await import('@sentry/react');
      const { setSentryUser } = await import('@/lib/sentry');
      setSentryUser({ id: 'user-123', email: 'test@esgflow.io', tenantId: 'tenant-456' });
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123', email: 'test@esgflow.io' });
    });

    it('sets tenant_id tag', async () => {
      const Sentry = await import('@sentry/react');
      const { setSentryUser } = await import('@/lib/sentry');
      setSentryUser({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
      expect(Sentry.setTag).toHaveBeenCalledWith('tenant_id', 't1');
    });
  });

  // ── clearSentryUser ────────────────────────────────────────────────────────
  describe('clearSentryUser', () => {
    it('calls Sentry.setUser(null) on logout', async () => {
      const Sentry = await import('@sentry/react');
      const { clearSentryUser } = await import('@/lib/sentry');
      clearSentryUser();
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  // ── captureError ───────────────────────────────────────────────────────────
  describe('captureError', () => {
    it('calls captureException with the error', async () => {
      const Sentry = await import('@sentry/react');
      const { captureError } = await import('@/lib/sentry');
      const err = new Error('test error');
      captureError(err);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    it('does not throw when called with a string error', async () => {
      const { captureError } = await import('@/lib/sentry');
      expect(() => captureError('string error')).not.toThrow();
    });

    it('does not throw when called with context', async () => {
      const { captureError } = await import('@/lib/sentry');
      expect(() => captureError(new Error('test'), { component: 'BillingTab', action: 'checkout' })).not.toThrow();
    });

    it('does not throw when called with undefined', async () => {
      const { captureError } = await import('@/lib/sentry');
      expect(() => captureError(undefined)).not.toThrow();
    });
  });
});
