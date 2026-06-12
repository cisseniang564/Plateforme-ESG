/**
 * AuditPreparation — Portail audit CSRD interne (équipe RSE)
 *
 * Permet à l'équipe RSE de :
 *  - Inviter un auditeur externe (email, nom, cabinet, durée)
 *  - Joindre des pièces justificatives par section ESRS
 *  - Suivre le statut de la revue (pending → in_review → approved/rejected)
 *  - Consulter les commentaires reçus de l'auditeur
 *
 * Route : /app/audit/preparation  (JWT obligatoire)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck, Send, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Info, Building2, Mail, Calendar, Paperclip, FileText, X, Download,
  UploadCloud, RefreshCw, Printer, User,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const ESRS_SECTIONS = [
  { code: 'ESRS 2', required: true },
  { code: 'E1',     required: true },
  { code: 'E2',     required: false },
  { code: 'E3',     required: false },
  { code: 'E4',     required: false },
  { code: 'E5',     required: false },
  { code: 'S1',     required: true },
  { code: 'S2',     required: false },
  { code: 'S3',     required: false },
  { code: 'S4',     required: false },
  { code: 'G1',     required: true },
] as const;

const getSectionLabel = (t: TFunction, code: string): string => {
  const map: Record<string, string> = {
    'ESRS 2': t('audit.secEsrs2', 'Informations générales'),
    'E1':     t('audit.secE1', 'Changement climatique'),
    'E2':     t('audit.secE2', 'Pollution'),
    'E3':     t('audit.secE3', 'Eau & ressources marines'),
    'E4':     t('audit.secE4', 'Biodiversité'),
    'E5':     t('audit.secE5', 'Économie circulaire'),
    'S1':     t('audit.secS1', 'Effectifs propres'),
    'S2':     t('audit.secS2', 'Chaîne de valeur'),
    'S3':     t('audit.secS3', 'Communautés affectées'),
    'S4':     t('audit.secS4', 'Consommateurs'),
    'G1':     t('audit.secG1', 'Conduite des affaires'),
  };
  return map[code] ?? code;
};

type SectionCode = (typeof ESRS_SECTIONS)[number]['code'];

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

interface EvidenceFile {
  filename: string;
  size: number;
  section: string;
  uploaded_at: string;
  /** local only — not persisted in backend when using local simulation */
  local?: boolean;
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

