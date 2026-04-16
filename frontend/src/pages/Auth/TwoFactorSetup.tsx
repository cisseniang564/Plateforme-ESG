import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  ShieldCheck,
  Copy,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Key,
  Smartphone,
} from 'lucide-react';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupData {
  secret: string;
  uri: string;
}

type Step = 'setup' | 'confirm' | 'backup';

// ─── QR code via API publique qrserver.com ────────────────────────────────────
function QRCodeImage({ uri }: { uri: string }) {
  const encoded = encodeURIComponent(uri);
  const src = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200&margin=10`;
  return (
    <img
      src={src}
      alt="QR Code 2FA"
      className="w-48 h-48 rounded-xl border-4 border-white shadow-lg"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
        ${done ? 'bg-emerald-500 text-white' : active ? 'bg-white text-slate-900 ring-2 ring-white/60' : 'bg-white/20 text-white/50'}`}>
        {done ? <CheckCircle className="h-4 w-4" /> : label}
      </div>
    </div>
  );
}

// ─── OTP input (6 digits) ─────────────────────────────────────────────────────
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
          className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
            ${disabled ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}
            ${value[i] ? 'border-emerald-400 text-emerald-700' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TwoFactorSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'secret' | 'codes' | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Fetch setup data on mount
  useEffect(() => {
    api.get('/auth/2fa/setup')
      .then((r) => setSetupData(r.data))
      .catch(() => setError(t('2fa.setupLoadError', 'Impossible de charger la configuration 2FA')))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = async (text: string, type: 'secret' | 'codes') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      const r = await api.post('/auth/2fa/enable', { totp_code: code });
      setBackupCodes(r.data.backup_codes ?? []);
      setStep('backup');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? t('2fa.invalidCode', 'Code incorrect, réessayez.'));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800 flex flex-col items-center justify-center px-4 py-12">
      {/* Back button */}
      <div className="w-full max-w-lg mb-4">
        <button
          onClick={() => navigate('/app/profile')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Retour au profil')}
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold">{t('2fa.setupTitle', 'Authentification à deux facteurs')}</h1>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-3">
            <StepDot label="1" active={step === 'setup'} done={step === 'confirm' || step === 'backup'} />
            <div className={`flex-1 h-0.5 rounded ${step !== 'setup' ? 'bg-white' : 'bg-white/30'}`} />
            <StepDot label="2" active={step === 'confirm'} done={step === 'backup'} />
            <div className={`flex-1 h-0.5 rounded ${step === 'backup' ? 'bg-white' : 'bg-white/30'}`} />
            <StepDot label="3" active={step === 'backup'} done={false} />
          </div>
        </div>

        <div className="px-8 py-6">

          {/* ── Step 1 : Scan QR ────────────────────────────────────────────── */}
          {step === 'setup' && setupData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  {t('2fa.step1Title', 'Scannez le QR code')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('2fa.step1Desc', 'Ouvrez Google Authenticator, Authy ou 1Password et scannez ce code.')}
                </p>
              </div>

              {/* QR + apps */}
              <div className="flex gap-6 items-start">
                <div className="flex flex-col items-center gap-3">
                  <QRCodeImage uri={setupData.uri} />
                  <span className="text-xs text-gray-400">{t('2fa.qrHint', 'Scannez avec votre application')}</span>
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('2fa.recommendedApps', 'Applications recommandées')}
                  </p>
                  {[
                    { name: 'Google Authenticator', icon: '🔑' },
                    { name: 'Authy', icon: '🛡️' },
                    { name: 'Microsoft Authenticator', icon: '💼' },
                    { name: '1Password', icon: '🔐' },
                  ].map((app) => (
                    <div key={app.name} className="flex items-center gap-2 text-sm text-gray-700">
                      <span>{app.icon}</span>
                      <span>{app.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual secret */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  {t('2fa.cantScan', 'Impossible de scanner ? Entrez manuellement :')}
                </p>
                <div className="flex items-center gap-2">
                  <code className={`flex-1 text-sm font-mono text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 tracking-widest ${!showSecret ? 'blur-sm select-none' : ''}`}>
                    {setupData.secret}
                  </code>
                  <button onClick={() => setShowSecret((v) => !v)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    {showSecret ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(setupData.secret, 'secret')}
                    className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={t('common.copy', 'Copier')}
                  >
                    {copied === 'secret'
                      ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                      : <Copy className="h-4 w-4 text-gray-500" />
                    }
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('confirm')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                {t('2fa.iveScanned', "J'ai scanné le code")}
              </button>
            </div>
          )}

          {/* ── Step 2 : Confirm code ────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  {t('2fa.step2Title', 'Entrez le code à 6 chiffres')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('2fa.step2Desc', 'Saisissez le code affiché par votre application d\'authentification.')}
                </p>
              </div>

              <OTPInput value={code} onChange={setCode} disabled={verifying} />

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={code.length !== 6 || verifying}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {t('2fa.verifyActivate', 'Vérifier et activer')}
              </button>

              <button onClick={() => setStep('setup')} className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
                ← {t('2fa.backToQR', 'Retour au QR code')}
              </button>
            </div>
          )}

          {/* ── Step 3 : Backup codes ────────────────────────────────────────── */}
          {step === 'backup' && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    {t('2fa.saveBackupTitle', 'Sauvegardez ces codes de secours !')}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {t('2fa.saveBackupDesc', 'Si vous perdez l\'accès à votre application 2FA, ces codes vous permettront de vous connecter. Chaque code n\'est utilisable qu\'une seule fois.')}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code) => (
                    <code key={code} className="text-sm font-mono text-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'codes')}
                className="w-full py-2.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {copied === 'codes'
                  ? <><CheckCircle className="h-4 w-4" /> {t('2fa.copied', 'Copié !')}</>
                  : <><Copy className="h-4 w-4" /> {t('2fa.copyCodes', 'Copier les codes')}</>
                }
              </button>

              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-800">
                  {t('2fa.activatedSuccess', '🎉 Authentification 2FA activée avec succès !')}
                </p>
              </div>

              <button
                onClick={() => navigate('/app/profile')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Key className="h-4 w-4" />
                {t('2fa.done', 'Terminé — Retour au profil')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
