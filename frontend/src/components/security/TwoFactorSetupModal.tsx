/**
 * TwoFactorSetupModal
 * Handles the full 2FA TOTP activation flow:
 *  Step 1 — Show QR code + manual key
 *  Step 2 — User enters first TOTP code to confirm
 *  Step 3 — Display backup codes (one-time view)
 */
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { X, Shield, Smartphone, Copy, Check, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { authService } from '@/services/authService';

interface Props {
  onClose: () => void;
  onEnabled: () => void;
}

type Step = 'loading' | 'qr' | 'verify' | 'backup' | 'error';

export default function TwoFactorSetupModal({ onClose, onEnabled }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('loading');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    loadSetup();
  }, []);

  const loadSetup = async () => {
    setStep('loading');
    setError('');
    try {
      const data = await authService.get2FASetup();
      setSecret(data.secret);
      setUri(data.uri);
      setStep('qr');
    } catch {
      setStep('error');
    }
  };

  const handleVerify = async () => {
    if (code.replace(/\s/g, '').length < 6) return;
    setLoading(true);
    setError('');
    try {
      const { backup_codes } = await authService.enable2FA(code.replace(/\s/g, ''));
      setBackupCodes(backup_codes);
      setStep('backup');
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('components.twoFactor.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = uri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
    : '';

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyBackups = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDone = () => {
    onEnabled();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{t('components.twoFactor.title')}</h2>
              <p className="text-xs text-slate-500">{t('components.twoFactor.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress steps */}
        {step !== 'loading' && step !== 'error' && (
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
            {(['qr', 'verify', 'backup'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? 'bg-emerald-600 text-white' :
                  ['qr', 'verify', 'backup'].indexOf(step) > i ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {i + 1}
                </div>
                {i < 2 && <div className="flex-1 h-px bg-slate-200 w-8" />}
              </div>
            ))}
            <span className="ml-2 text-xs text-slate-500">
              {step === 'qr' && t('components.twoFactor.stepQr')}
              {step === 'verify' && t('components.twoFactor.stepVerify')}
              {step === 'backup' && t('components.twoFactor.stepBackup')}
            </span>
          </div>
        )}

        <div className="p-6">
          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-slate-500">{t('components.twoFactor.generating')}</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="bg-red-50 rounded-full p-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-slate-700 font-medium text-center">{t('components.twoFactor.errorTitle')}</p>
              <button onClick={loadSetup} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">
                <RefreshCw className="w-4 h-4" /> {t('components.twoFactor.retry')}
              </button>
            </div>
          )}

          {/* Step 1: QR Code */}
          {step === 'qr' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
                <Smartphone className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  {t('components.twoFactor.qrInstructionPre')} <strong>Google Authenticator</strong>, <strong>Authy</strong>{t('components.twoFactor.qrInstructionPost')}
                </p>
              </div>

              {qrUrl && (
                <div className="flex justify-center">
                  <div className="bg-white border-2 border-slate-200 rounded-xl p-3 inline-block">
                    <img src={qrUrl} alt="QR code 2FA" width={180} height={180} className="block" />
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1.5">{t('components.twoFactor.manualKey')}</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <code className="flex-1 text-sm font-mono text-slate-700 break-all">{secret}</code>
                  <button onClick={copySecret} className="flex-shrink-0 text-slate-400 hover:text-emerald-600 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
              >
                {t('components.twoFactor.scannedCode')}
              </button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('components.twoFactor.verifyInstructionPre')} <strong>{t('components.twoFactor.verifyInstructionStrong')}</strong> {t('components.twoFactor.verifyInstructionPost')}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] border-2 border-slate-200 focus:border-emerald-500 rounded-xl py-4 outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('qr')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                >
                  ← {t('components.twoFactor.back')}
                </button>
                <button
                  onClick={handleVerify}
                  disabled={loading || code.length < 6}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('components.twoFactor.confirm')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Backup codes */}
          {step === 'backup' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t('components.twoFactor.backupTitle')}</p>
                  <p className="text-xs text-amber-700 mt-1">{t('components.twoFactor.backupDesc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-center">
                    <code className="text-sm font-mono text-slate-700">{c}</code>
                  </div>
                ))}
              </div>

              <button
                onClick={copyBackups}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-600 transition-colors"
              >
                {copiedBackup ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copiedBackup ? t('components.twoFactor.copied') : t('components.twoFactor.copyCodes')}
              </button>

              <button
                onClick={handleDone}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
              >
                {t('components.twoFactor.done')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
