import { test, expect } from '@playwright/test';
import { apiToken } from './helpers/session';

test.describe('Rapports', () => {
  test('la page des rapports présente les modèles disponibles', async ({ page }) => {
    await page.goto('/app/reports');
    await expect(page.getByRole('heading', { name: /rapports/i }).first()).toBeVisible();
    await expect(page.getByText(/csrd/i).first()).toBeVisible();
  });

  test('le générateur de rapports s\'affiche', async ({ page }) => {
    await page.goto('/app/reports/generate');
    await expect(page.getByRole('heading', { name: /générateur de rapports/i })).toBeVisible();
  });

  test('l\'API des rapports répond à un utilisateur connecté', async ({ request }) => {
    const token = await apiToken(request);
    const res = await request.get('/api/v1/reports', { headers: { Authorization: `Bearer ${token}` } });
    expect([200, 404]).toContain(res.status());
    expect(res.status()).not.toBe(401);
  });
});
