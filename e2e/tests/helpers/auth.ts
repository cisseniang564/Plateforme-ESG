/**
 * Shared E2E helpers — authentication and page navigation utilities.
 */
import { Page, expect } from '@playwright/test';

export const DEMO_EMAIL    = 'admin@demo.esgflow.com';
export const DEMO_PASSWORD = 'Admin123!';

/**
 * Perform a full login flow and wait for the dashboard.
 */
export async function loginAs(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]').first();
  const passInput  = page.locator('input[type="password"]').first();
  const submitBtn  = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passInput.fill(password);
  await submitBtn.click();

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10_000 });
}

/**
 * Assert the user is on the dashboard.
 */
export async function expectDashboard(page: Page) {
  await expect(page).not.toHaveURL(/login/);
  // Dashboard has at least one KPI card or heading
  await expect(
    page.locator('[data-testid="dashboard"], h1, [class*="Dashboard"]').first()
  ).toBeVisible({ timeout: 8_000 });
}

/**
 * Navigate to a sidebar section by its data-tour attribute.
 */
export async function gotoSection(page: Page, tourId: string) {
  const link = page.locator(`[data-tour="${tourId}"]`);
  await expect(link).toBeVisible({ timeout: 5_000 });
  await link.click();
  await page.waitForLoadState('networkidle');
}
