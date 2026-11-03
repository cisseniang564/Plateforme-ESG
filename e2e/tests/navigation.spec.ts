import { test, expect } from '@playwright/test';

test.describe('Navigation et accueil', () => {
  test('l’accueil s’affiche sans erreur', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
    await expect(page.getByText(/une erreur est survenue/i)).toHaveCount(0);
  });

  test('la page Gaïa affiche son propre titre dans la barre haute', async ({ page }) => {
    await page.goto('/app/gaia');
    await expect(page.getByRole('banner').getByText(/Gaïa/).first()).toBeVisible();
    await expect(page.getByRole('banner').getByText('Tableau de bord')).toHaveCount(0);
  });

  test('Questionnaires clients est accessible depuis le menu principal', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: 'Questionnaires clients' }).first().click();
    await expect(page).toHaveURL(/\/app\/questionnaires/);
  });

  test('plus de bouton « + » flottant', async ({ page }) => {
    await page.goto('/app/data-entry');
    await expect(page.getByRole('button', { name: /actions rapides|quick actions/i })).toHaveCount(0);
  });
});

test.describe('Gaïa', () => {
  test('un seul état vide : pas de doublon « aucune analyse » et un appel à l’action clair', async ({ page }) => {
    await page.goto('/app/gaia');
    await expect(page.getByRole('heading', { name: 'Analysez un rapport en 30 secondes' })).toBeVisible();
    await expect(page.getByText(/Aucune analyse sélectionnée/)).toHaveCount(0);
    await expect(page.getByText(/Aucune analyse pour le moment/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Choisir un fichier' }).first()).toBeVisible();
  });
});
