import { test, expect } from '@playwright/test';
import { anonymousState } from './helpers/session';

test.describe('Landing : menu et section Fonctionnalités', () => {
  test.use({ storageState: anonymousState() });

  test('le menu Fonctionnalités liste les trois familles et mène aux pages publiques', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Fonctionnalités' });
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#features-menu');
    for (const family of ['Collecter et fiabiliser', 'Analyser et piloter', 'Rapporter et répondre']) {
      await expect(menu.getByText(family)).toBeVisible();
    }
    await expect(menu.getByText('Questionnaires clients')).toBeVisible();
    await menu.getByRole('link', { name: /Piste d’audit et preuves/ }).click();
    await expect(page).toHaveURL(/\/features\/audit-trail$/);
  });

  test('Échap referme le menu, et le panneau mène au test d\'éligibilité', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Fonctionnalités' }).click();
    await expect(page.locator('#features-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#features-menu')).toHaveCount(0);

    await page.getByRole('button', { name: 'Fonctionnalités' }).click();
    await page.locator('#features-menu').getByRole('link', { name: 'Tester mon éligibilité' }).click();
    await expect(page).toHaveURL(/\/ressources\/suis-je-concerne$/);
  });

  test('un module du menu ouvre l\'explorateur de modules sur le bon module', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Fonctionnalités' }).click();
    await page.locator('#features-menu').getByRole('link', { name: /Qualité des données/ }).click();
    await expect(page.locator('#modules').getByRole('heading', { level: 3, name: 'Qualité des Données' })).toBeVisible();
  });

  test('la section Fonctionnalités est présente dans la page', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#fonctionnalites');
    await expect(section.getByRole('heading', { level: 2, name: /De la donnée au rapport/ })).toBeVisible();
    await expect(section.getByText('Scores ESG traçables')).toBeVisible();
  });
});
