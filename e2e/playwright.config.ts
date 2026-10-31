import { defineConfig, devices } from '@playwright/test';
import { AUTH_FILE } from './global-setup';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
// Navigateur déjà installé sur la machine (facultatif : utile hors CI)
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL,
    // Par défaut : compte de démonstration déjà connecté (créé par global-setup.ts).
    storageState: AUTH_FILE,
    // L'API refuse les écritures sans en-tête Origin quand un cookie de session est présent (protection CSRF).
    extraHTTPHeaders: { Origin: new URL(baseURL).origin },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },

  projects: [
    // Tout sauf les tests de blocage de connexion (voir bruteforce.spec.ts)
    { name: 'chromium', testIgnore: /bruteforce/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: /bruteforce/, use: { ...devices['Desktop Firefox'] } },
    // Lancé à part, après le projet « chromium » (dépendance), un test à la fois
    { name: 'bruteforce', testMatch: /bruteforce/, dependencies: ['chromium'], fullyParallel: false, use: { ...devices['Desktop Chrome'] } },
  ],
});
