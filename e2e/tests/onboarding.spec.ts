/** Inscription d'une entreprise : on vérifie le formulaire sans créer de compte. */
import { test, expect } from '@playwright/test';
import { anonymousState, fillStable } from './helpers/session';

test.describe('Inscription', () => {
  test.use({ storageState: anonymousState() });

  test('la page d\'inscription s\'affiche avec ses champs', async ({ page }) => {
    const res = await page.goto('/register');
    expect(res?.status()).toBe(200);
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('un e-mail invalide empêche l\'envoi', async ({ page }) => {
    await page.goto('/register');
    await fillStable(page.locator('input[type="email"]').first(), 'pas-un-email');
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await expect(page).toHaveURL(/register/);
    const invalid = await page.locator('input[type="email"]').first().evaluate(el => !(el as { validity: { valid: boolean } }).validity.valid);
    expect(invalid).toBe(true);
  });

  test('un lien mène à la connexion', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href*="login"]').first()).toBeVisible();
  });
});
