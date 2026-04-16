/**
 * Sentry — Error monitoring & performance tracing
 * Initialize before React renders.
 */
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '0.1.0';

export function initSentry() {
  // Skip in development or if DSN is not configured
  if (!DSN || DSN === 'REPLACE_ME' || ENV === 'development') {
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: `esgflow-frontend@${RELEASE}`,

    // Performance monitoring — 10% in production, 100% in staging
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

    // Replay — capture 0.1% of sessions, 100% on error
    replaysSessionSampleRate: 0.001,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter noise
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network Error',
      'Load failed',
      /ChunkLoadError/,
      /Loading chunk \d+ failed/,
    ],

    beforeSend(event) {
      // Strip sensitive data from breadcrumbs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const crumbs = (event.breadcrumbs as any)?.values as Array<{ data?: { url?: string } }> | undefined;
      if (crumbs) {
        crumbs.forEach((b) => {
          if (b.data?.url?.includes('password')) {
            b.data.url = b.data.url.replace(/password=[^&]+/, 'password=[FILTERED]');
          }
        });
      }
      return event;
    },
  });
}

/** Attach user context after login */
export function setSentryUser(user: { id: string; email: string; tenantId: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
  Sentry.setTag('tenant_id', user.tenantId);
}

/** Clear user on logout */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/** Manually capture an error with optional context */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export { Sentry };
