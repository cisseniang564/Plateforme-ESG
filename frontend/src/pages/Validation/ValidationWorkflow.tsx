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

interface PendingEntry {
  id: string;
  indicator_id: string;
  date: string;
  value: number | string;
  validation_status: string;
  submitted_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
}

// ─── Workflow stepper ─────────────────────────────────────────────────────────

function WorkflowStepper() {
  const { t } = useTranslation();

  const STEPS = [
    {
      key: 'draft',
      label: t('validation.stepDraft'),
      Icon: Clock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      lineColor: 'bg-gray-200',
    },
    {
      key: 'review',
      label: t('validation.stepReview'),
      Icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      lineColor: 'bg-blue-300',
    },
    {
      key: 'approved',
      label: t('validation.stepApproved'),
      Icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      lineColor: 'bg-emerald-300',
    },
    {
      key: 'rejected',
      label: t('validation.stepRejected'),
      Icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      lineColor: '',
    },
  ];

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const isLast = idx === STEPS.length - 1;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.bgColor}`}>
                <step.Icon size={18} className={step.color} />
              </div>
              <span className={`text-xs font-medium mt-1.5 ${step.color}`}>{step.label}</span>
            </div>
            {!isLast && step.key !== 'review' && (
              <div className={`h-0.5 w-12 mx-1 ${step.lineColor || 'bg-gray-200'} mb-4`} />
            )}
            {step.key === 'review' && (
              <div className="flex flex-col items-center mx-1 mb-4">
                <div className="h-0.5 w-8 bg-blue-300" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  subLabel?: string;
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, subLabel }: KpiCardProps) {
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

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();

  const map: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
    pending_review: { label: t('validation.statusPendingReview'), className: 'bg-blue-100 text-blue-700 border-blue-200', Icon: Send },
    approved: { label: t('validation.statusApproved'), className: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle },
    rejected: { label: t('validation.statusRejected'), className: 'bg-red-100 text-red-700 border-red-200', Icon: XCircle },
    draft: { label: t('validation.statusDraft'), className: 'bg-gray-100 text-gray-600 border-gray-200', Icon: Clock },
  };

  const config = map[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    Icon: AlertCircle,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      <config.Icon size={11} />
      {config.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ValidationWorkflow() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [myQueue, setMyQueue] = useState<PendingEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'submit' | 'queue'>('submit');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string[]>([]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, membersRes, queueRes] = await Promise.allSettled([
        api.get('/validation/stats'),
        api.get('/validation/pending'),
        api.get('/validation/team-members'),
        api.get('/validation/my-queue'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (pendingRes.status === 'fulfilled') setPending(pendingRes.value.data);
      if (membersRes.status === 'fulfilled') setTeamMembers(membersRes.value.data ?? []);
      if (queueRes.status === 'fulfilled') setMyQueue(queueRes.value.data ?? []);
    } catch (error: any) {
      toast.error(t('validation.loadError'));
      console.error('Validation load error:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const allSelected = pending.length > 0 && selected.size === pending.length;
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleSubmitForReview = async (ids: string[]) => {
    setActionLoading(true);
    try {
      await api.post('/validation/submit-for-review', {
        entry_ids: ids,
        ...(assignedTo ? { assigned_to_user_id: assignedTo } : {}),
      });
      const label = ids.length > 1 ? t('validation.submitSuccessPlural') : t('validation.submitSuccess');
      toast.success(`${ids.length} ${label}`);
      setSelected(new Set());
      await loadData();
    } catch (error: any) {
      toast.error(t('validation.submitError'));
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (ids: string[]) => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/validation/approve', { entry_ids: ids });
      const approved = data?.approved ?? ids.length;
      const skipped = data?.skipped_self_approval ?? 0;

      if (approved > 0) {
        // Lead with the legal/audit reassurance: SHA-256 e-signature applied.
        const label = approved > 1 ? t('validation.approveSuccessPlural') : t('validation.approveSuccess');
        toast.success(
          `${approved} ${label} · Signature électronique (SHA-256) appliquée — ISAE 3000`,
          { duration: 5000 },
        );
      }
      if (skipped > 0) {
        // 4-eyes rejection — explain why some entries were skipped.
        toast.error(
          `${skipped} entrée(s) ignorée(s) — vous ne pouvez pas approuver vos propres saisies (séparation des pouvoirs).`,
          { duration: 6000 },
        );
      }
      setSelected(new Set());
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('validation.approveError'));
      console.error(error);
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
    if (rejectTarget.length === 0) return;
    setActionLoading(true);
    try {
      await api.post('/validation/reject', {
        entry_ids: rejectTarget,
        notes: rejectNotes.trim() || undefined,
      });
      const label = rejectTarget.length > 1 ? t('validation.rejectSuccessPlural') : t('validation.rejectSuccess');
      toast.success(`${rejectTarget.length} ${label}`);
      setSelected(new Set());
      setShowRejectPanel(false);
      setRejectTarget([]);
      setRejectNotes('');
      await loadData();
    } catch (error: any) {
      toast.error(t('validation.rejectError'));
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Computed values ──────────────────────────────────────────────────────────
  const approvalRate =
    stats && stats.approved + (stats.pending_review || 0) > 0
      ? Math.round((stats.approved / (stats.approved + stats.pending_review + stats.draft)) * 100)
      : 0;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const shortId = (id: string) => id.slice(0, 8) + '…';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Hero (signature) ───────────────────────────────────────────── */}
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

      {/* Workflow stepper — moved out of the hero, lives in its own card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 inline-block">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-4">{t('validation.workflowSteps')}</p>
        <WorkflowStepper />
      </div>

      {/* ── View tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            activeTab === 'submit'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Send size={14} />
          Soumettre des saisies
          {pending.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'submit' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            activeTab === 'queue'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Inbox size={14} />
          Ma file d'approbation
          {myQueue.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
              {myQueue.length}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label={t('validation.kpiDrafts')}
                value={stats?.draft ?? 0}
                icon={Clock}
                iconColor="text-gray-500"
                iconBg="bg-gray-100"
              />
              <KpiCard
                label={t('validation.kpiPendingValidation')}
                value={stats?.pending_review ?? 0}
                icon={Send}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
              />
              <KpiCard
                label={t('validation.kpiApproved')}
                value={stats?.approved ?? 0}
                icon={CheckCircle}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-100"
              />
              <KpiCard
                label={t('validation.kpiApprovalRate')}
                value={`${approvalRate}%`}
                icon={Shield}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-100"
                subLabel={t('validation.kpiApprovalRateSub')}
              />
            </div>

            {/* ── Pending entries table ───────────────────────────────────── */}
            {activeTab === 'submit' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('validation.pendingDataTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {pending.length} {pending.length !== 1 ? t('validation.pendingEntriesPlural') : t('validation.pendingEntries')}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Validator selector */}
                  {teamMembers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400 flex-shrink-0" />
                      <select
                        value={assignedTo}
                        onChange={e => setAssignedTo(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Assigner à... (optionnel)</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.full_name || m.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                {someSelected && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 font-medium">
                      {selected.size} {selected.size > 1 ? t('validation.selectedCountPlural') : t('validation.selectedCount')}
                    </span>
                    <button
                      onClick={() => handleSubmitForReview(Array.from(selected))}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                    >
                      <Send size={13} />
                      {t('validation.submitBtn')}
                    </button>
                    <button
                      onClick={() => handleApprove(Array.from(selected))}
                      disabled={actionLoading}
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
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colIndicator')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colDate')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colValue')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colSubmittedAt')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colStatus')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">{t('validation.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pending.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`bg-white hover:bg-gray-50 transition-colors ${
                          selected.has(entry.id) ? 'bg-blue-50 hover:bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                            {shortId(entry.indicator_id)}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.value}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(entry.submitted_at)}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={entry.validation_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove([entry.id])}
                              disabled={actionLoading}
                              title={t('validation.approveTitle')}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-50"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => openRejectPanel([entry.id])}
                              disabled={actionLoading}
                              title={t('validation.rejectTitle')}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pending.length === 0 && !loading && (
                  <div className="text-center py-16 text-gray-400">
                    <CheckCircle size={40} className="mx-auto mb-3 opacity-25" />
                    <p className="text-sm font-medium">{t('validation.noEntriesPending')}</p>
                    <p className="text-xs mt-1">{t('validation.allDataProcessed')}</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* ── My approval queue tab ──────────────────────────────────────── */}
            {activeTab === 'queue' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <Inbox size={18} className="text-indigo-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Ma file d'approbation</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Saisies qui vous ont été assignées pour validation (principe des 4 yeux)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colIndicator')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colDate')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colValue')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('validation.colSubmittedAt')}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">{t('validation.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myQueue.map((entry) => (
                      <tr key={entry.id} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                            {entry.indicator_id.slice(0, 8)}…
                          </code>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.value}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(entry.submitted_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove([entry.id])}
                              disabled={actionLoading}
                              title={t('validation.approveTitle')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <Check size={13} /> Approuver
                            </button>
                            <button
                              onClick={() => openRejectPanel([entry.id])}
                              disabled={actionLoading}
                              title={t('validation.rejectTitle')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <X size={13} /> Refuser
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {myQueue.length === 0 && !loading && (
                  <div className="text-center py-16 text-gray-400">
                    <Inbox size={40} className="mx-auto mb-3 opacity-25" />
                    <p className="text-sm font-medium">Aucune saisie en attente de votre approbation</p>
                    <p className="text-xs mt-1">Les saisies assignées à votre compte apparaîtront ici</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* ── Drafts info section ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 rounded-xl flex-shrink-0">
                  <AlertCircle size={22} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('validation.draftsTitle')}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t('validation.draftsDesc')}{' '}
                    <strong className="text-gray-800">{t('validation.submitForValidationBtn')}</strong>.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('validation.currentlyDrafts')}{' '}
                    <span className="font-semibold text-amber-600">
                      {stats?.draft ?? 0} {(stats?.draft ?? 0) !== 1 ? t('validation.draftCountPlural') : t('validation.draftCount')}
                    </span>{' '}
                    {t('validation.pendingSubmission')}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Assurance / Compliance card (B2B trust signal) ─────────── */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-white shadow-sm">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-600 rounded-xl flex-shrink-0 shadow-md">
                    <Shield size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Assurance &amp; auditabilité
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        ISAE 3000
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        CSRD Art. 29a
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      Chaque approbation génère une <strong>signature électronique SHA-256</strong> qui
                      lie cryptographiquement l'approbateur, la valeur, l'horodatage et l'adresse IP —
                      preuve légale recalculable lors d'un audit.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Séparation des pouvoirs (4-eyes)</strong> — l'auteur d'une saisie ne peut pas l'approuver lui-même.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Verrouillage post-vérification</strong> — les entrées approuvées sont immuables.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Journal d'audit horodaté</strong> — chaque action est tracée (qui, quoi, quand, IP).</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Reject notes panel (slide-in overlay) ──────────────────────────── */}
      {showRejectPanel && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRejectPanel(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('validation.rejectModalTitle')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {rejectTarget.length} {rejectTarget.length > 1 ? t('validation.rejectModalSubtitlePlural') : t('validation.rejectModalSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setShowRejectPanel(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('validation.rejectReason')}{' '}
                  <span className="text-gray-400 font-normal">{t('validation.rejectReasonOptional')}</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder={t('validation.rejectPlaceholder')}
                  className="input resize-none"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <AlertCircle size={13} />
                {t('validation.rejectWarning')}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowRejectPanel(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <Spinner className="border-white" />
                ) : (
                  <XCircle size={14} />
                )}
                {t('validation.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
