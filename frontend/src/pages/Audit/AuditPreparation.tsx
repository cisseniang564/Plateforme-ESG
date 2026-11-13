/**
 * AuditPreparation — Portail audit CSRD interne (équipe RSE)
 *
 * Permet à l'équipe RSE de :
 *  - Inviter un auditeur externe (email, nom, cabinet, durée)
 *  - Suivre le statut de la revue (pending → in_review → approved/rejected)
 *  - Consulter les commentaires reçus de l'auditeur
 *
 * Route : /app/audit/preparation  (JWT obligatoire)
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Send, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Info, Building2, Mail, Calendar, Download,
  RefreshCw, Printer, User, Copy,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();


// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';

interface Review {
  id: string;
  auditor_email: string;
  auditor_name: string | null;
  auditor_firm: string | null;
  status: ReviewStatus;
  invited_at: string;
  expires_at: string | null;
  completed_at: string | null;
  decision_note: string | null;
  data_locked_at: string | null;
  invitation_token: string | null;
  public_url: string | null;
  comments_count: number;
  critical_count: number;
}

interface Comment {
  id: string;
  section_code: string;
  severity: 'info' | 'warning' | 'critical';
  body: string;
  resolved: boolean;
  created_at: string;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const getStatusStyles = (t: TFunction): Record<ReviewStatus, { bg: string; text: string; border: string; label: string }> => ({
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  label: t('audit.stPending', 'En attente') },
  in_review: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   label: t('audit.stInReview', 'En revue') },
  approved:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',label: t('audit.stApproved', 'Approuvé') },
  rejected:  { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    label: t('audit.stRejected', 'Rejeté') },
  expired:   { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200',   label: t('audit.stExpired', 'Expiré') },
});

const getSeverityStyles = (t: TFunction): Record<'info' | 'warning' | 'critical', { bg: string; text: string; border: string; icon: any; label: string }> => ({
  info:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: Info,           label: 'Information' },
  warning:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: AlertTriangle,  label: t('audit.sevWarning', 'Avertissement') },
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: XCircle,        label: t('audit.sevCritical', 'Critique') },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dtLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(dtLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(dtLocale(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}


function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReviewStatus }) {
  const { t } = useTranslation();
  const STATUS_STYLES = getStatusStyles(t);
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text} ${s.border}`}>
      {status === 'pending'   && <Clock className="h-3 w-3" />}
      {status === 'in_review' && <RefreshCw className="h-3 w-3 animate-spin" />}
      {status === 'approved'  && <CheckCircle2 className="h-3 w-3" />}
      {status === 'rejected'  && <XCircle className="h-3 w-3" />}
      {status === 'expired'   && <AlertTriangle className="h-3 w-3" />}
      {s.label}
    </span>
  );
}

// ─── Modale pièces justificatives ─────────────────────────────────────────────

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AuditPreparation() {
  const { t } = useTranslation();
  const SEVERITY_STYLES = getSeverityStyles(t);
  // ── State data ──────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [review, setReview]         = useState<Review | null>(null);
  const [comments, setComments]     = useState<Comment[]>([]);

  // ── Invitation form ─────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteName, setInviteName]     = useState('');
  const [inviteFirm, setInviteFirm]     = useState('');
  const [expiryDate, setExpiryDate]     = useState(defaultExpiry);
  const [sending, setSending]           = useState(false);

  // ── Computed ────────────────────────────────────────────────────────────────
  const isReviewActive = review && ['pending', 'in_review'].includes(review.status);
  const showComments   = review && ['in_review', 'approved', 'rejected'].includes(review.status);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auditor-reviews');
      const items: Review[] = res.data?.items ?? [];
      // Take the most recent non-expired review
      const active = items.find(r => r.status !== 'expired') ?? items[0] ?? null;
      setReview(active);

      // If we have a review, try to load its comments via public endpoint or leave empty
      if (active?.invitation_token) {
        try {
          const pubRes = await api.get(`/auditor-reviews/public/${active.invitation_token}`);
          setComments(pubRes.data?.comments ?? []);
        } catch {
          setComments([]);
        }
      }
    } catch {
      // 404 or empty — silent: just show the empty state
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // ── Invitation ───────────────────────────────────────────────────────────────
  const sendInvitation = async () => {
    if (!inviteEmail.trim()) { toast.error(t('audit.emailRequired', 'Email obligatoire')); return; }
    setSending(true);
    try {
      const expiresInDays = Math.min(90, Math.max(1, Math.round(
        (new Date(expiryDate).getTime() - Date.now()) / 86_400_000
      )));
      const res = await api.post('/auditor-reviews', {
        auditor_email: inviteEmail.trim(),
        auditor_name:  inviteName.trim() || undefined,
        auditor_firm:  inviteFirm.trim() || undefined,
        expires_in_days: expiresInDays,
      });
      setReview(res.data as Review);
      if (res.data?.email_queued === false) {
        toast(t('audit.invitationNoMail', "Invitation créée, mais l'e-mail n'a pas pu être mis en file d'envoi. Copiez le lien et transmettez-le à l'auditeur."), { duration: 9000 });
      } else {
        toast.success(t('audit.invitationSent', "Invitation créée. L'e-mail est en cours d'envoi."));
      }
      setInviteEmail(''); setInviteName(''); setInviteFirm('');
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? t('audit.sendError', "Erreur lors de l'envoi");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Download report ──────────────────────────────────────────────────────────
  const downloadReport = () => {
    if (!review?.invitation_token) return;
    window.open(`/api/v1/auditor-reviews/public/${review.invitation_token}/download`, '_blank', 'noopener');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('audit.portalTitle', 'Portail Audit CSRD')}</h1>
            <p className="text-sm text-gray-500">{t('audit.fiscalYear', 'Exercice {{year}} · Dossier de préparation', { year: CURRENT_YEAR })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {review && <StatusBadge status={review.status} />}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            {t('audit.print', 'Imprimer')}
          </button>
          {review?.invitation_token && (
            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('audit.downloadReport', 'Télécharger le rapport')}
            </button>
          )}
        </div>
      </div>

      {/* ── Section 1 — Invitation auditeur ─────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
            <User className="h-4 w-4 text-gray-400" />
            {t('audit.externalAuditor', 'Auditeur externe')}
          </h2>
        </div>

        {review ? (
          /* Invitation déjà envoyée */
          <div className="px-5 py-5">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('audit.auditor', 'Auditeur')}</p>
                  <p className="font-semibold text-gray-800 truncate">
                    {review.auditor_name || review.auditor_email}
                  </p>
                  {review.auditor_firm && (
                    <p className="text-xs text-gray-500">{review.auditor_firm}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="text-gray-800 truncate">{review.auditor_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Expiration</p>
                  <p className="text-gray-800">{fmtDate(review.expires_at)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <StatusBadge status={review.status} />
                <p className="text-xs text-gray-400">{t('audit.invitedOn', 'Invité le {{date}}', { date: fmtDate(review.invited_at) })}</p>
                {isReviewActive && review.public_url && (
                  <a
                    href={review.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:underline font-medium"
                  >
                    {t('audit.openAuditorLink', 'Ouvrir le lien auditeur')}
                  </a>
                )}
                {isReviewActive && review.public_url && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}${review.public_url}`)
                        .then(() => toast.success(t('audit.linkCopied', 'Lien copié')))
                        .catch(() => toast.error(t('audit.linkCopyError', 'Copie impossible')));
                    }}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
                  >
                    <Copy className="h-3 w-3" />{t('audit.copyAuditorLink', 'Copier le lien')}
                  </button>
                )}
              </div>
            </div>

            {review.decision_note && (
              <div className="mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('audit.auditorNote', "Note de l'auditeur")}</p>
                <p className="text-sm text-gray-800 italic">« {review.decision_note} »</p>
              </div>
            )}
          </div>
        ) : (
          /* Formulaire d'invitation */
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm text-gray-500">
              {t('audit.inviteDesc', "Invitez un commissaire aux comptes ou un auditeur tiers pour qu'il accède au dossier CSRD et rende son avis.")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Mail className="inline h-3 w-3 mr-1" />
                  {t('audit.auditorEmail', 'Email auditeur')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder={t('audit.auditorEmailPh', 'auditeur@cabinet.fr')}
                  className="w-full px-3 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <User className="inline h-3 w-3 mr-1" />
                  {t('audit.fullName', 'Nom complet')}
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder={t('audit.fullNamePh', 'Prénom NOM')}
                  className="w-full px-3 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Building2 className="inline h-3 w-3 mr-1" />
                  {t('audit.firm', 'Cabinet (optionnel)')}
                </label>
                <input
                  type="text"
                  value={inviteFirm}
                  onChange={e => setInviteFirm(e.target.value)}
                  placeholder="Deloitte, KPMG…"
                  className="w-full px-3 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  {t('audit.linkExpiry', 'Expiration du lien')}
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={sendInvitation}
                disabled={sending || !inviteEmail.trim()}
                className="inline-flex items-center gap-2 px-5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('audit.sendInvitation', "Envoyer l'invitation")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3 — Commentaires de l'auditeur ──────────────────────────── */}
      {showComments && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
              {t('audit.auditorObservations', "Observations de l'auditeur")}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('audit.commentCount', '{{count}} commentaire{{s}}', { count: comments.length, s: comments.length !== 1 ? 's' : '' })}</span>
              {review?.critical_count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {t('audit.criticalCount', '{{count}} critique{{s}}', { count: review.critical_count, s: review.critical_count > 1 ? 's' : '' })}
                </span>
              )}
            </div>
          </div>

          {comments.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              {t('audit.noObservations', 'Aucune observation reçue pour le moment.')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {comments.map(c => {
                const s = SEVERITY_STYLES[c.severity];
                const SevIcon = s.icon;
                return (
                  <div key={c.id} className={`flex items-start gap-3 px-5 py-4 ${s.bg}`}>
                    <SevIcon className={`h-4 w-4 ${s.text} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white">
                          {c.section_code}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${s.text}`}>
                          {s.label}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {fmtDateTime(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── État vide — aucun dossier ────────────────────────────────────────── */}
      {!review && !loading && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">{t('audit.noDossier', "Aucun dossier d'audit en cours")}</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {t('audit.noDossierDesc', "Commencez par inviter un auditeur externe ci-dessus pour démarrer votre revue CSRD de l'exercice {{year}}.", { year: CURRENT_YEAR })}
          </p>
        </div>
      )}

    </div>
  );
}
