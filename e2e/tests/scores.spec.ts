import { test, expect } from '@playwright/test';

test.describe('Scores', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@demo.esgflow.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  });

  test('scores page loads', async ({ page }) => {
    await page.goto('/scores');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('score calculation page shows form', async ({ page }) => {
    await page.goto('/scores/calculate');
    await expect(page.getByText(/calcul/i).first()).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /calculer/i })).toBeVisible();
  });

  test('organizations page loads', async ({ page }) => {
    await page.goto('/organizations');
    await expect(page.getByText(/organisation/i).first()).toBeVisible();
  });
});
