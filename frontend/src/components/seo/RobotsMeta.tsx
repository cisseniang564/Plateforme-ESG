/**
 * RobotsMeta — synchronizes <meta name="robots"> with the current SPA route.
 *
 * Authenticated app surface (/app/*) and credential-handling pages (/login,
 * /reset-password, /forgot-password, /2fa/verify) are tagged noindex so they
 * never leak into Google. Public marketing pages keep the default "index,
 * follow" inherited from index.html.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Path matchers — any path STARTS WITH one of these is noindex.
const NOINDEX_PREFIXES = [
  '/app',
  '/login',
  '/register',          // signup form — index-OK but no need to surface in SERP
  '/reset-password',
  '/forgot-password',
  '/2fa',
  '/onboarding',
  '/billing/cancel',
  '/billing/success',
  '/demo',              // demo session — temporary
];

const PUBLIC_DEFAULT = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const PRIVATE        = 'noindex, nofollow, noarchive';

function getOrCreateRobotsMeta(): HTMLMetaElement {
  let m = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!m) {
    m = document.createElement('meta');
    m.name = 'robots';
    document.head.appendChild(m);
  }
  return m;
}

export default function RobotsMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPrivate = NOINDEX_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
    getOrCreateRobotsMeta().content = isPrivate ? PRIVATE : PUBLIC_DEFAULT;
  }, [pathname]);

  return null;
}
