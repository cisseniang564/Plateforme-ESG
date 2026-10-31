/**
 * Protection contre les tentatives de connexion répétées.
 *
 * Ces tests sont lancés SEULS, après tous les autres (projet « bruteforce » de playwright.config.ts) :
 * le compteur d'échecs est par adresse IP et une connexion réussie d'un autre test le remet à zéro,
 * et le blocage de 15 minutes empêcherait les autres tests de se connecter.
 */
import { test, expect } from '@playwright/test';
import { anonymousState } from './helpers/session';

const API_URL = process.env.API_URL ?? 'http://localhost:8000';

test.describe('Brute-force protection', () => {
  test.use({ storageState: anonymousState() });
  test('blocks login after 10 consecutive failed attempts', async ({ request }) => {
    // Fire 10 bad logins in sequence
    for (let i = 0; i < 10; i++) {
      await request.post(`${API_URL}/api/v1/auth/login`, {
        data: { email: 'victim@example.com', password: `wrong${i}` },
      });
    }

    // The 11th attempt should be rate-limited (429) regardless of credentials
    const blocked = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: 'victim@example.com', password: 'wrongagain' },
    });

    expect(blocked.status()).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/tentatives|bloqué|rate/i);
  });

  test('returns Retry-After header when blocked', async ({ request }) => {
    for (let i = 0; i < 10; i++) {
      await request.post(`${API_URL}/api/v1/auth/login`, {
        data: { email: 'victim2@example.com', password: `bad${i}` },
      });
    }
    const blocked = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: 'victim2@example.com', password: 'bad' },
    });
    expect(blocked.headers()['retry-after']).toBeDefined();
  });
});

