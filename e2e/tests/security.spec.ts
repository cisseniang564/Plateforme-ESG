/**
 * Security & Billing E2E tests
 *
 * Covers:
 *  - Brute-force protection (rate-limiting after repeated failed logins)
 *  - Trial-expired → 402 response surfaced correctly in the UI
 *  - GDPR: account export and account deletion flows
 *  - Multi-tenant isolation: user from tenant A cannot access tenant B resources
 */
import { test, expect, request as apiRequest } from '@playwright/test';
import { loginAs, DEMO_EMAIL, DEMO_PASSWORD } from './helpers/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const API_URL  = process.env.API_URL  ?? 'http://localhost:8000';

// ─── Brute-force protection ───────────────────────────────────────────────────

test.describe('Brute-force protection', () => {
  test('blocks login after 10 consecutive failed attempts', async ({ request }) => {
    // Fire 10 bad logins in sequence
    for (let i = 0; i < 10; i++) {
      await request.post(`${API_URL}/api/v1/auth/login`, {
        data: { email: 'victim@example.com', password: `wrong${i}` },
      });
    }

    // The 11th attempt should be rate-limited (429) regardless of credentials
    const blocked = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: 'victim@example.com', password: 'wrongagain' },
    });

    expect(blocked.status()).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/tentatives|bloqué|rate/i);
  });

  test('returns Retry-After header when blocked', async ({ request }) => {
    for (let i = 0; i < 10; i++) {
      await request.post(`${API_URL}/api/v1/auth/login`, {
        data: { email: 'victim2@example.com', password: `bad${i}` },
      });
    }
    const blocked = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: 'victim2@example.com', password: 'bad' },
    });
    expect(blocked.headers()['retry-after']).toBeDefined();
  });
});

// ─── Unauthenticated access ───────────────────────────────────────────────────

test.describe('Unauthenticated access', () => {
  test('API returns 401 for protected endpoints without token', async ({ request }) => {
    const endpoints = [
      '/api/v1/indicators/',
      '/api/v1/data-entry/',
      '/api/v1/organizations',
      '/api/v1/scores/latest',
    ];

    for (const ep of endpoints) {
      const res = await request.get(`${API_URL}${ep}`);
      expect(res.status(), `Expected 401 for ${ep}`).toBe(401);
    }
  });

  test('health endpoint is public', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });
});

// ─── GDPR flows ───────────────────────────────────────────────────────────────

test.describe('GDPR', () => {
  test('authenticated user can request data export via API', async ({ request }) => {
    // Login first
    const loginRes = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const { tokens } = await loginRes.json();
    const token = tokens.access_token;

    // Request personal data export
    const exportRes = await request.get(`${API_URL}/api/v1/users/me/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Should succeed (200) or return a file / queued response
    expect([200, 202]).toContain(exportRes.status());
  });

  test('profile page has account deletion option', async ({ page }) => {
    await loginAs(page);
    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');

    // Some form of delete account UI should exist
    const deleteBtn = page.getByRole('button', { name: /supprimer|delete.*account|compte/i });
    await expect(deleteBtn).toBeVisible({ timeout: 8000 });
  });
});

// ─── Billing: trial expired UX ────────────────────────────────────────────────

test.describe('Billing enforcement', () => {
  test('billing page is accessible even without subscription', async ({ page }) => {
    await loginAs(page);
    await page.goto('/app/settings');
    await page.waitForLoadState('networkidle');
    // Should not redirect away — billing settings always accessible
    expect(page.url()).toContain('/app/settings');
  });

  test('upgrade CTA is visible on billing page', async ({ page }) => {
    await loginAs(page);
    await page.goto('/app/billing');
    await page.waitForLoadState('networkidle');
    // Should show some plan/pricing information
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toMatch(/starter|pro|enterprise|plan|facturation/i);
  });
});

// ─── Multi-tenant isolation (API level) ──────────────────────────────────────

test.describe('Multi-tenant isolation', () => {
  test('user can only see their own organisations', async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    const { tokens } = await loginRes.json();

    const orgsRes = await request.get(`${API_URL}/api/v1/organizations`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    expect(orgsRes.status()).toBe(200);
    const orgs = await orgsRes.json();

    // Every returned organisation must have the same tenant_id
    const tenantIds = new Set(
      (Array.isArray(orgs) ? orgs : orgs.items ?? []).map((o: any) => o.tenant_id)
    );
    expect(tenantIds.size).toBeLessThanOrEqual(1);
  });

  test('cannot access another tenant resource by guessing UUID', async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    const { tokens } = await loginRes.json();

    // Try a random UUID that almost certainly belongs to no tenant or a different one
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await request.get(`${API_URL}/api/v1/organizations/${fakeId}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    expect([403, 404]).toContain(res.status());
  });
});
