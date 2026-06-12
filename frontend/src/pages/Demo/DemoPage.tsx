/**
 * DemoPage — Auto-authenticates as the shared demo account and redirects
 * to the dashboard. Shows a loading state while the request is in flight,
 * and a clear error state if the demo server is unavailable.
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Leaf, Loader2, Play, Shield, BarChart3, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { setUser } from '@/store/slices/authSlice';
import { PROSPECT_DEMO_FLAG } from '@/components/tour/TourContext';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Status = 'idle' | 'loading' | 'error';

const getHighlights = (t: TFunction) => [
  { icon: BarChart3, label: t('demo.highlight.dashboard', 'Dashboard ESG complet'), color: 'text-green-400' },
  { icon: Zap,       label: t('demo.highlight.ai', 'IA & analyse automatique'), color: 'text-yellow-400' },
  { icon: Shield,    label: t('demo.highlight.compliance', 'Conformité CSRD / ESRS'), color: 'text-blue-400' },
];

export default function DemoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const HIGHLIGHTS = getHighlights(t);

  const startDemo = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      // /auth/demo-session — isolated sandbox tenant, viewer role, 1h JWT
      // Token is set via httpOnly cookie by the backend — no client storage needed.
      const res = await api.post('/auth/demo-session');
      const { user } = res.data;

      // Mark this as a demo session so the banner appears + auto-expiry logic kicks in
      try {
        localStorage.setItem('is_demo_session', '1');
        sessionStorage.setItem('demo_started_at', String(Date.now()));
      } catch { /* ignore */ }

      dispatch(setUser(user));

      // Flag à usage unique consommé par TourProvider pour auto-démarrer
      // le tour commercial dès l'arrivée dans /app.
      sessionStorage.setItem(PROSPECT_DEMO_FLAG, '1');

      navigate('/app', { replace: true });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(
        err?.response?.data?.detail ||
        t('demo.error.unavailable', 'Le compte démo est temporairement indisponible. Veuillez réessayer dans quelques instants.')
      );
    }
  };

  // Auto-start on mount
  useEffect(() => {
    startDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-emerald-900 flex items-center justify-center p-6">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ESGFlow</span>
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
          {/* Loading state */}
          {status !== 'error' && (
            <>
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                {status === 'loading' ? (
                  <Loader2 className="h-8 w-8 text-green-400 animate-spin" />
                ) : (
                  <Play className="h-8 w-8 text-green-400" />
                )}
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                {status === 'loading' ? t('demo.loadingTitle', 'Démarrage de la démo…') : t('demo.title', 'Démo ESGFlow')}
              </h1>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                {status === 'loading'
                  ? t('demo.loadingBody', 'Connexion en cours au compte de démonstration, veuillez patienter.')
                  : t('demo.idleBody', 'Explorez toute la plateforme sans créer de compte — données pré-remplies, IA activée.')}
              </p>

              {/* Feature highlights */}
              <div className="space-y-3 mb-8 text-left">
                {HIGHLIGHTS.map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <span className="text-sm text-slate-300">{label}</span>
                  </div>
                ))}
              </div>

              {status === 'idle' && (
                <button
                  onClick={startDemo}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 text-white font-bold text-sm transition-all shadow-xl shadow-green-500/30"
                >
                  {t('demo.cta', 'Accéder à la démo')} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}

          {/* Error state */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">{t('demo.errorTitle', 'Démo temporairement indisponible')}</h1>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{errorMsg}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={startDemo}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-400 text-white font-semibold text-sm transition-all"
                >
                  <Loader2 className="h-4 w-4" /> {t('demo.retry', 'Réessayer')}
                </button>
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/20 text-white/80 hover:text-white hover:bg-white/5 font-medium text-sm transition-all"
                >
                  {t('demo.createAccount', 'Créer un compte gratuit')}
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Fine print */}
        <p className="text-center text-xs text-slate-500 mt-5">
          {t('demo.finePrint', 'Compte partagé en lecture/écriture — données réinitialisées toutes les 24h.')}{' '}
          <Link to="/privacy-policy" className="underline hover:text-slate-300">{t('demo.privacy', 'Confidentialité')}</Link>
        </p>
      </div>
    </div>
  );
}
