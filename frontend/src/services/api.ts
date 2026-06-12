import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';

// In production, VITE_API_URL is set to '/api/v1' by .env.production.
// Fallback to '/api/v1' (relative) so nginx always proxies correctly even
// if .env.production is missing from the server build environment.
// In development, Vite proxies '/api' → 'http://localhost:8000' (vite.config.ts).
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  // Send the httpOnly access_token / refresh_token cookies on every request.
  // The backend prefers Authorization headers when present, then falls back
  // to cookies (see app.middleware.auth_middleware._extract_token).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token refresh state ───────────────────────────────────────────────────
let isRefreshing = false;

// Queue of { resolve, reject } for requests that arrived while a refresh was in progress.
// On successful refresh they are replayed; on failure they are rejected.
type QueueEntry = { resolve: () => void; reject: (err: unknown) => void };
let failedQueue: QueueEntry[] = [];

function processQueue(err: unknown) {
  failedQueue.forEach((entry) => {
    if (err) entry.reject(err);
    else entry.resolve();
  });
  failedQueue = [];
}

const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
};

// ─── Response interceptor — handle 401 with queued refresh ───────────────
//
// Refresh flow with cookies:
//   1. Request fails with 401 (access_token cookie expired)
//   2. POST /auth/refresh — the refresh_token cookie travels automatically
//   3. Backend validates refresh, sets a NEW access_token cookie in the response
//   4. We replay the original request — the new cookie is already in place
//
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Network-level failure (no response from server) — propagate as-is.
    if (!error.response) {
      return Promise.reject(error);
    }

    // ── 401 Unauthorized ──────────────────────────────────────────────────
    if (error.response.status === 401 && !originalRequest?._retry) {
      // Never refresh on auth routes themselves.
      if (isAuthRoute(originalRequest?.url)) {
        return Promise.reject(error);
      }

      // A refresh is already in progress — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject,
          });
        });
      }

      // Start the refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // No body needed — backend reads the refresh_token from the httpOnly cookie.
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        // Cookie has been rotated server-side; replay queued + original.
        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — every queued request will reject.
        processQueue(refreshError);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    // ── 402 — premium feature gate ─────────────────────────────────────────
    if (error.response?.status === 402) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
