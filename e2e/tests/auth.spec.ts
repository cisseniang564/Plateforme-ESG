import { test, expect } from '@playwright/test';
import { anonymousState, fillStable, DEMO_EMAIL, DEMO_PASSWORD } from './helpers/session';

test.describe('Authentification', () => {
  test.use({ storageState: anonymousState() });

  test('la page de connexion s\'affiche', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenue/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('des identifiants incorrects affichent une erreur', async ({ page }) => {
    await page.goto('/login');
    await fillStable(page.locator('input[type="email"]'), 'inconnu@example.com');
    await fillStable(page.locator('input[type="password"]'), 'MauvaisMotDePasse1');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test('une page protégée renvoie vers la connexion', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/login/);
  });

  test('une connexion réussie ouvre le tableau de bord', async ({ page }) => {
    await page.goto('/login');
    await fillStable(page.locator('input[type="email"]'), DEMO_EMAIL);
    await fillStable(page.locator('input[type="password"]'), DEMO_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByText(/Bienvenue sur ESGFlow|Bonjour|Bonsoir/i).first()).toBeVisible();
  });
});
