import { test, expect } from '@playwright/test';
import { apiToken } from './helpers/session';

test.describe('Scores et organisations', () => {
  test('le tableau de bord des scores s\'affiche', async ({ page }) => {
    await page.goto('/app/scores');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByText(/une erreur est survenue/i)).toHaveCount(0);
  });

  test('la page de calcul propose un formulaire', async ({ page }) => {
    await page.goto('/app/scores/calculate');
    await expect(page.getByRole('heading', { name: /calcul de score/i })).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /calculer le score/i })).toBeVisible();
  });

  test('la liste des organisations s\'affiche', async ({ page }) => {
    await page.goto('/app/organizations');
    await expect(page.getByRole('heading', { name: /organisations/i }).first()).toBeVisible();
  });
});

test('le panneau « Comment ce score est calculé » affiche la méthode et ses limites', async ({ page }) => {
  await page.goto('/app/scores');
  await page.getByRole('button', { name: 'Comment ce score est calculé' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Méthodologie du score ESG' });
  await expect(dialog.getByText('Limites à connaître')).toBeVisible();
  await expect(dialog.getByText(/ne tiennent pas compte de la taille/)).toBeVisible();
  await expect(dialog.getByText('AAA ≥ 85')).toBeVisible();
});

test('« adapter le score à la taille » est désactivé par défaut et se règle par organisation', async ({ request }) => {
  const headers = { Authorization: `Bearer ${await apiToken(request)}` };
  const created = await request.post('/api/v1/organizations', {
    headers, data: { name: `Org taille ${Date.now()}`, employee_count: 400 },
  });
  expect(created.status(), await created.text()).toBeLessThan(300);
  const org = await created.json();
  expect(org.score_size_adjusted).toBe(false);

  const updated = await request.put(`/api/v1/organizations/${org.id}`, { headers, data: { score_size_adjusted: true } });
  expect(updated.status()).toBe(200);
  const read = await (await request.get(`/api/v1/organizations/${org.id}`, { headers })).json();
  expect(read.score_size_adjusted).toBe(true);

  const method = await (await request.get('/api/v1/esg-scoring/methodology', { headers })).json();
  expect(method.size_adjustment.reference_employees).toBe(100);
});
