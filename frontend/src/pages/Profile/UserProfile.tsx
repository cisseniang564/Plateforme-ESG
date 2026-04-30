import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Briefcase, Lock, Shield, CheckCircle, Loader2,
  AlertCircle, Eye, EyeOff, Camera, Key, XCircle, Save, ExternalLink,
} from 'lucide-react';
import type { RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import api from '@/services/api';
import { authService } from '@/services/authService';
import BackButton from '@/components/common/BackButton';

// ─── Helper ───────────────────────────────────────────────────────────────────
function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-green-500/25">
      {initials}
    </div>
  );
}

const PWD_RULES = [
  { label: '8 caractères minimum', test: (v: string) => v.length >= 8 },
  { label: '1 majuscule', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 chiffre', test: (v: string) => /\d/.test(v) },
];

type SaveState = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────
export default function UserProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  // Email verification banner
  const [verifState, setVerifState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const isEmailVerified = !!(user as any)?.email_verified_at;

  const sendVerification = async () => {
    setVerifState('sending');
    try {
      await api.post('/auth/send-verification');
      setVerifState('sent');
    } catch {
      setVerifState('error');
      setTimeout(() => setVerifState('idle'), 4000);
    }
  };

  // Profile form
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? '');
  const [profileSave, setProfileSave] = useState<SaveState>('idle');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSave, setPwdSave] = useState<SaveState>('idle');
  const [pwdError, setPwdError] = useState('');

  // 2FA
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfa_enabled ?? false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setJobTitle((user as any).job_title ?? '');
      setMfaEnabled(user.mfa_enabled ?? false);
    }
  }, [user]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSave('loading');
    setProfileError('');
    try {
      const res = await api.patch('/auth/me', {
        first_name: firstName,
        last_name: lastName,
        job_title: jobTitle,
      });
      dispatch(setUser(res.data));
      setProfileSave('success');
      setTimeout(() => setProfileSave('idle'), 3000);
    } catch (err: any) {
      setProfileError(err?.response?.data?.detail || 'Erreur lors de la mise à jour.');
      setProfileSave('error');
    }
  };

  const allPwdRulesPass = PWD_RULES.every(r => r.test(newPwd));
  const pwdMatch = newPwd === confirmPwd;

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPwdRulesPass || !pwdMatch) return;
    setPwdSave('loading');
    setPwdError('');
    try {
      await authService.changePassword(currentPwd, newPwd);
      setPwdSave('success');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => setPwdSave('idle'), 3000);
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail || 'Mot de passe actuel incorrect.');
      setPwdSave('error');
    }
  };

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.email || 'Utilisateur';

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-6">
      <BackButton label="Retour" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      {/* ── Email verification banner ────────────────────────────────────────── */}
      {user && !isEmailVerified && (
        <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">Email non vérifié</p>
              <p className="text-xs text-amber-700 truncate">
                Vérifiez <strong>{user.email}</strong> pour sécuriser votre compte.
              </p>
            </div>
          </div>
          {verifState === 'sent' ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl flex-shrink-0">
              <CheckCircle className="h-3.5 w-3.5" /> Email envoyé
            </div>
          ) : verifState === 'error' ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl flex-shrink-0">
              <AlertCircle className="h-3.5 w-3.5" /> Erreur, réessayez
            </div>
          ) : (
            <button
              onClick={sendVerification}
              disabled={verifState === 'sending'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold transition-all flex-shrink-0"
            >
              {verifState === 'sending'
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…</>
                : <><Mail className="h-3.5 w-3.5" /> Renvoyer l'email</>}
            </button>
          )}
        </div>
      )}

      {/* ── Avatar + identity ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <AvatarPlaceholder name={displayName} />
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
              <Camera className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{displayName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                  placeholder="Prénom"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                  placeholder="Nom de famille"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full pl-10 pr-28 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
              />
              {isEmailVerified ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Vérifié
                </span>
              ) : (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" /> Non vérifié
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Contactez le support pour changer votre adresse e-mail.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fonction</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                placeholder="Directeur RSE, Responsable ESG…"
              />
            </div>
          </div>

          {profileError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {profileError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {profileSave === 'success' && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" /> Profil mis à jour
              </div>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={profileSave === 'loading'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-sm shadow-green-600/25"
              >
                {profileSave === 'loading'
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</>
                  : <><Save className="h-4 w-4" /> Enregistrer</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Sécurité : password ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Lock className="h-4.5 w-4.5 text-blue-600" style={{ width: '1.125rem', height: '1.125rem' }} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Changer de mot de passe</h2>
            <p className="text-xs text-gray-500">Utilisez un mot de passe fort unique à ESGFlow.</p>
          </div>
        </div>

        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe actuel</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                required
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="••••••••"
            />
            {newPwd && (
              <div className="mt-2 space-y-1">
                {PWD_RULES.map(r => (
                  <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(newPwd) ? 'text-green-600' : 'text-gray-400'}`}>
                    {r.test(newPwd) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              required
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                confirmPwd && !pwdMatch ? 'border-red-300 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
              }`}
              placeholder="••••••••"
            />
            {confirmPwd && !pwdMatch && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>}
          </div>

          {pwdError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {pwdError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {pwdSave === 'success' && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" /> Mot de passe mis à jour
              </div>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={!allPwdRulesPass || !pwdMatch || !currentPwd || pwdSave === 'loading'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
              >
                {pwdSave === 'loading'
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Mise à jour…</>
                  : <><Lock className="h-4 w-4" /> Mettre à jour</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Sécurité : 2FA ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-green-600" style={{ width: '1.125rem', height: '1.125rem' }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Authentification à deux facteurs</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {mfaEnabled
                  ? 'La 2FA est activée — votre compte est mieux protégé.'
                  : 'Activez la 2FA pour renforcer la sécurité de votre compte.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mfaEnabled ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <CheckCircle className="h-3.5 w-3.5" /> Activée
                </span>
                <button
                  onClick={() => navigate('/app/2fa/setup')}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition-all flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> Reconfigurer
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/app/2fa/setup')}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Activer la 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-1">Zone de danger</h2>
        <p className="text-sm text-gray-500 mb-4">Ces actions sont irréversibles.</p>
        <button
          onClick={() => window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.') && alert('Contactez support@esgflow.com pour supprimer votre compte.')}
          className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-all"
        >
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}
