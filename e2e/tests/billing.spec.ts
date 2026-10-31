import { test, expect } from '@playwright/test';
import { apiToken } from './helpers/session';

test.describe('Abonnement (API)', () => {
  test('les informations d\'abonnement sont renvoyées', async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get('/api/v1/billing/subscription', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toHaveProperty('plan_tier');
  });

  test('les fonctions du plan sont renvoyées avec leurs quotas', async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get('/api/v1/billing/features', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('features');
    expect(body.max_users).toBeGreaterThan(0);
  });

  test('un paiement sans plan valide est refusé', async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.post('/api/v1/billing/checkout', { headers: { Authorization: `Bearer ${token}` }, data: {} });
    expect([400, 422]).toContain(res.status());
  });
});

test.describe('Abonnement (page)', () => {
  test('la page s\'affiche sans erreur et présente les plans', async ({ page }) => {
    await page.goto('/app/billing');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByText(/une erreur est survenue/i)).toHaveCount(0);
    await expect(page.locator('body')).toContainText(/PME|ETI|Groupe/);
  });
});
