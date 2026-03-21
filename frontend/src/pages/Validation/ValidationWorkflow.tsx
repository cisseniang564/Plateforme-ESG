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
} from 'lucide-react';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
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
      const [statsRes, pendingRes] = await Promise.all([
        api.get('/validation/stats'),
        api.get('/validation/pending'),
      ]);
      setStats(statsRes.data);
      setPending(pendingRes.data);
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
      await api.post('/validation/submit-for-review', { entry_ids: ids });
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
      await api.post('/validation/approve', { entry_ids: ids });
      const label = ids.length > 1 ? t('validation.approveSuccessPlural') : t('validation.approveSuccess');
      toast.success(`${ids.length} ${label}`);
      setSelected(new Set());
      await loadData();
    } catch (error: any) {
      toast.error(t('validation.approveError'));
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
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-full mb-4">
                <Shield size={14} />
                {t('validation.dataQualityBadge')}
              </div>
              <h1 className="text-3xl font-bold mb-2">{t('validation.workflowTitle')}</h1>
              <p className="text-blue-200 text-sm max-w-xl">
                {t('validation.workflowSubtitle')}
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="self-start md:self-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {t('validation.refresh')}
            </button>
          </div>

          {/* Workflow stepper */}
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-5 inline-block">
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wide mb-4">{t('validation.workflowSteps')}</p>
            <WorkflowStepper />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
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
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('validation.pendingDataTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {pending.length} {pending.length !== 1 ? t('validation.pendingEntriesPlural') : t('validation.pendingEntries')}
                  </p>
                </div>

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
            </Card>

            {/* ── Drafts info section ─────────────────────────────────────── */}
            <Card>
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
            </Card>
          </>
        )}
      </div>

      {/* ── Reject notes panel (slide-in overlay) ──────────────────────────── */}
      {showRejectPanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
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
                  <Spinner size="sm" className="border-white" />
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
