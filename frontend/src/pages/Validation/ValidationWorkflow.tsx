import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Shield,
  RefreshCw,
  Check,
  X,
  Users,
  Inbox,
  FileEdit,
  ListChecks,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import PageHero, { PageHeroButton } from '@/components/layout/PageHero';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationStats {
  draft: number;
  pending_review: number;
  approved: number;
}

interface Entry {
  id: string;
  indicator_id: string;
  indicator_code?: string | null;
  indicator_name?: string | null;
  unit?: string | null;
  date: string;
  value: number | string;
  validation_status: string;
  submitted_at: string | null;
  submitted_by_name?: string | null;
  reviewer_notes?: string | null;
  can_approve?: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string | null;
}

type Tab = 'drafts' | 'pending' | 'queue';
const LIST_LIMIT = 200;

// ─── Workflow stepper ─────────────────────────────────────────────────────────

function WorkflowStepper() {
  const { t } = useTranslation();
  const steps = [
    { key: 'draft', label: t('validation.stepDraft'), Icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
    { key: 'review', label: t('validation.stepReview'), Icon: Send, color: 'text-blue-600', bg: 'bg-blue-100' },
    { key: 'approved', label: t('validation.stepApproved'), Icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];
  return (
    <div>
      <div className="flex items-center">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.bg}`}>
                <step.Icon size={18} className={step.color} />
              </div>
              <span className={`text-xs font-medium mt-1.5 ${step.color}`}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="h-0.5 w-12 mx-1 bg-gray-200 mb-4" />}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
        <XCircle size={12} className="text-red-400 flex-shrink-0" />
        {t('validation.stepRejectedNote', 'Un refus renvoie la saisie en brouillon, avec le motif indiqué par le validateur.')}
      </p>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, subLabel }: {
  label: string; value: number | string; icon: React.ElementType; iconColor: string; iconBg: string; subLabel?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${iconBg} flex-shrink-0`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ValidationWorkflow() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [drafts, setDrafts] = useState<Entry[]>([]);
  const [pending, setPending] = useState<Entry[]>([]);
  const [myQueue, setMyQueue] = useState<Entry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('drafts');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsRes, draftsRes, pendingRes, membersRes, queueRes] = await Promise.allSettled([
      api.get('/validation/stats'),
      api.get('/validation/drafts'),
      api.get('/validation/pending'),
      api.get('/validation/team-members'),
      api.get('/validation/my-queue'),
    ]);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    if (draftsRes.status === 'fulfilled') setDrafts(draftsRes.value.data ?? []);
    if (pendingRes.status === 'fulfilled') setPending(pendingRes.value.data ?? []);
    if (membersRes.status === 'fulfilled') setTeamMembers(membersRes.value.data ?? []);
    if (queueRes.status === 'fulfilled') setMyQueue(queueRes.value.data ?? []);
    if ([statsRes, draftsRes, pendingRes].some((r) => r.status === 'rejected')) {
      toast.error(t('validation.loadError'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSelected(new Set());
  };

  const rows: Entry[] = activeTab === 'drafts' ? drafts : activeTab === 'pending' ? pending : myQueue;
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((e) => e.id)));
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleSubmitForReview = async (ids: string[]) => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/validation/submit-for-review', {
        entry_ids: ids,
        ...(assignedTo ? { assigned_to_user_id: assignedTo } : {}),
      });
      const n = data?.updated ?? 0;
      if (n > 0) {
        toast.success(t('validation.submitDone', { count: n, defaultValue: '{{count}} saisie(s) soumise(s) pour validation' }));
      } else {
        toast.error(t('validation.nothingSubmitted', "Aucune saisie n'a pu être soumise (déjà soumises ?)."));
      }
      setSelected(new Set());
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('validation.submitError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (ids: string[]) => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/validation/approve', { entry_ids: ids });
      const approved = data?.approved ?? 0;
      const skipped = data?.skipped_self_approval ?? 0;
      if (approved > 0) {
        toast.success(t('validation.approveDone', { count: approved, defaultValue: '{{count}} saisie(s) approuvée(s) et tracée(s) dans le journal d\'audit' }));
      }
      if (skipped > 0) {
        toast.error(
          t('validation.skippedOwn', {
            count: skipped,
            defaultValue: '{{count}} saisie(s) ignorée(s) : vous ne pouvez pas approuver vos propres soumissions (principe des 4 yeux).',
          }),
          { duration: 6000 },
        );
      }
      setSelected(new Set());
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('validation.approveError'));
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectPanel = (ids: string[]) => {
    setRejectTarget(ids);
    setRejectNotes('');
    setShowRejectPanel(true);
  };

  const handleReject = async () => {
    if (rejectTarget.length === 0 || rejectNotes.trim().length < 3) return;
    setActionLoading(true);
    try {
      const { data } = await api.post('/validation/reject', { entry_ids: rejectTarget, notes: rejectNotes.trim() });
      toast.success(t('validation.rejectDone', { count: data?.rejected ?? 0, defaultValue: '{{count}} saisie(s) renvoyée(s) en brouillon' }));
      setSelected(new Set());
      setShowRejectPanel(false);
      setRejectTarget([]);
      setRejectNotes('');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('validation.rejectError'));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const total = (stats?.draft ?? 0) + (stats?.pending_review ?? 0) + (stats?.approved ?? 0);
  const approvalRate = total > 0 ? Math.round(((stats?.approved ?? 0) / total) * 100) : 0;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const selectedApprovable = rows.filter((e) => selected.has(e.id) && e.can_approve !== false).map((e) => e.id);

  const tabButton = (tab: Tab, label: string, Icon: React.ElementType, count: number, active: string) => (
    <button
      onClick={() => switchTab(tab)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
        activeTab === tab ? `${active} text-white shadow-sm` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      <Icon size={14} />
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
          {count}
        </span>
      )}
    </button>
  );

  const emptyText = {
    drafts: [t('validation.emptyDrafts', 'Aucun brouillon à soumettre'), t('validation.emptyDraftsHint', 'Les nouvelles saisies apparaissent ici avant leur soumission.')],
    pending: [t('validation.noEntriesPending'), t('validation.allDataProcessed')],
    queue: [t('validation.emptyQueue', "Aucune saisie en attente de votre approbation"), t('validation.emptyQueueHint', 'Les saisies qui vous sont assignées apparaîtront ici.')],
  }[activeTab];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHero
        badge={t('validation.dataQualityBadge')}
        badgeIcon={Shield}
        icon={Shield}
        title={t('validation.workflowTitle')}
        description={t('validation.workflowSubtitle')}
        actions={
          <PageHeroButton onClick={loadData} disabled={loading} icon={RefreshCw}>
            {t('validation.refresh')}
          </PageHeroButton>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 inline-block">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-4">{t('validation.workflowSteps')}</p>
        <WorkflowStepper />
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabButton('drafts', t('validation.tabDrafts', 'À soumettre'), FileEdit, stats?.draft ?? drafts.length, 'bg-gray-700 border-gray-700')}
        {tabButton('pending', t('validation.tabPending', 'À valider'), ListChecks, pending.length, 'bg-blue-600 border-blue-600')}
        {tabButton('queue', t('validation.tabQueue', "Ma file d'approbation"), Inbox, myQueue.length, 'bg-indigo-600 border-indigo-600')}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label={t('validation.kpiDrafts')} value={stats?.draft ?? 0} icon={Clock} iconColor="text-gray-500" iconBg="bg-gray-100" />
            <KpiCard label={t('validation.kpiPendingValidation')} value={stats?.pending_review ?? 0} icon={Send} iconColor="text-blue-600" iconBg="bg-blue-100" />
            <KpiCard label={t('validation.kpiApproved')} value={stats?.approved ?? 0} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
            <KpiCard label={t('validation.kpiApprovalRate')} value={`${approvalRate}%`} icon={Shield} iconColor="text-indigo-600" iconBg="bg-indigo-100" subLabel={t('validation.kpiApprovalRateSub')} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'drafts' && t('validation.titleDrafts', 'Brouillons à soumettre')}
                  {activeTab === 'pending' && t('validation.pendingDataTitle')}
                  {activeTab === 'queue' && t('validation.tabQueue', "Ma file d'approbation")}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {activeTab === 'queue'
                    ? t('validation.queueSubtitle', 'Saisies qui vous ont été assignées pour validation (principe des 4 yeux)')
                    : t('validation.rowCount', { count: rows.length, defaultValue: '{{count}} saisie(s)' })}
                  {rows.length >= LIST_LIMIT && ` · ${t('validation.limitNote', { count: LIST_LIMIT, defaultValue: 'affichage limité aux {{count}} plus récentes' })}`}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {activeTab === 'drafts' && teamMembers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-400 flex-shrink-0" />
                    <select
                      aria-label={t('validation.assignTo', 'Assigner à un validateur')}
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('validation.assignTo', 'Assigner à un validateur')} ({t('validation.optional', 'optionnel')})</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selected.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 font-medium">
                      {t('validation.selectedN', { count: selected.size, defaultValue: '{{count}} sélectionnée(s)' })}
                    </span>
                    {activeTab === 'drafts' && (
                      <button
                        onClick={() => handleSubmitForReview(Array.from(selected))}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                      >
                        <Send size={13} />
                        {t('validation.submitBtn')}
                      </button>
                    )}
                    {activeTab !== 'drafts' && (
                      <>
                        <button
                          onClick={() => handleApprove(selectedApprovable)}
                          disabled={actionLoading || selectedApprovable.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                          <Check size={13} />
                          {t('validation.approveBtn')}
                        </button>
                        <button
                          onClick={() => openRejectPanel(Array.from(selected))}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                          <X size={13} />
                          {t('validation.rejectBtn')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        aria-label={t('validation.selectAll', 'Tout sélectionner')}
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colIndicator')}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colDate')}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colValue')}</th>
                    {activeTab !== 'drafts' && (
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colSubmittedBy', 'Soumis par')}</th>
                    )}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">{t('validation.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((entry) => (
                    <tr key={entry.id} className={`hover:bg-gray-50 transition-colors ${selected.has(entry.id) ? 'bg-blue-50 hover:bg-blue-50' : 'bg-white'}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={entry.indicator_name || entry.indicator_id}
                          checked={selected.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{entry.indicator_name || entry.indicator_id.slice(0, 8) + '…'}</p>
                        {entry.indicator_code && <p className="text-xs text-gray-500 font-mono">{entry.indicator_code}</p>}
                        {activeTab === 'drafts' && entry.reviewer_notes && (
                          <p className="mt-1 inline-flex items-start gap-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <XCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{t('validation.refusedWith', 'Refusée')} : {entry.reviewer_notes}</span>
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {entry.value} {entry.unit && <span className="text-gray-500 font-normal">{entry.unit}</span>}
                      </td>
                      {activeTab !== 'drafts' && (
                        <td className="px-4 py-3 text-gray-600">
                          <p>{entry.submitted_by_name || '—'}</p>
                          <p className="text-xs text-gray-400">{formatDate(entry.submitted_at)}</p>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'drafts' ? (
                            <button
                              onClick={() => handleSubmitForReview([entry.id])}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <Send size={13} /> {t('validation.submitBtn')}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove([entry.id])}
                                disabled={actionLoading || entry.can_approve === false}
                                title={entry.can_approve === false ? t('validation.ownEntry', "Vous avez soumis cette saisie : un autre validateur doit l'approuver") : t('validation.approveTitle')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Check size={13} /> {t('validation.approveBtn')}
                              </button>
                              <button
                                onClick={() => openRejectPanel([entry.id])}
                                disabled={actionLoading}
                                title={t('validation.rejectTitle')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <X size={13} /> {t('validation.rejectBtn')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rows.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <CheckCircle size={40} className="mx-auto mb-3 opacity-25" />
                  <p className="text-sm font-medium">{emptyText[0]}</p>
                  <p className="text-xs mt-1">{emptyText[1]}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-white shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-600 rounded-xl flex-shrink-0 shadow-md">
                <Shield size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('validation.traceTitle', 'Traçabilité des validations')}</h2>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{t('validation.traceFourEyes', "Principe des 4 yeux : l'auteur d'une soumission ne peut pas l'approuver lui-même. Seuls les rôles gestionnaire ESG et supérieurs peuvent approuver ou refuser.")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{t('validation.traceAudit', "Chaque soumission, approbation et refus est inscrit dans le journal d'audit (utilisateur, date, adresse IP), chaîné par empreintes SHA-256.")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{t('validation.traceHash', "Une empreinte SHA-256 (saisie, valeur, approbateur, horodatage) est conservée dans les notes de revue de chaque saisie approuvée.")}</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  {t('validation.traceDisclaimer', "Cette empreinte est un repère de traçabilité interne : ce n'est pas une signature électronique qualifiée et elle ne remplace pas la mission d'un vérificateur d'assurance.")}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Refus : motif obligatoire ─────────────────────────────────────── */}
      {showRejectPanel && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRejectPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('validation.rejectModalTitle')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('validation.selectedN', { count: rejectTarget.length, defaultValue: '{{count}} sélectionnée(s)' })}
                </p>
              </div>
              <button
                onClick={() => setShowRejectPanel(false)}
                aria-label={t('common.cancel')}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('validation.rejectReason')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  autoFocus
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder={t('validation.rejectPlaceholder')}
                  className="input resize-none"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="flex-shrink-0" />
                {t('validation.rejectWarning')}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowRejectPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || rejectNotes.trim().length < 3}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {actionLoading ? <Spinner className="border-white" /> : <XCircle size={14} />}
                {t('validation.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
