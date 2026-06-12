/**
 * DemoSessionBanner — Persistent top banner displayed on every page when
 * the user is in a sandboxed demo session (different from the per-feature
 * `DemoBanner` notice).
 *
 * Activation:
 *  - `localStorage.is_demo_session === '1'` (set on /demo bootstrap)
 *  - OR the JWT contains `is_demo: true` claim (defensive check)
 *
 * Shows a countdown to the 1h expiry + a CTA to create a real account.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Clock, ArrowRight, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DEMO_TTL_MS = 60 * 60 * 1000; // 1 hour — matches backend /auth/demo-session

function isDemoSession(): boolean {
  try {
    return localStorage.getItem('is_demo_session') === '1';
  } catch {
    return false;
  }
}

function getExpiry(): number | null {
  // Demo session lives in a 1h httpOnly cookie set by /auth/demo-session.
  // We track the start client-side (sessionStorage) so the banner can show
  // a countdown without decoding the JWT (which is no longer reachable from JS).
  try {
    const startedRaw = sessionStorage.getItem('demo_started_at');
    if (!startedRaw) return null;
    const started = Number(startedRaw);
    if (!Number.isFinite(started)) return null;
    return started + DEMO_TTL_MS;
  } catch {
    return null;
  }
}

export default function DemoSessionBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState<boolean>(() => isDemoSession());
  const [remaining, setRemaining] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    const tick = () => {
      const exp = getExpiry();
      if (!exp) { setRemaining(''); return; }
      const diff = exp - Date.now();
      if (diff <= 0) {
        setRemaining(t('demosess.expired', 'expirée'));
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const exitDemo = async () => {
    // Fire-and-forget logout so the backend clears the httpOnly cookies
    try {
      const { authService } = await import('@/services/authService');
      await authService.logout();
    } catch { /* ignore */ }
    try {
      localStorage.removeItem('is_demo_session');
      sessionStorage.removeItem('demo_started_at');
    } catch { /* ignore */ }
    setVisible(false);
    navigate('/');
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-40 bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-600 text-white shadow-md"
    >
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">
              {t('demosess.title', 'Mode démo — données fictives en lecture seule')}
            </p>
            <p className="text-[11px] text-white/80 leading-tight hidden sm:block">
              {t('demosess.subtitle', 'Sandbox isolée · les modifications ne sont pas sauvegardées')}
            </p>
          </div>
        </div>

        {remaining && (
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-lg text-xs font-mono tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            {remaining}
          </div>
        )}

        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 px-3 h-8 bg-white text-violet-700 hover:bg-violet-50 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          {t('demosess.createAccount', 'Créer mon compte')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <button
          type="button"
          onClick={exitDemo}
          title={t('demosess.exit', 'Quitter la démo')}
          aria-label={t('demosess.exit', 'Quitter la démo')}
          className="inline-flex items-center justify-center h-8 w-8 hover:bg-white/15 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
