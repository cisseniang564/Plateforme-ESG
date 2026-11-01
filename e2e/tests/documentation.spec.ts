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
    await fillStable(page.getByRole('combobox').first(), 'bilan carbone');
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/\/documentation\/.+/);
    // Titre de l'article (la page contient aussi un titre statique de référencement : ne pas cibler tous les h1)
    await expect(page.getByRole('heading', { level: 1, name: /bilan carbone/i })).toBeVisible();
  });

  test('un article inconnu renvoie à l\'accueil de la documentation', async ({ page }) => {
    await page.goto('/documentation/page-qui-n-existe-pas');
    await expect(page).toHaveURL(/\/documentation$/);
  });
});
