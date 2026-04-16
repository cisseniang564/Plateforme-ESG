import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import api from '@/services/api';

const RULES = [
  { label: '8 caractères minimum', test: (v: string) => v.length >= 8 },
  { label: '1 majuscule', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 chiffre', test: (v: string) => /\d/.test(v) },
];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Token absent → redirect
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const allRulesPass = RULES.every(r => r.test(password));
  const canSubmit = allRulesPass && password === confirm && !status.includes('loading');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setStatus('success');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ||
        'Token invalide ou expiré. Demandez un nouveau lien.'
      );
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-950 to-emerald-900 px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />

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

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* ── Success ── */}
          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Mot de passe mis à jour !</h1>
              <p className="text-slate-400 text-sm mb-4">
                Vous allez être redirigé vers la connexion dans quelques secondes…
              </p>
              <Link to="/login" className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors">
                Connexion →
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-7 w-7 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
                <p className="text-slate-400 text-sm mt-2">Choisissez un mot de passe fort.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-green-400/60 transition-all text-sm"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Rules */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      {RULES.map(r => (
                        <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(password) ? 'text-green-400' : 'text-slate-500'}`}>
                          {r.test(password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 focus:outline-none transition-all text-sm ${
                      confirm && confirm !== password
                        ? 'border-red-400/50 bg-red-500/5'
                        : 'border-white/15 focus:border-green-400/60'
                    }`}
                    style={{ background: confirm && confirm !== password ? undefined : 'rgba(255,255,255,0.05)' }}
                  />
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-xl shadow-green-500/30 mt-2"
                >
                  {status === 'loading' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Mise à jour…</>
                  ) : (
                    'Réinitialiser le mot de passe'
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Renvoyer un nouveau lien
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
