import { test, expect } from '@playwright/test';
import { apiToken } from './helpers/session';

test.describe('Validation datée de la matrice de matérialité', () => {
  test('valider fige la matrice, puis une modification est détectée', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const name = `Enjeu E2E validation ${Date.now()}`;

    const created = await request.post('/api/v1/materiality/issues', {
      headers, data: { name, category: 'environmental', financial_impact: 70, esg_impact: 40, rationale: '  Enquête salariés  ', time_horizon: 'long' },
    });
    expect(created.status()).toBe(200);
    const issue = await created.json();
    expect(issue.rationale).toBe('Enquête salariés');
    expect(issue.time_horizon).toBe('long');

    // Sans attestation : refusé.
    const refused = await request.post('/api/v1/materiality/validations', { headers, data: { validator_role: 'Direction générale' } });
    expect(refused.status()).toBe(422);

    const v1 = await request.post('/api/v1/materiality/validations', {
      headers, data: { validator_role: 'Direction générale', comment: 'Validation annuelle', attestation: true },
    });
    expect(v1.status()).toBe(201);
    const first = await v1.json();
    expect(first.snapshot_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.issue_count).toBeGreaterThanOrEqual(1);

    let status = await (await request.get('/api/v1/materiality/validations/status', { headers })).json();
    expect(status.last.id).toBe(first.id);
    expect(status.up_to_date).toBe(true);

    // On change une note : la matrice n'est plus celle qui a été validée.
    const put = await request.put(`/api/v1/materiality/issues/${issue.id}`, { headers, data: { esg_impact: 90 } });
    expect(put.status()).toBe(200);
    status = await (await request.get('/api/v1/materiality/validations/status', { headers })).json();
    expect(status.up_to_date).toBe(false);
    expect(status.changes.modified.map((m: { name: string }) => m.name)).toContain(name);

    // La copie figée garde l'ancienne note.
    const detail = await (await request.get(`/api/v1/materiality/validations/${first.id}`, { headers })).json();
    const frozen = detail.snapshot.find((r: { id: string }) => r.id === issue.id);
    expect(frozen.esg_impact).toBe(40);

    // Seconde validation : version suivante, l'historique garde les deux.
    const v2 = await (await request.post('/api/v1/materiality/validations', {
      headers, data: { validator_role: 'Direction générale', attestation: true },
    })).json();
    expect(v2.version).toBe(first.version + 1);
    const list = await (await request.get('/api/v1/materiality/validations', { headers })).json();
    expect(list.items.map((x: { id: string }) => x.id)).toEqual(expect.arrayContaining([first.id, v2.id]));

    await request.delete(`/api/v1/materiality/issues/${issue.id}`, { headers });
  });

  test('une validation inconnue renvoie 404 et un choix invalide 422', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    expect((await request.get('/api/v1/materiality/validations/00000000-0000-0000-0000-000000000000', { headers })).status()).toBe(404);
    const bad = await request.post('/api/v1/materiality/issues', {
      headers, data: { name: 'x', category: 'social', time_horizon: 'forever' },
    });
    expect(bad.status()).toBe(422);
  });
});
