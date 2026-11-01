import { test, expect } from '@playwright/test';
import { anonymousState, apiToken } from './helpers/session';

test.describe('Connecteurs : aucune donnée inventée, accès protégé', () => {
  test('le test de connexion exige d\'être connecté (il utilise les clés de la plateforme)', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL, storageState: anonymousState() });
    const res = await anon.post('/api/v1/connectors/test', { data: { connector_id: 'climatiq' } });
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test('des identifiants refusés ne produisent aucune donnée (ni « démo », ni écriture)', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    for (const [path, body] of [
      ['pennylane', { api_key: 'cle-invalide-e2e', year: 2025 }],
      ['qonto', { login: 'invalide', secret_key: 'invalide', year: 2025 }],
    ] as const) {
      const res = await request.post(`/api/v1/connectors/${path}/sync`, { headers, data: body });
      expect([400, 502]).toContain(res.status());                    // refus d'identifiants ou service injoignable
      const json = await res.json();
      expect(json.detail).toBeTruthy();
      expect(json.synced).toBeUndefined();
      expect(JSON.stringify(json)).not.toMatch(/mock|démo/i);
    }
  });

  test('le journal des synchronisations est réel : une tentative y apparaît, sans donnée fictive', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    await request.post('/api/v1/connectors/pennylane/sync', { headers, data: { api_key: 'cle-invalide-e2e', year: 2025 } });
    const res = await request.get('/api/v1/connectors/sync-log?days=1', { headers });
    expect(res.status()).toBe(200);
    const { items } = await res.json();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ connector_id: 'pennylane', status: 'error' });
    expect(items.every((i: { records: number }) => i.records === 0 || i.records > 0)).toBe(true);
  });

  test('une synchronisation simulée n\'est pas présentée comme un succès', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const res = await request.post('/api/v1/connectors/schneider/sync', { headers });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('simulated');
    expect(json.ok).toBe(false);
    expect(json.records_synced).toBe(0);
  });

  test('la page Connecteurs ne montre aucun faux incident ni faux volume', async ({ page }) => {
    await page.goto('/app/data/connectors');
    await expect(page.getByText('SAP SuccessFactors · Token OAuth')).toHaveCount(0);
    await expect(page.getByText('8.4 GB')).toHaveCount(0);
  });
});
