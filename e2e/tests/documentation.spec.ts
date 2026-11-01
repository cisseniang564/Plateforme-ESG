import { test, expect } from '@playwright/test';
import { anonymousState, fillStable } from './helpers/session';

test.describe('Documentation (publique)', () => {
  test.use({ storageState: anonymousState() });

  test('l\'accueil de la documentation s\'affiche sans connexion', async ({ page }) => {
    await page.goto('/documentation');
    await expect(page.getByRole('heading', { level: 1, name: /tout comprendre/i })).toBeVisible();
  });

  test('la recherche mène à un article', async ({ page }) => {
    await page.goto('/documentation');
    const search = page.getByRole('combobox').first();
    // L'index de recherche se charge à la demande : on ressaisit jusqu'à voir des résultats.
    await expect(async () => {
      await fillStable(search, 'bilan carbone');
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 25_000 });
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/\/documentation\/.+/);
    // Titre de l'article : la page contient aussi un titre statique de référencement (qui cite « Bilan Carbone »)
    await expect(page.getByRole('heading', { level: 1, name: /Scopes 1, 2 et 3/ })).toBeVisible();
  });

  test('un article inconnu renvoie à l\'accueil de la documentation', async ({ page }) => {
    await page.goto('/documentation/page-qui-n-existe-pas');
    await expect(page).toHaveURL(/\/documentation$/);
  });
});
