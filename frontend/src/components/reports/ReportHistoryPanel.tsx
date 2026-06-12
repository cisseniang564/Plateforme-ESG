/**
 * ReportHistoryPanel — lists past generated reports for the current tenant,
 * with one-click re-download, share-link generation, and revocation.
 */
import { useEffect, useState } from 'react';
import {
  History, Download, Share2, Trash2, Copy, Check, ExternalLink,
  X, AlertCircle, Clock, ShieldCheck, Send,
} from 'lucide-react';
import api from '@/services/api';
import Spinner from '@/components/common/Spinner';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

interface HistoryItem {
  id: string;
  report_type: string;
  format: string;
  period: string;
  year: number | null;
  file_size: number | null;
  content_hash: string | null;
  version: number;
  share_active: boolean;
  share_token: string | null;
  share_expires_at: string | null;
  created_at: string;
}

function fmtSize(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) +
         ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

const FORMAT_LABEL: Record<string, string> = { pdf: 'PDF', excel: 'XLSX', word: 'DOCX', json: 'JSON' };

function getTypeLabelMap(t: TFunction): Record<string, string> {
  return {
    csrd: 'CSRD', sfdr: 'SFDR', dpef: 'DPEF',
    carbon: t('rephist.typeCarbon', 'Bilan Carbone'),
    ghg: 'GHG',
    executive: t('rephist.typeExec', 'Exécutif'),
    detailed: t('rephist.typeDetailed', 'Détaillé'),
    gri: 'GRI', tcfd: 'TCFD',
  };
}

