import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/common/Button';
import LanguageSelector from '@/components/LanguageSelector';
import { UserPlus, Shield, Loader2 } from 'lucide-react';
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

  // 2FA state
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
        // Redirige vers la page 2FA dédiée avec le token temporaire
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-lg mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ESGFlow</h1>
          <p className="text-gray-600 mt-2">Sustainable Performance Management</p>
        </div>

        {/* ── 2FA step ──────────────────────────────────────── */}
        {requires2fa ? (
          <form onSubmit={handleTotpSubmit} className="space-y-5">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Vérification en deux étapes</p>
                <p className="text-xs text-emerald-700">Entrez le code à 6 chiffres de votre application.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code TOTP</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-300 focus:border-emerald-500 rounded-xl py-4 outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">Vous pouvez aussi entrer un code de secours.</p>
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
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {t('auth.welcomeBack')}
                </h2>
                <p className="text-gray-600">{t('auth.signInToContinue')}</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="admin@demo.esgflow.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? t('common.loading') : t('auth.login')}
              </Button>
            </form>

            {/* Register link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                {t('auth.noAccount')}{' '}
                <Link
                  to="/register"
                  className="text-primary-600 hover:text-primary-700 font-semibold hover:underline"
                >
                  {t('auth.registerFree')}
                </Link>
              </p>

              {/* Separator */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t('auth.or')}</span>
                </div>
              </div>

              {/* CTA button for registration */}
              <Link to="/register">
                <Button variant="secondary" className="w-full">
                  <UserPlus className="h-5 w-5 mr-2" />
                  {t('auth.createNewAccount')}
                </Button>
              </Link>
            </div>

            <div className="mt-6 text-center">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}