import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import api from '@/services/api';

type State = 'loading' | 'success' | 'already' | 'error';

export default function EmailVerification() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [email, setEmail] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setErrMsg(t('auth.noVerificationToken'));
      return;
    }
    verifyToken(token);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const res = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
      setEmail(res.data.email || '');
      setState(res.data.already_verified ? 'already' : 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || t('auth.invalidOrExpiredLink');
      setErrMsg(msg);
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-1 h-8 bg-emerald-500 rounded-full" />
            <span className="text-2xl font-bold text-white tracking-tight">ESGFlow</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {state === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t('auth.verifyingTitle')}</h1>
              <p className="text-gray-500 text-sm">{t('auth.verifyingDesc')}</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t('auth.emailVerifiedTitle')}</h1>
              {email && <p className="text-gray-500 text-sm mb-1"><strong>{email}</strong></p>}
              <p className="text-gray-500 text-sm mb-6">
                {t('auth.emailVerifiedDesc')}
              </p>
              <button
                onClick={() => navigate('/app')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
              >
                {t('auth.accessPlatform')} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {state === 'already' && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t('auth.alreadyVerifiedTitle')}</h1>
              <p className="text-gray-500 text-sm mb-6">
                {t('auth.alreadyVerifiedDesc')}
              </p>
              <button
                onClick={() => navigate('/app')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                {t('auth.accessPlatform')} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t('auth.invalidLinkTitle')}</h1>
              <p className="text-gray-500 text-sm mb-2">{errMsg}</p>
              <p className="text-gray-400 text-xs mb-6">
                {t('auth.linkExpiredHint')}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors"
                >
                  {t('auth.login')}
                </button>
                <button
                  onClick={() => navigate('/app/profile')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Mail className="h-4 w-4" />{t('auth.resendVerificationEmail')}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          {t('auth.platformFooter')}
        </p>
      </div>
    </div>
  );
}
