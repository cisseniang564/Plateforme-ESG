import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ||
        'Une erreur est survenue. Veuillez réessayer.'
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
              <h1 className="text-xl font-bold text-white mb-2">E-mail envoyé !</h1>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Si <span className="text-white font-medium">{email}</span> est enregistré,
                vous recevrez un lien de réinitialisation valable <strong className="text-white">1 heure</strong>.
              </p>
              <p className="text-xs text-slate-500 mb-6">Vérifiez aussi votre dossier spam.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Mot de passe oublié ?</h1>
                <p className="text-slate-400 text-sm mt-2">
                  Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Adresse e-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="vous@entreprise.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-green-400/60 focus:bg-white/10 transition-all text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-bold text-sm transition-all shadow-xl shadow-green-500/30 mt-2"
                >
                  {status === 'loading' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