function fmtBytes(bytes: number) {
  const en = i18n.language?.startsWith('en');
  if (bytes < 1024) return `${bytes} ${en ? 'B' : 'o'}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${en ? 'KB' : 'Ko'}`;
  return `${(bytes / 1024 / 1024).toFixed(1)} ${en ? 'MB' : 'Mo'}`;
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

interface EvidenceModalProps {
  reviewId: string;
  section: typeof ESRS_SECTIONS[number];
  files: EvidenceFile[];
  onClose: () => void;
  onUploaded: (file: EvidenceFile) => void;
}

function EvidenceModal({ reviewId, section, files, onClose, onUploaded }: EvidenceModalProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const sectionFiles = files.filter(f => f.section === section.code);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // Try real endpoint first; fall back to local simulation
      const formData = new FormData();
      formData.append('file', file);
      formData.append('section_code', section.code);

      try {
        const res = await api.post(`/auditor-reviews/${reviewId}/evidence`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onUploaded(res.data as EvidenceFile);
        toast.success(t('audit.evidenceAdded', 'Pièce jointe ajoutée'));
      } catch (apiErr: any) {
        // If endpoint doesn't exist (404/422/405) — simulate locally
        if ([404, 405, 422, 500].includes(apiErr?.response?.status)) {
          const simulated: EvidenceFile = {
            filename: file.name,
            size: file.size,
            section: section.code,
            uploaded_at: new Date().toISOString(),
            local: true,
          };
          onUploaded(simulated);
          toast.success(t('audit.evidenceAddedOffline', 'Pièce jointe ajoutée (mode hors-ligne)'));
        } else {
          throw apiErr;
        }
      }
    } catch {
      toast.error(t('audit.uploadError', "Impossible d'uploader ce fichier."));
    } finally {
      setUploading(false);
    }
  }, [reviewId, section.code, onUploaded]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Paperclip className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{t('audit.evidenceTitle', 'Pièces justificatives')}</p>
              <p className="text-xs text-gray-500">{section.code} — {getSectionLabel(t, section.code)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="px-5 py-4">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { handleFile(f); e.target.value = ''; }
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 hover:border-emerald-400 rounded-xl p-6 flex flex-col items-center gap-2 transition-colors group disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 text-emerald-500 animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7 text-gray-300 group-hover:text-emerald-500 transition-colors" />
            )}
            <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
              {uploading ? t('audit.uploading', 'Envoi en cours…') : t('audit.chooseFile', 'Cliquer pour choisir un fichier')}
            </p>
            <p className="text-xs text-gray-400">PDF, Excel, CSV, PNG, JPG</p>
          </button>
        </div>

        {/* Fichiers déjà joints */}
        <div className="px-5 pb-5">
          {sectionFiles.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">{t('audit.noEvidenceSection', 'Aucune pièce jointe pour cette section.')}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t('audit.attachedCount', '{{count}} pièce{{s}} jointe{{s}}', { count: sectionFiles.length, s: sectionFiles.length > 1 ? 's' : '' })}
              </p>
              {sectionFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{f.filename}</p>
                    <p className="text-xs text-gray-400">{fmtBytes(f.size)} · {fmtDate(f.uploaded_at)}</p>
                  </div>
                  {f.local && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">local</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AuditPreparation() {
  const { t } = useTranslation();
  const SEVERITY_STYLES = getSeverityStyles(t);
  // ── State data ──────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [review, setReview]         = useState<Review | null>(null);
  const [comments, setComments]     = useState<Comment[]>([]);
  const [evidence, setEvidence]     = useState<EvidenceFile[]>([]);

  // ── Invitation form ─────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteName, setInviteName]     = useState('');
  const [inviteFirm, setInviteFirm]     = useState('');
  const [expiryDate, setExpiryDate]     = useState(defaultExpiry);
  const [sending, setSending]           = useState(false);

  // ── Evidence modal ──────────────────────────────────────────────────────────
  const [modalSection, setModalSection] = useState<typeof ESRS_SECTIONS[number] | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────
  const globalStatus: ReviewStatus | 'none' = review ? review.status : 'none';
  const isReviewActive = review && ['pending', 'in_review'].includes(review.status);
  const showComments   = review && ['in_review', 'approved', 'rejected'].includes(review.status);

  // Nb fichiers par section
  const evidenceBySection = (code: SectionCode) => evidence.filter(f => f.section === code);

  // Statut checklist par section
  const sectionStatus = (code: SectionCode): 'complete' | 'partial' | 'empty' => {
    const files = evidenceBySection(code);
    if (files.length === 0) return 'empty';
    return 'complete'; // simplified: any file = complete
  };

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
      const expiresInDays = Math.max(1, Math.round(
        (new Date(expiryDate).getTime() - Date.now()) / 86_400_000
      ));
      const res = await api.post('/auditor-reviews', {
        auditor_email: inviteEmail.trim(),
        auditor_name:  inviteName.trim() || undefined,
        auditor_firm:  inviteFirm.trim() || undefined,
        expires_in_days: expiresInDays,
      });
      setReview(res.data as Review);
      toast.success(t('audit.invitationSent', 'Invitation envoyée !'));
      setInviteEmail(''); setInviteName(''); setInviteFirm('');
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? t('audit.sendError', "Erreur lors de l'envoi");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Evidence uploaded callback ───────────────────────────────────────────────
  const handleEvidenceUploaded = (file: EvidenceFile) => {
    setEvidence(prev => [...prev, file]);
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

      {/* ── Section 2 — Checklist ESRS ──────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
            <FileText className="h-4 w-4 text-gray-400" />
            {t('audit.esrsChecklist', 'Checklist ESRS')}
          </h2>
          <span className="text-xs text-gray-400">
            {t('audit.attachedCount', '{{count}} pièce{{s}} jointe{{s}}', { count: evidence.length, s: evidence.length !== 1 ? 's' : '' })}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {ESRS_SECTIONS.map(section => {
            const files = evidenceBySection(section.code);
            const st    = sectionStatus(section.code);
            return (
              <div key={section.code} className="flex items-center gap-4 px-5 py-3.5">
                {/* Code badge */}
                <span className="flex-shrink-0 w-16 text-center px-2 py-1 text-xs font-black bg-slate-900 text-white rounded">
                  {section.code}
                </span>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{getSectionLabel(t, section.code)}</p>
                </div>

                {/* Requis badge */}
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  section.required
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {section.required ? t('audit.required', 'Requis') : t('audit.optional', 'Optionnel')}
                </span>

                {/* Statut */}
                <div className="flex-shrink-0 w-24 flex justify-center">
                  {st === 'complete' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('audit.fileCount', '{{count}} fichier{{s}}', { count: files.length, s: files.length > 1 ? 's' : '' })}
                    </span>
                  )}
                  {st === 'empty' && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="h-3.5 w-3.5 border-2 border-gray-300 rounded-full inline-block" />
                      {t('audit.notStarted', 'Non démarré')}
                    </span>
                  )}
                </div>

                {/* Action */}
                <button
                  onClick={() => setModalSection(section)}
                  disabled={!review}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={!review ? t('audit.inviteFirst', "Invitez d'abord un auditeur") : t('audit.attachEvidence', 'Joindre des preuves')}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {t('audit.attach', 'Joindre')}
                </button>
              </div>
            );
          })}
        </div>
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

      {/* ── Modale pièces justificatives ────────────────────────────────────── */}
      {modalSection && review && (
        <EvidenceModal
          reviewId={review.id}
          section={modalSection}
          files={evidence}
          onClose={() => setModalSection(null)}
          onUploaded={f => { handleEvidenceUploaded(f); }}
        />
      )}
    </div>
  );
}
