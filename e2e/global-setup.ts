/**
 * Prépare le compte de démonstration avant les tests :
 *  1. crée le compte par l'API d'inscription (sans erreur s'il existe déjà) ;
 *  2. se connecte et termine l'assistant de configuration ;
 *  3. enregistre l'état du navigateur (cookies de session + préférences) dans un fichier,
 *     pour que les tests démarrent connectés, sans bandeau de cookies ni redirection de bienvenue.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { request, type FullConfig } from '@playwright/test';

export const DEMO_EMAIL = 'admin@demo.esgflow.com';
export const DEMO_PASSWORD = 'Admin123!';
export const AUTH_FILE = join(__dirname, '.auth', 'user.json');

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || process.env.BASE_URL || 'http://localhost:3000';
  const origin = new URL(baseURL).origin;
  const api = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: origin } });

  await api.post('/api/v1/auth/register', {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD, first_name: 'Admin', last_name: 'Demo', company_name: 'Demo Company' },
  }); // 200 la première fois, erreur « déjà inscrit » ensuite : les deux conviennent

  const login = await api.post('/api/v1/auth/login', { data: { email: DEMO_EMAIL, password: DEMO_PASSWORD } });
  if (!login.ok()) throw new Error(`Connexion du compte de démonstration impossible : HTTP ${login.status()} ${await login.text()}`);

  const me = await (await api.get('/api/v1/auth/me')).json();
  if (me.needs_onboarding) {
    const done = await api.post('/api/v1/onboarding/complete');
    if (!done.ok()) throw new Error(`Fin de l'assistant de configuration impossible : HTTP ${done.status()}`);
  }

  const state = await api.storageState();
  state.origins = [{
    origin,
    localStorage: [
      // format attendu par le bandeau de cookies (CookieBanner.tsx) : {v, level, at}
      { name: 'cookie_consent', value: JSON.stringify({ v: '1', level: 'essential', at: Date.now() }) },
      { name: `billing_welcomed_${me.id}`, value: '1' },
    ],
  }];
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(state));
  await api.dispose();
}
