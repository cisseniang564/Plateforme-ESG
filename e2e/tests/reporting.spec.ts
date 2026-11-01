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

  test('un rapport VSME se génère en PDF et apparaît dans la liste des rapports', async ({ request, page }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const res = await request.post('/api/v1/reports/generate', {
      headers, data: { report_type: 'vsme', period: 'annual', year: 2026, format: 'pdf' },
    });
    expect(res.status(), await res.text().catch(() => '')).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
    expect(res.headers()['x-report-content-hash']).toMatch(/^[0-9a-f]{64}$/);

    // Excel / Word ne suivent pas la structure VSME : refus explicite plutôt qu'un rapport générique
    const excel = await request.post('/api/v1/reports/generate', {
      headers, data: { report_type: 'vsme', period: 'annual', year: 2026, format: 'excel' },
    });
    expect(excel.status()).toBe(400);

    await page.goto('/app/reports/list');
    await expect(page.getByRole('heading', { level: 1, name: 'Rapports générés' })).toBeVisible();
    await expect(page.getByText('VSME').first()).toBeVisible();
  });
});
