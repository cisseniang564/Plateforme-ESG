import { readFileSync } from 'node:fs';
import type { APIRequestContext } from '@playwright/test';
import { AUTH_FILE, DEMO_EMAIL, DEMO_PASSWORD } from '../../global-setup';

export { DEMO_EMAIL, DEMO_PASSWORD };

/** État « visiteur » : mêmes préférences (cookies acceptés…) mais aucune session ouverte. */
export function anonymousState() {
  const saved = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
  return { cookies: [], origins: saved.origins };
}

/** Jeton d'accès pour les tests d'API. */
export async function apiToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/v1/auth/login', { data: { email: DEMO_EMAIL, password: DEMO_PASSWORD } });
  const { tokens } = await res.json();
  return tokens.access_token as string;
}

/** Remplit un champ et vérifie la valeur : un re-rendu React peut effacer une saisie trop précoce. */
export async function fillStable(locator: import('@playwright/test').Locator, value: string) {
  const { expect } = await import('@playwright/test');
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}