export default function ReportHistoryPanel() {
  const { t } = useTranslation();
  const [items, setItems]       = useState<HistoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState<HistoryItem | null>(null);
  const [shareUrl, setShareUrl]   = useState<string>('');
  const [shareCopied, setShareCopied] = useState(false);

  const [inviteOpen, setInviteOpen]       = useState<HistoryItem | null>(null);
  const [auditorEmail, setAuditorEmail]   = useState('');
  const [auditorName, setAuditorName]     = useState('');
  const [auditorFirm, setAuditorFirm]     = useState('');
  const [inviteExpiry, setInviteExpiry]   = useState(14);
  const [inviting, setInviting]           = useState(false);
  const [inviteResult, setInviteResult]   = useState<{ url: string; expires: string } | null>(null);

  const TYPE_LABEL = getTypeLabelMap(t);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/reports/history', { params: { limit: 50 } });
      setItems(res.data?.items ?? []);
    } catch {
      setError(t('rephist.errLoad', "Impossible de charger l'historique."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const redownload = async (it: HistoryItem) => {
    setActingId(it.id);
    try {
      const res = await api.post(
        '/reports/generate',
        { report_type: it.report_type, period: it.period, year: it.year, format: it.format },
        { responseType: 'blob' },
      );
      const ext = it.format === 'excel' ? 'xlsx' : it.format === 'word' ? 'docx' : it.format;
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${it.report_type}_${it.year ?? 'annuel'}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      load();
    } catch {
      setError(t('rephist.errRegen', 'Régénération impossible.'));
    } finally {
      setActingId(null);
    }
  };

  const createShare = async (it: HistoryItem, hours = 72) => {
    setActingId(it.id);
    try {
      const res = await api.post(`/reports/history/${it.id}/share`, { expires_in_hours: hours });
      const path: string = res.data?.public_path ?? '';
      const full = window.location.origin + path;
      setShareUrl(full);
      setShareOpen({ ...it, share_active: true, share_token: res.data?.token, share_expires_at: res.data?.expires_at });
      load();
    } catch {
      setError(t('rephist.errShare', 'Création du lien impossible.'));
    } finally {
      setActingId(null);
    }
  };

  const revokeShare = async (it: HistoryItem) => {
    setActingId(it.id);
    try {
      await api.delete(`/reports/history/${it.id}/share`);
      if (shareOpen?.id === it.id) setShareOpen(null);
      load();
    } catch {
      setError(t('rephist.errRevoke', 'Révocation impossible.'));
    } finally {
      setActingId(null);
    }
  };

  const deleteEntry = async (it: HistoryItem) => {
    if (!window.confirm(t('rephist.confirmDelete', "Supprimer cette entrée de l'historique ?"))) return;
    setActingId(it.id);
    try {
      await api.delete(`/reports/history/${it.id}`);
      setItems(prev => prev.filter(x => x.id !== it.id));
    } catch {
      setError(t('rephist.errDel', 'Suppression impossible.'));
    } finally {
      setActingId(null);
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
  };

  const submitInvite = async () => {
    if (!inviteOpen || !auditorEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.post('/auditor-reviews', {
        auditor_email: auditorEmail.trim(),
        auditor_name: auditorName.trim() || undefined,
        auditor_firm: auditorFirm.trim() || undefined,
        report_history_id: inviteOpen.id,
        expires_in_days: inviteExpiry,
      });
      const url = window.location.origin + (res.data?.public_url || `/audit/review/${res.data?.invitation_token}`);
      setInviteResult({ url, expires: res.data?.expires_at || '' });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || t('rephist.errInvite', "Échec de l'invitation.");
      setError(typeof msg === 'string' ? msg : t('rephist.errGeneric', 'Échec.'));
    } finally {
      setInviting(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(null);
    setAuditorEmail(''); setAuditorName(''); setAuditorFirm('');
    setInviteExpiry(14);
    setInviteResult(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <History className="h-4 w-4 text-gray-500" />
          {t('rephist.title', 'Historique des rapports générés')}
        </h3>
        <span className="text-xs text-gray-400">{t('rephist.entryCount', '{{n}} entrée{{s}}', { n: items.length, s: items.length > 1 ? 's' : '' })}</span>
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 px-6">
          <History className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">{t('rephist.noReports', 'Aucun rapport généré pour le moment')}</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {t('rephist.noReportsDesc', 'Les rapports que vous générez apparaîtront ici. Vous pourrez les re-télécharger ou les partager par lien.')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map(it => (
            <div key={it.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-black text-emerald-700">{FORMAT_LABEL[it.format] ?? it.format.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate flex items-center gap-2">
                  {TYPE_LABEL[it.report_type] ?? it.report_type.toUpperCase()}
                  {it.year ? ` · ${it.year}` : ''}
                  {it.version > 1 && (
                    <span className="ml-1 inline-flex px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                      v{it.version}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
                  <Clock className="h-3 w-3" />
                  {fmtDate(it.created_at)}
                  <span className="text-gray-300">·</span>
                  {fmtSize(it.file_size)}
                  {it.content_hash && (
                    <span
                      className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-mono cursor-help"
                      title={`SHA-256: ${it.content_hash}`}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(it.content_hash!); }}
                    >
                      🔐 {it.content_hash.slice(0, 10)}…
                    </span>
                  )}
                  {it.share_active && (
                    <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                      <Share2 className="h-2.5 w-2.5" />
                      {t('rephist.linkActive', 'Lien actif')}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => redownload(it)} disabled={actingId === it.id}
                  title={t('rephist.redownload', 'Re-télécharger')} aria-label={t('rephist.redownload', 'Re-télécharger')}
                  className="inline-flex items-center justify-center h-9 w-9 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50">
                  {actingId === it.id ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                </button>
                {it.share_active ? (
                  <button type="button" onClick={() => revokeShare(it)} disabled={actingId === it.id}
                    title={t('rephist.revokeShare', 'Révoquer le lien de partage')} aria-label={t('rephist.revokeLabel', 'Révoquer le lien')}
                    className="inline-flex items-center justify-center h-9 w-9 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50">
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={() => createShare(it)} disabled={actingId === it.id}
                    title={t('rephist.createShare', 'Créer un lien de partage (72h)')} aria-label={t('rephist.share', 'Partager')}
                    className="inline-flex items-center justify-center h-9 w-9 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => setInviteOpen(it)} disabled={actingId === it.id}
                  title={t('rephist.inviteTitle', 'Inviter un auditeur (CAC, Big 4)')} aria-label={t('rephist.inviteLabel', 'Inviter un auditeur')}
                  className="inline-flex items-center justify-center h-9 w-9 text-gray-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => deleteEntry(it)} disabled={actingId === it.id}
                  title={t('rephist.deleteTitle', "Supprimer de l'historique")} aria-label={t('rephist.delete', 'Supprimer')}
                  className="inline-flex items-center justify-center h-9 w-9 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShareOpen(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-blue-100 rounded-xl flex-shrink-0"><Share2 className="h-5 w-5 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{t('rephist.shareCreated', 'Lien de partage créé')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('rephist.shareAnyone', 'Toute personne avec ce lien peut télécharger le rapport')}
                  {shareOpen.share_expires_at && (
                    <> {t('rephist.shareUntil', "jusqu'au")} <span className="font-semibold text-gray-700">{new Date(shareOpen.share_expires_at).toLocaleString(i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR')}</span></>
                  )}.
                </p>
              </div>
            </div>
            <div className="flex items-stretch gap-2 mb-4">
              <input type="text" readOnly value={shareUrl} onFocus={e => e.currentTarget.select()}
                className="flex-1 px-3 py-2 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={copyShareUrl}
                className="inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                {shareCopied ? <><Check className="h-4 w-4" />{t('rephist.copied', 'Copié !')}</> : <><Copy className="h-4 w-4" />{t('rephist.copy', 'Copier')}</>}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{t('rephist.shareNote', 'Le rapport est régénéré à chaque ouverture du lien — toujours les données les plus récentes.')}</span>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 h-9 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <ExternalLink className="h-4 w-4" />{t('rephist.test', 'Tester')}
              </a>
              <button type="button" onClick={() => setShareOpen(null)}
                className="px-4 h-9 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                {t('rephist.close', 'Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auditor invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !inviting && closeInvite()}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-violet-100 rounded-xl flex-shrink-0"><ShieldCheck className="h-5 w-5 text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900">
                  {inviteResult ? t('rephist.inviteSent', 'Invitation envoyée') : t('rephist.inviteAuditor', 'Inviter un auditeur')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {inviteResult
                    ? t('rephist.inviteOkDesc', "L'auditeur va recevoir un email avec le lien d'accès.")
                    : t('rephist.inviteDesc', "L'auditeur (commissaire aux comptes, Big 4) recevra un email avec un lien unique pour consulter le rapport, commenter section par section, et émettre sa décision.")}
                </p>
              </div>
            </div>

            {!inviteResult ? (
              <>
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('rephist.emailLabel', 'Email auditeur *')}</label>
                    <input type="email" value={auditorEmail} onChange={e => setAuditorEmail(e.target.value)}
                      placeholder="auditeur@exemple.com"
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('rephist.nameLabel', 'Nom')}</label>
                      <input type="text" value={auditorName} onChange={e => setAuditorName(e.target.value)}
                        placeholder="Jean Martin"
                        className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('rephist.firmLabel', 'Cabinet')}</label>
                      <input type="text" value={auditorFirm} onChange={e => setAuditorFirm(e.target.value)}
                        placeholder="Ex : KPMG, Mazars…"
                        className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('rephist.validity', 'Validité du lien')}</label>
                    <select value={inviteExpiry} onChange={e => setInviteExpiry(parseInt(e.target.value))}
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value={7}>{t('rephist.days7', '7 jours')}</option>
                      <option value={14}>{t('rephist.days14', '14 jours (recommandé)')}</option>
                      <option value={30}>{t('rephist.days30', '30 jours')}</option>
                      <option value={60}>{t('rephist.days60', '60 jours')}</option>
                      <option value={90}>{t('rephist.days90', '90 jours')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeInvite} disabled={inviting}
                    className="px-4 h-10 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50">
                    {t('rephist.cancel', 'Annuler')}
                  </button>
                  <button type="button" onClick={submitInvite} disabled={inviting || !auditorEmail.trim()}
                    className="inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50">
                    {inviting ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                    {t('rephist.sendInvite', "Envoyer l'invitation")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 mb-4">
                  <p className="text-xs font-bold text-violet-900 mb-2">{t('rephist.directLink', "Lien d'accès direct (à conserver)")}</p>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={inviteResult.url} onFocus={e => e.currentTarget.select()}
                      className="flex-1 px-3 py-2 text-xs font-mono text-gray-700 bg-white border border-violet-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    <button type="button" onClick={() => navigator.clipboard.writeText(inviteResult.url)}
                      className="inline-flex items-center gap-1 px-3 h-9 text-xs font-semibold text-violet-700 bg-white border border-violet-200 hover:bg-violet-100 rounded transition-colors">
                      <Copy className="h-3.5 w-3.5" />{t('rephist.copy', 'Copier')}
                    </button>
                  </div>
                  {inviteResult.expires && (
                    <p className="text-xs text-violet-600 mt-2">
                      {t('rephist.expiresAt', 'Expire le')} {new Date(inviteResult.expires).toLocaleString(i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR')}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={closeInvite}
                    className="px-4 h-10 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                    {t('rephist.done', 'Terminé')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
