/**
 * ESG Flow Service Worker — offline shell + smart caching.
 *
 * Strategy:
 *  - Static assets (JS, CSS, fonts, SVG): cache-first with versioned cache name.
 *  - HTML navigation: network-first with offline fallback (cached index).
 *  - API calls (/api/*): network-only — never serve stale data.
 *  - Old caches are purged on activate.
 *
 * Bump CACHE_VERSION when shipping breaking changes (rebrand, etc.).
 */
const CACHE_VERSION = 'esgflow-v4-brand';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE   = `${CACHE_VERSION}-html`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-esgflow-v3.svg',
  '/favicon-v3.ico',
  '/brand/icon-esgflow-v3-32.png',
  '/brand/icon-esgflow-v3-64.png',
  '/brand/icon-esgflow-v3-128.png',
  '/brand/icon-esgflow-v3-256.png',
  '/brand/icon-esgflow-v3-512.png',
  '/brand/logo-full.png',
];

// Old asset paths to actively purge from any pre-existing cache on activation
const STALE_ASSETS = [
  '/icon-maskable.svg',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon.png',
  '/brand/logo-mark-32.png',
  '/brand/logo-mark-64.png',
  '/brand/logo-mark-128.png',
  '/brand/logo-mark-256.png',
  '/brand/logo-mark-512.png',
];

// ── Install: precache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: drop old caches and stale brand assets ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Drop every cache that isn't the current version
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      // 2. Even within the current cache, evict the deprecated brand files
      try {
        const current = await caches.open(STATIC_CACHE);
        await Promise.all(STALE_ASSETS.map((u) => current.delete(u)));
      } catch (_) {}
      await self.clients.claim();
    })()
  );
});

// ── Fetch handler ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin and API calls — always go to network
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/docs') || url.pathname.startsWith('/redoc')) return;

  // HTML navigations: network-first, fall back to cached shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(HTML_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Hashed assets (JS/CSS/fonts/images): cache-first
  if (url.pathname.startsWith('/assets/') ||
      /\.(?:js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
  }
});

// ── Allow the page to ask for an immediate update ──────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
