/**
 * AuditorReview — Public page (no JWT) accessed by an external auditor
 * via a unique invitation token. Lets them download the report, leave
 * comments per ESRS section, and submit a final approval/rejection.
 *
 * Route: /audit/review/:token
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, Download, MessageCircle, Send, CheckCircle2,
  XCircle, AlertTriangle, Info, Clock, Building2, FileText, Sparkles, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

const dtLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface Comment {
  id: string; section_code: string; severity: 'info' | 'warning' | 'critical';
  body: string; resolved: boolean; created_at: string;
}
interface ReviewMeta {
  id: string; auditor_email: string; auditor_name?: string | null; auditor_firm?: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';
  invited_at: string; expires_at?: string | null; completed_at?: string | null; decision_note?: string | null;
}
interface ReportMeta {
  id: string; report_type: string; format: string; year?: number | null; period: string; created_at?: string | null;
}

function getESRS_SECTIONS(t: TFunction) {
  return [
    { code: 'ESRS 2', label: t('audrev.secGen',   'Informations générales') },
    { code: 'E1',     label: t('audrev.secE1',    'Climat') },
    { code: 'E2',     label: t('audrev.secE2',    'Pollution') },
    { code: 'E3',     label: t('audrev.secE3',    'Eau & ressources marines') },
    { code: 'E4',     label: t('audrev.secE4',    'Biodiversité') },
    { code: 'E5',     label: t('audrev.secE5',    'Économie circulaire') },
    { code: 'S1',     label: t('audrev.secS1',    'Effectifs propres') },
    { code: 'S2',     label: t('audrev.secS2',    'Chaîne de valeur') },
    { code: 'S3',     label: t('audrev.secS3',    'Communautés affectées') },
    { code: 'S4',     label: t('audrev.secS4',    'Consommateurs') },
    { code: 'G1',     label: t('audrev.secG1',    'Conduite des affaires') },
  ];
}

function getSEVERITY_STYLES(t: TFunction) {
  return {
    info:     { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200',  icon: Info,          label: t('audrev.sevInfo',    'Information') },
    warning:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle, label: t('audrev.sevWarning', 'Avertissement') },
    critical: { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   icon: XCircle,       label: t('audrev.sevCritical','Critique') },
  } as const;
}

function getSTATUS_STYLES(t: TFunction) {
  return {
    pending:   { bg: 'bg-slate-100',   text: 'text-slate-700',   label: t('audrev.stPending',  'En attente') },
    in_review: { bg: 'bg-blue-100',    text: 'text-blue-700',    label: t('audrev.stInReview', 'En cours de revue') },
    approved:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t('audrev.stApproved', 'Approuvé') },
    rejected:  { bg: 'bg-red-100',     text: 'text-red-700',     label: t('audrev.stRejected', 'Rejeté') },
    expired:   { bg: 'bg-gray-100',    text: 'text-gray-700',    label: t('audrev.stExpired',  'Expiré') },
  } as const;
}

const publicApi = axios.create({ baseURL: '/api/v1' });

export default function AuditorReview() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();

  const ESRS_SECTIONS    = getESRS_SECTIONS(t);
  const SEVERITY_STYLES  = getSEVERITY_STYLES(t);
  const STATUS_STYLES    = getSTATUS_STYLES(t);

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [review, setReview]       = useState<ReviewMeta | null>(null);
  const [report, setReport]       = useState<ReportMeta | null>(null);
  const [comments, setComments]   = useState<Comment[]>([]);

  const [section, setSection]     = useState<string>('ESRS 2');
  const [severity, setSeverity]   = useState<'info' | 'warning' | 'critical'>('info');
  const [body, setBody]           = useState<string>('');
  const [posting, setPosting]     = useState(false);

  const [decision, setDecision]   = useState<'approved' | 'rejected' | null>(null);
  const [decisionNote, setDecisionNote] = useState<string>('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await publicApi.get(`/auditor-reviews/public/${token}`);
      setReview(res.data?.review ?? null);
      setReport(res.data?.report ?? null);
      setComments(res.data?.comments ?? []);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) setError(t('audrev.err404', "Cette invitation est introuvable ou a été annulée."));
      else if (status === 410) setError(t('audrev.err410', "Cette invitation a expiré."));
      else setError(t('audrev.errLoad', "Impossible de charger la revue. Réessayez plus tard."));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const isClosed = review && (review.status === 'approved' || review.status === 'rejected' || review.status === 'expired');

  const submitComment = async () => {
    if (!body.trim() || !token) return;
    setPosting(true);
    try {
      const res = await publicApi.post(`/auditor-reviews/public/${token}/comments`, {
        section_code: section, severity, body: body.trim(),
      });
      setComments(prev => [res.data, ...prev]);
      setBody('');
    } catch {
      toast.error(t('audrev.errComment', "Échec de l'envoi du commentaire."));
    } finally { setPosting(false); }
  };

  const submitDecision = async () => {
    if (!decision || !token) return;
    setSubmittingDecision(true);
    try {
      const res = await publicApi.post(`/auditor-reviews/public/${token}/decision`, {
        decision, note: decisionNote.trim() || undefined,
      });
      setReview(prev => prev ? { ...prev, status: res.data.status, completed_at: res.data.completed_at } : prev);
      setDecision(null);
      if (res.data.signature_hash) {
        toast.success(t('audrev.decisionSigned', 'Décision enregistrée. Signature électronique : {{hash}}…', { hash: res.data.signature_hash.slice(0, 16) }), { duration: 8000 });
      } else {
        toast.success(t('audrev.decisionOk', 'Décision enregistrée.'));
      }
    } catch {
      toast.error(t('audrev.errDecision', "Échec de l'envoi de la décision."));
    } finally { setSubmittingDecision(false); }
  };

  const downloadReport = () => {
    if (!token) return;
    window.open(`/api/v1/auditor-reviews/public/${token}/download`, '_blank', 'noopener');
  };

  const grouped = useMemo(() => {
    const map: Record<string, Comment[]> = {};
    for (const c of comments) {
      if (!map[c.section_code]) map[c.section_code] = [];
      map[c.section_code].push(c);
    }
    return map;
  }, [comments]);

  const criticalCount = comments.filter(c => c.severity === 'critical' && !c.resolved).length;

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-emerald-600 animate-spin" /></div>;
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center"><ShieldAlert className="h-8 w-8 text-red-600" /></div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('audrev.invalidLink', 'Lien invalide')}</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[review.status];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{t('audrev.headerTitle', "Revue d'audit ESG / CSRD")}</p>
              <p className="text-sm text-gray-500">{t('audrev.platform', 'Plateforme ESGflow')}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Auditor info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
              <Building2 className="h-4 w-4 text-gray-500" />{t('audrev.infoTitle', 'Informations')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('audrev.labelAuditor', 'Auditeur')}</p>
                <p className="font-semibold text-gray-800">{review.auditor_name || review.auditor_email}</p>
                {review.auditor_firm && <p className="text-xs text-gray-500">{review.auditor_firm}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                <p className="text-gray-800">{review.auditor_email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('audrev.invitedAt', 'Invité le')}</p>
                <p className="text-gray-800">{new Date(review.invited_at).toLocaleString(dtLocale())}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('audrev.expiresAt', 'Expire le')}</p>
                <p className="text-gray-800">{review.expires_at ? new Date(review.expires_at).toLocaleString(dtLocale()) : '—'}</p>
              </div>
            </div>
            {report && (
              <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-emerald-900 text-sm">
                    {t('audrev.report', 'Rapport')} {report.report_type.toUpperCase()} {report.year ? `· ${report.year}` : ''} ({report.format.toUpperCase()})
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {t('audrev.generatedAt', 'Généré le')} {report.created_at ? new Date(report.created_at).toLocaleDateString(dtLocale()) : '—'} · {report.period}
                  </p>
                </div>
                <button type="button" onClick={downloadReport}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <Download className="h-3.5 w-3.5" />{t('audrev.download', 'Télécharger')}
                </button>
              </div>
            )}
          </div>

          {/* Comment form */}
          {!isClosed && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                <MessageCircle className="h-4 w-4 text-gray-500" />{t('audrev.addComment', 'Ajouter un commentaire')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <select value={section} onChange={e => setSection(e.target.value)}
                  className="px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {ESRS_SECTIONS.map(s => <option key={s.code} value={s.code}>{s.code} — {s.label}</option>)}
                </select>
                <select value={severity} onChange={e => setSeverity(e.target.value as any)}
                  className="px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="info">{t('audrev.sevInfo', 'Information')}</option>
                  <option value="warning">{t('audrev.sevWarning', 'Avertissement')}</option>
                  <option value="critical">{t('audrev.sevCritical', 'Critique')}</option>
                </select>
              </div>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                placeholder={t('audrev.commentPlaceholder', 'Décrivez votre observation, votre recommandation ou un point bloquant…')}
                rows={4} className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              <div className="flex justify-end mt-3">
                <button type="button" onClick={submitComment} disabled={posting || !body.trim()}
                  className="inline-flex items-center gap-1.5 px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('audrev.publish', 'Publier')}
                </button>
              </div>
            </div>
          )}

          {/* Comments list */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                <MessageCircle className="h-4 w-4 text-gray-500" />
                {t('audrev.observations', 'Observations ({{n}})', { n: comments.length })}
              </h2>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {t('audrev.critiques', '{{n}} critique{{s}}', { n: criticalCount, s: criticalCount > 1 ? 's' : '' })}
                </span>
              )}
            </div>
            {comments.length === 0 ? (
              <div className="text-center py-12 px-6">
                <MessageCircle className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-600">{t('audrev.noComments', 'Aucune observation pour le moment.')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {Object.entries(grouped).map(([sec, list]) => (
                  <div key={sec} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-slate-900 text-white">{sec}</span>
                      <span className="text-xs text-gray-400">{t('audrev.obsCount', '{{n}} observation{{s}}', { n: list.length, s: list.length > 1 ? 's' : '' })}</span>
                    </div>
                    <div className="space-y-2">
                      {list.map(c => {
                        const s = SEVERITY_STYLES[c.severity];
                        const Icon = s.icon;
                        return (
                          <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg} ${s.border}`}>
                            <Icon className={`h-4 w-4 ${s.text} flex-shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold ${s.text} uppercase tracking-wide mb-0.5`}>{s.label}</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.body}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {new Date(c.created_at).toLocaleString(dtLocale())}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decision panel */}
        <div className="space-y-5">
          {isClosed ? (
            <div className={`rounded-2xl border-2 p-5 shadow-sm ${review.status === 'approved' ? 'bg-emerald-50 border-emerald-300' : review.status === 'rejected' ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-center gap-3 mb-3">
                {review.status === 'approved' ? <CheckCircle2 className="h-7 w-7 text-emerald-600" /> : review.status === 'rejected' ? <XCircle className="h-7 w-7 text-red-600" /> : <Clock className="h-7 w-7 text-gray-500" />}
                <h2 className="text-lg font-bold text-gray-900">{statusStyle.label}</h2>
              </div>
              {review.completed_at && (
                <p className="text-xs text-gray-500 mb-3">{t('audrev.decisionAt', 'Décision rendue le {{date}}', { date: new Date(review.completed_at).toLocaleString(dtLocale()) })}</p>
              )}
              {review.decision_note && (
                <div className="bg-white/70 rounded-lg p-3 mt-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('audrev.auditorNote', "Note de l'auditeur")}</p>
                  <p className="text-sm text-gray-800 italic">« {review.decision_note} »</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                <Sparkles className="h-4 w-4 text-emerald-600" />{t('audrev.finalDecision', 'Décision finale')}
              </h2>
              <p className="text-xs text-gray-500 mb-4">{t('audrev.decisionHint', 'Une fois votre décision rendue, la revue sera clôturée et le client en sera notifié.')}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button type="button" onClick={() => setDecision('approved')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${decision === 'approved' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white hover:border-emerald-300'}`}>
                  <CheckCircle2 className={`h-6 w-6 ${decision === 'approved' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-bold ${decision === 'approved' ? 'text-emerald-700' : 'text-gray-700'}`}>{t('audrev.approve', 'Approuver')}</span>
                </button>
                <button type="button" onClick={() => setDecision('rejected')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${decision === 'rejected' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'}`}>
                  <XCircle className={`h-6 w-6 ${decision === 'rejected' ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-bold ${decision === 'rejected' ? 'text-red-700' : 'text-gray-700'}`}>{t('audrev.reject', 'Rejeter')}</span>
                </button>
              </div>
              {decision && (
                <>
                  <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)}
                    placeholder={decision === 'approved' ? t('audrev.noteApprove', "Note d'approbation (optionnelle)…") : t('audrev.noteReject', 'Motif du rejet (recommandé)…')}
                    rows={3} className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-3" />
                  <button type="button" onClick={submitDecision} disabled={submittingDecision}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 h-11 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 ${decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {submittingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('audrev.confirmDecision', 'Confirmer la décision')}
                  </button>
                </>
              )}
            </div>
          )}
          <div className="bg-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <p className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{t('audrev.legalNote', "Vos commentaires sont horodatés et conservés en piste d'audit. Le client en est notifié dès la décision finale.")}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
