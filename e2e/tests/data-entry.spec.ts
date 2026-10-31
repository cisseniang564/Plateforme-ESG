import { test, expect } from '@playwright/test';

test.describe('Saisie de données ESG', () => {
  test('la page de saisie s\'affiche', async ({ page }) => {
    await page.goto('/app/data-entry');
    await expect(page.getByRole('heading', { name: /saisie de données/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nouvelle saisie/i }).first()).toBeVisible();
  });

  test('l\'assistant de saisie propose les trois piliers', async ({ page }) => {
    await page.goto('/app/data-entry');
    await page.getByRole('button', { name: /nouvelle saisie/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/étape 1 sur 3/i)).toBeVisible();
    await expect(dialog.getByText(/choisissez un pilier esg/i)).toBeVisible();
    for (const pillar of [/environnemental/i, /social/i, /gouvernance/i]) {
      await expect(dialog.getByText(pillar).first()).toBeVisible();
    }
  });

  test('l\'assistant passe à l\'étape suivante puis se ferme', async ({ page }) => {
    await page.goto('/app/data-entry');
    await page.getByRole('button', { name: /nouvelle saisie/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText(/^social$/i).click();
    await dialog.getByRole('button', { name: /suivant/i }).click();
    await expect(dialog.getByText(/étape 2 sur 3/i)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
