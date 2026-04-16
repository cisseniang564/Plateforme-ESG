import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Loader2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { setUser } from '@/store/slices/authSlice';

// ─── OTP Input (same as TwoFactorSetup) ───────────────────────────────────────
import { useRef } from 'react';

function OTPInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const newVal = value.split('');
    newVal[i] = digit;
    const joined = newVal.join('').padEnd(6, '');
    onChange(joined.slice(0, 6));
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted.padEnd(6, '')); inputRefs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={i === 0}
          className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
            ${disabled ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}
            ${value[i] ? 'border-emerald-400 text-emerald-700' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TwoFactorVerify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  // temp_token is passed via location.state from Login page
  const tempToken: string | undefined = (location.state as any)?.temp_token;

  useEffect(() => {
    if (!tempToken) {
      navigate('/login', { replace: true });
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const totpCode = useBackup ? backupCode.trim() : code;
    if (!totpCode || (!useBackup && totpCode.length !== 6)) return;

    setLoading(true);
    setError('');

    try {
      const result = await authService.verify2FA(tempToken!, totpCode);
      if (result.user) dispatch(setUser(result.user));
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail ?? t('2fa.verifyError', 'Code incorrect. Réessayez.'));
      setCode('');
      setBackupCode('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (!useBackup && code.replace(/\s/g, '').length === 6) {
      handleSubmit();
    }
  }, [code, useBackup]);

  if (!tempToken) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800 flex flex-col items-center justify-center px-4">
      {/* Back */}
      <div className="w-full max-w-md mb-4">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToLogin', 'Retour à la connexion')}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-900/40 mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {t('2fa.verifyTitle', 'Vérification 2FA')}
          </h1>
          <p className="text-white/60 text-sm mt-2">
            {t('2fa.verifySubtitle', 'Entrez le code affiché par votre application d\'authentification')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {!useBackup ? (
              /* TOTP code */
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-600">
                  {t('2fa.enterCode', 'Code à 6 chiffres')}
                </p>
                <OTPInput value={code} onChange={setCode} disabled={loading} />
              </div>
            ) : (
              /* Backup code */
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('2fa.backupCodeLabel', 'Code de secours')}
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="XXXX-XXXX"
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center font-mono text-lg tracking-widest"
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {useBackup && (
              <button
                type="submit"
                disabled={!backupCode.trim() || loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {t('2fa.verifyBackup', 'Vérifier le code de secours')}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setUseBackup((v) => !v); setCode(''); setBackupCode(''); setError(''); }}
              className="w-full text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {useBackup
                ? t('2fa.useTotp', '← Utiliser l\'application d\'authentification')
                : t('2fa.useBackup', 'Utiliser un code de secours')
              }
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
            {t('2fa.codeExpiry', 'Les codes TOTP sont valides 30 secondes. Assurez-vous que l\'heure de votre appareil est correcte.')}
          </div>
        </div>
      </div>
    </div>
  );
}
