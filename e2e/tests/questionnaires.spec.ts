import { test, expect } from '@playwright/test';
import { apiToken } from './helpers/session';

test.describe('Questionnaires clients', () => {
  test('la page propose le dépôt de fichier et la saisie des questions', async ({ page }) => {
    await page.goto('/app/questionnaires');
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Questionnaires clients' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choisir un fichier' })).toBeVisible();
    await page.getByRole('tab', { name: 'Coller les questions' }).click();
    await expect(page.getByLabel('Questions à coller')).toBeVisible();
    await expect(page.getByText('Aucun questionnaire pour l\'instant.')).toBeVisible();
  });

  test('une demande vide ou un format inconnu est refusé clairement', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const empty = await request.post('/api/v1/questionnaires', { headers, multipart: { client_name: 'X' } });
    expect(empty.status()).toBe(400);

    const bad = await request.post('/api/v1/questionnaires', {
      headers, multipart: { file: { name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') } },
    });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).detail).toMatch(/Format non pris en charge/);
  });

  test('sans clé OpenAI le serveur le dit (503), avec une clé il accepte (202)', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const res = await request.post('/api/v1/questionnaires', {
      headers, multipart: { pasted_text: 'Quel est votre effectif total ?\nQuelles sont vos émissions de scope 1 ?' },
    });
    expect([202, 503]).toContain(res.status());
    if (res.status() === 202) {
      const { id } = await res.json();
      const del = await request.delete(`/api/v1/questionnaires/${id}`, { headers });
      expect(del.status()).toBe(204);
    }
  });

  test('un questionnaire inconnu renvoie 404', async ({ request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const res = await request.get('/api/v1/questionnaires/00000000-0000-0000-0000-000000000000', { headers });
    expect(res.status()).toBe(404);
  });
});
