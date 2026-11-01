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

  test('un rapport peut être partagé par lien public puis téléchargé', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const gen = await request.post('/api/v1/reports/generate', {
      headers, data: { report_type: 'vsme', period: 'annual', year: 2026, format: 'pdf' },
    });
    const historyId = gen.headers()['x-report-history-id'];
    expect(historyId).toBeTruthy();

    const share = await request.post(`/api/v1/reports/history/${historyId}/share`, { headers, data: { expires_in_hours: 24 } });
    expect(share.status(), await share.text()).toBe(200);
    const { public_path } = await share.json();

    // Lien public : aucune authentification
    const pub = await request.get(public_path);
    expect(pub.status()).toBe(200);
    expect(pub.headers()['content-type']).toContain('application/pdf');
  });

  test('un rapport planifié se crée, apparaît dans la liste et se supprime', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const created = await request.post('/api/v1/reports/scheduled', {
      headers, data: { title: 'Mensuel VSME', report_type: 'vsme', frequency: 'monthly', format: 'pdf', recipients: ['direction@example.com'] },
    });
    expect(created.status()).toBe(201);
    const { id, next_run } = await created.json();
    expect(next_run).toBeTruthy();

    const list = await (await request.get('/api/v1/reports/scheduled', { headers })).json();
    expect(list.schedules.some((s: any) => s.id === id)).toBe(true);

    const del = await request.delete(`/api/v1/reports/scheduled/${id}`, { headers });
    expect(del.status()).toBe(204);
  });
});
