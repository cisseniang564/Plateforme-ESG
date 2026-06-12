import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/common/Button';
import LanguageSelector from '@/components/LanguageSelector';
import { UserPlus, Shield, Loader2, Lock, CheckCircle, ArrowRight, BarChart3, Leaf, Globe } from 'lucide-react';
import { authService } from '@/services/authService';
import { setUser } from '@/store/slices/authSlice';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result?.requires_2fa && result?.temp_token) {
        navigate('/2fa/verify', { state: { temp_token: result.temp_token } });
      }
    } catch (err: any) {
      setError(err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTotpLoading(true);
    try {
      const result = await authService.verify2FA(tempToken, totpCode);
      dispatch(setUser(result.user));
      if (result.user?.needs_onboarding) {
        navigate('/app/setup', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Code invalide ou expiré');
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-white tracking-tight">ESG</span>
                <span className="text-xl font-extrabold text-emerald-400 tracking-tight"> FLOW</span>
              </div>
            </Link>
          </div>

          {/* Central content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
              Pilotez votre
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                performance ESG
              </span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed mb-10">
              CSRD, bilan carbone, piste d'audit — tout ce dont votre équipe RSE a besoin, dans un seul outil.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: BarChart3, label: '22 modules', sub: 'intégrés' },
                { icon: Shield, label: '82 exigences', sub: 'ESRS couvertes' },
                { icon: Lock, label: 'SHA-256', sub: 'journal détaillé' },
                { icon: Globe, label: '100% France', sub: 'RGPD natif' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <Icon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">{label}</div>
                    <div className="text-xs text-slate-400">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-sm text-slate-200 italic leading-relaxed mb-4">
                "ESG Flow a transformé notre conformité CSRD. Ce qui prenait des semaines se fait maintenant en heures."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">SM</div>
                <div>
                  <div className="text-sm font-semibold text-white">Sophie Martineau</div>
                  <div className="text-xs text-slate-400">Directrice RSE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom trust */}
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> ISO 27001</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> RGPD</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> ISAE 3000</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> SOC 2</span>
          </div>
        </div>
      </div>

      {/* ── Right login panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex items-center justify-between p-6">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-gray-900">ESG<span className="text-emerald-600"> FLOW</span></span>
          </Link>
          <div className="lg:block" />
          <LanguageSelector />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[420px]">

            {requires2fa ? (
              /* ── 2FA step ──────────────────────────────── */
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Vérification en deux étapes</h1>
                  <p className="text-gray-500">Entrez le code à 6 chiffres de votre application d'authentification.</p>
                </div>

                <form onSubmit={handleTotpSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Code TOTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      className="w-full text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl py-4 outline-none transition-all bg-white"
                    />
                    <p className="text-xs text-gray-400 mt-2 text-center">Vous pouvez aussi entrer un code de secours.</p>
                  </div>

                  <Button type="submit" disabled={totpLoading || totpCode.length < 6} className="w-full flex items-center justify-center gap-2">
                    {totpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Vérifier
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setRequires2fa(false); setTotpCode(''); setError(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ← Retour à la connexion
                  </button>
                </form>
              </div>
            ) : (
              /* ── Login form ────────────────────────────── */
              <div>
                <div className="mb-8">
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                    {t('auth.welcomeBack')}
                  </h1>
                  <p className="text-gray-500">{t('auth.signInToContinue')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('auth.email')}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="vous@entreprise.com"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                        {t('auth.password')}
                      </label>
                      <Link to="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t('auth.login')}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">{t('auth.or')}</span>
                  </div>
                </div>

                {/* Register CTA */}
                <Link to="/register" className="block">
                  <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-all hover:shadow-sm">
                    <UserPlus className="h-4 w-4" />
                    {t('auth.createNewAccount')}
                  </button>
                </Link>

                {/* Trust line */}
                <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-400">
                  {[
                    { icon: Lock, text: 'Chiffrement AES-256' },
                    { icon: Shield, text: 'RGPD conforme' },
                    { icon: CheckCircle, text: '99.9% SLA' },
                  ].map(({ icon: Icon, text }) => (
                    <span key={text} className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
