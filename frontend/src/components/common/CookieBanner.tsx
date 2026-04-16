/**
 * RGPD Cookie Consent Banner
 * - Persisted in localStorage (key: "cookie_consent")
 * - Three levels: "all" | "essential" | null (not decided yet)
 * - Supports inline customization drawer
 */
import { useState, useEffect } from 'react';
import { X, Cookie, ChevronDown, ChevronUp, Shield, BarChart2 } from 'lucide-react';

type ConsentLevel = 'all' | 'essential' | null;

const STORAGE_KEY = 'cookie_consent';
const STORAGE_VERSION = '1';

function getStoredConsent(): ConsentLevel {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.v !== STORAGE_VERSION) return null;
    return parsed.level ?? null;
  } catch {
    return null;
  }
}

function storeConsent(level: ConsentLevel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, level, at: Date.now() }));
}

export function useCookieConsent() {
  return getStoredConsent();
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = (level: ConsentLevel) => {
    storeConsent(level);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-slate-100">
            <div className="flex-shrink-0 bg-emerald-100 p-2 rounded-lg">
              <Cookie className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">
                Nous utilisons des cookies
              </p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">
                Certains sont essentiels au fonctionnement de la plateforme, d'autres nous aident à l'améliorer.
              </p>
            </div>
            <button onClick={() => accept('essential')} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main content */}
          <div className="px-5 py-4">
            {/* Cookie categories */}
            <div className="space-y-3 mb-4">
              {/* Essential - always on */}
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <Shield className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">Cookies essentiels</p>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Toujours actifs</span>
                  </div>
                  {expanded && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Authentification, sécurité, préférences de session. Nécessaires au fonctionnement de la plateforme.
                    </p>
                  )}
                </div>
              </div>

              {/* Analytics - optional */}
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <BarChart2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">Cookies analytiques</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={analytics}
                        onChange={e => setAnalytics(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  {expanded && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Mesure d'audience (Google Analytics), amélioration de l'expérience utilisateur. Aucune donnée ESG n'est partagée.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Expand / collapse */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Masquer les détails' : 'Voir les détails'}
            </button>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => accept(analytics ? 'all' : 'essential')}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Accepter ma sélection
              </button>
              <button
                onClick={() => accept('all')}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              >
                Tout accepter
              </button>
              <button
                onClick={() => accept('essential')}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium transition-colors"
              >
                Essentiels uniquement
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400 text-center">
              En continuant à naviguer, vous acceptez les cookies essentiels. Voir notre{' '}
              <a href="/privacy-policy" className="underline hover:text-emerald-600">politique de confidentialité</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
