import { test, expect } from '@playwright/test';

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
