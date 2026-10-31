import { test, expect } from '@playwright/test';
import { anonymousState } from './helpers/session';

test.describe('Ressources (publiques)', () => {
  test.use({ storageState: anonymousState() });

  test('le test « Suis-je concerné ? » donne un résultat pour une grande entreprise de l\'UE', async ({ page }) => {
    await page.goto('/ressources/suis-je-concerne');
    await page.getByRole('button', { name: "Dans l'Union européenne" }).click();
    await page.getByRole('button', { name: 'Non', exact: true }).click();          // pas déjà déclarant
    await page.getByRole('button', { name: 'De 1 001 à 5 000' }).click();
    await page.getByRole('button', { name: 'De plus de 450 M€ à 1,5 Md€' }).click();
    await page.getByRole('button', { name: 'Oui', exact: true }).click();           // vend à de grands groupes
    await expect(page.getByRole('heading', { name: 'Vous êtes concerné par la CSRD' })).toBeVisible();
    await expect(page.getByText(/exercice 2027 et sera publié en 2028/)).toBeVisible();
  });

  test('le dictionnaire filtre par recherche', async ({ page }) => {
    await page.goto('/ressources/dictionnaire');
    await expect(page.getByRole('heading', { name: 'Le dictionnaire des indicateurs ESG' })).toBeVisible();
    await page.getByPlaceholder(/Scope 1/).fill('E1-6');
    await expect(page.getByRole('heading', { name: /scope 1/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Effectif' })).toHaveCount(0);
  });

  test('la page Ressources propose les outils gratuits', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.getByRole('link', { name: /Suis-je concerné/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /dictionnaire des indicateurs/i })).toBeVisible();
  });
});
