import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Plus,
  Save,
  Calendar,
  Leaf,
  Users,
  Scale,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Download,
  X,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Organization { id: string; name: string; }
interface DataEntry {
  id: string;
  organization_id?: string;
  period_start: string;
  period_end: string;
  period_type: string;
  pillar: string;
  category: string;
  metric_name: string;
  value_numeric?: number;
  value_text?: string;
  unit?: string;
  data_source?: string;
  verification_status: string;
  notes?: string;
}
interface MetricTemplate { name: string; unit: string; description?: string; }

// ─── Pillar config (NO dynamic Tailwind classes) ───────────────────────────
interface PillarCfg {
  label: string;
  icon: LucideIcon;
  color: string;
  softBg: string;
  strip: string;
  topColor: string;
  iconBg: string;
}
const PILLAR_CFG: Record<string, PillarCfg> = {
  environmental: { label: 'Environnemental', icon: Leaf,  color: '#16a34a', softBg: '#f0fdf4', strip: '#22c55e', topColor: '#22c55e', iconBg: '#dcfce7' },
  social:        { label: 'Social',          icon: Users, color: '#2563eb', softBg: '#eff6ff', strip: '#3b82f6', topColor: '#3b82f6', iconBg: '#dbeafe' },
  governance:    { label: 'Gouvernance',     icon: Scale, color: '#7c3aed', softBg: '#f5f3ff', strip: '#8b5cf6', topColor: '#8b5cf6', iconBg: '#ede9fe' },
};
function getPillarCfg(pillar: string): PillarCfg {
  return PILLAR_CFG[pillar] ?? {
    label: pillar, icon: Database as LucideIcon,
    color: '#6b7280', softBg: '#f9fafb', strip: '#9ca3af', topColor: '#9ca3af', iconBg: '#f3f4f6',
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────
interface ConfirmModalProps { onConfirm: () => void; onCancel: () => void; label: string; }
function ConfirmModal({ onConfirm, onCancel, label }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-red-100 rounded-xl"><Trash2 className="h-5 w-5 text-red-600" /></div>
          <h3 className="text-lg font-bold text-gray-900">Supprimer cette entrée ?</h3>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          <span className="font-semibold text-gray-800">"{label}"</span> sera définitivement supprimée.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function DataEntryForm() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [templates, setTemplates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DataEntry | null>(null);
  const [step, setStep] = useState(1);
  const [selectedPillar, setSelectedPillar] = useState<string>('environmental');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricTemplate | null>(null);

  const [formData, setFormData] = useState({
    organization_id: '',
    period_start: new Date().getFullYear() + '-01-01',
    period_end: new Date().getFullYear() + '-12-31',
    period_type: 'annual',
    pillar: 'environmental',
    category: '',
    metric_name: '',
    value_numeric: '',
    unit: '',
    data_source: '',
    notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, templatesRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/data-entry/templates/metrics'),
      ]);
      setOrganizations(orgsRes.data.items || []);
      setTemplates(templatesRes.data);
      await loadEntries();
    } catch {
      toast.error(t('dataEntry.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    try {
      const res = await api.get('/data-entry/');
      setEntries(res.data || []);
    } catch {}
  };

  const handlePillarChange = (pillar: string) => {
    setSelectedPillar(pillar);
    setSelectedCategory('');
    setSelectedMetric(null);
    setFormData({ ...formData, pillar, category: '', metric_name: '', unit: '' });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedMetric(null);
    setFormData({ ...formData, category, metric_name: '', unit: '' });
  };

  const handleMetricSelect = (metric: MetricTemplate) => {
    setSelectedMetric(metric);
    setFormData({ ...formData, metric_name: metric.name, unit: metric.unit || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/data-entry/', {
        ...formData,
        value_numeric: formData.value_numeric ? parseFloat(formData.value_numeric as any) : null,
        organization_id: formData.organization_id || null,
      });
      toast.success(t('dataEntry.savedSuccess'));
      setShowModal(false);
      resetForm();
      await loadEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('dataEntry.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/data-entry/${deleteTarget.id}`);
      toast.success(t('dataEntry.entryDeleted'));
      setDeleteTarget(null);
      await loadEntries();
    } catch {
      toast.error(t('dataEntry.deleteError'));
    }
  };

  const resetForm = () => {
    setFormData({
      organization_id: '', period_start: new Date().getFullYear() + '-01-01',
      period_end: new Date().getFullYear() + '-12-31', period_type: 'annual',
      pillar: 'environmental', category: '', metric_name: '',
      value_numeric: '', unit: '', data_source: '', notes: '',
    });
    setSelectedPillar('environmental');
    setSelectedCategory('');
    setSelectedMetric(null);
    setStep(1);
  };

  const stats = {
    total: entries.length,
    env:   entries.filter(e => e.pillar === 'environmental').length,
    social: entries.filter(e => e.pillar === 'social').length,
    gov:   entries.filter(e => e.pillar === 'governance').length,
    thisYear: entries.filter(e => e.period_start?.startsWith(String(new Date().getFullYear()))).length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  }

  const STAT_CARDS = [
    { label: t('dataEntry.totalEntries'), value: stats.total,  topColor: '#6366f1', iconBg: '#eef2ff', iconColor: '#4f46e5', icon: Database },
    { label: t('dashboard.environmental'), value: stats.env,   topColor: '#22c55e', iconBg: '#dcfce7', iconColor: '#16a34a', icon: Leaf },
    { label: t('dashboard.social'),        value: stats.social, topColor: '#3b82f6', iconBg: '#dbeafe', iconColor: '#2563eb', icon: Users },
    { label: t('dashboard.governance'),    value: stats.gov,   topColor: '#8b5cf6', iconBg: '#ede9fe', iconColor: '#7c3aed', icon: Scale },
  ];

  return (
    <div className="space-y-6">

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 10%, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
        <div className="relative px-8 py-8 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Database className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{t('dataEntry.title')}</h1>
            </div>
            <p className="text-white/75 text-sm ml-1 mb-5">{t('dataEntry.subtitle')}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { icon: Database, label: `${stats.total} entrées` },
                { icon: Calendar, label: `${stats.thisYear} cette année` },
                { icon: Sparkles, label: `${Math.round((entries.filter(e=>e.verification_status==='verified').length / Math.max(stats.total,1))*100)}% vérifiées` },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => { setShowModal(true); setStep(1); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
              style={{ background: 'white', color: '#059669' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              <Plus className="h-4 w-4" />
              {t('dataEntry.newEntry')}
            </button>
            <button
              onClick={loadEntries}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <RefreshCw className="h-4 w-4" />
              {t('dataEntry.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-1" style={{ backgroundColor: card.topColor }} />
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: card.iconBg }}>
                  <Icon className="h-6 w-6" style={{ color: card.iconColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Entries List ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{t('dataEntry.entriesTitle')}</h2>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            {t('dataEntry.exportCsv')}
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-50 flex items-center justify-center">
              <Database className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">{t('dataEntry.emptyTitle')}</p>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">{t('dataEntry.emptySubtitle')}</p>
            <button
              onClick={() => { setShowModal(true); setStep(1); }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="h-5 w-5" />
              {t('dataEntry.newEntry')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {entries.map(entry => {
              const cfg = getPillarCfg(entry.pillar);
              const Icon = cfg.icon;
              const isVerified = entry.verification_status === 'verified';
              return (
                <div key={entry.id} className="group relative flex items-start gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  {/* Left color strip */}
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" style={{ backgroundColor: cfg.strip }} />
                  {/* Pillar icon */}
                  <div className="p-2.5 rounded-xl shrink-0 mt-0.5" style={{ backgroundColor: cfg.softBg }}>
                    <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{entry.metric_name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.category}
                          {entry.period_start && (
                            <span className="ml-2 text-gray-400">
                              · {format(new Date(entry.period_start), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isVerified ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {isVerified ? t('dataEntry.verified') : t('dataEntry.pending')}
                        </span>
                        <button
                          onClick={() => setDeleteTarget(entry)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-1.5">
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          {entry.value_numeric !== null && entry.value_numeric !== undefined
                            ? entry.value_numeric.toLocaleString('fr-FR')
                            : entry.value_text || '—'}
                        </span>
                        {entry.unit && <span className="ml-1.5 text-sm text-gray-400">{entry.unit}</span>}
                      </div>
                      {entry.data_source && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {entry.data_source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Delete Confirm Modal ─────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          label={deleteTarget.metric_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ─── Add Entry Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('dataEntry.modalTitle')}</h2>
                <p className="text-sm text-gray-400 mt-0.5">Étape {step} sur 3</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Step dots */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div
                      key={s}
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: s === step ? 24 : 8,
                        backgroundColor: s <= step ? '#059669' : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-8 py-6 space-y-6">

                {/* ── Step 1: Pillar ── */}
                {step === 1 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-4">Choisissez un pilier ESG</p>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(PILLAR_CFG).map(([id, cfg]) => {
                        const Icon = cfg.icon;
                        const active = selectedPillar === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handlePillarChange(id)}
                            className="relative p-6 rounded-2xl border-2 text-center transition-all overflow-hidden"
                            style={{
                              borderColor: active ? cfg.color : '#e5e7eb',
                              backgroundColor: active ? cfg.softBg : 'white',
                            }}
                          >
                            {active && (
                              <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: cfg.strip }} />
                            )}
                            <div className="p-3 rounded-xl mx-auto w-fit mb-3" style={{ backgroundColor: active ? cfg.iconBg : '#f9fafb' }}>
                              <Icon className="h-7 w-7" style={{ color: active ? cfg.color : '#9ca3af' }} />
                            </div>
                            <p className="text-sm font-semibold" style={{ color: active ? cfg.color : '#9ca3af' }}>
                              {cfg.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Category & Metric ── */}
                {step === 2 && selectedPillar && templates[selectedPillar] && (
                  <div className="space-y-5">
                    {/* Selected pillar indicator */}
                    {(() => {
                      const cfg = getPillarCfg(selectedPillar);
                      const Icon = cfg.icon;
                      return (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: cfg.softBg, color: cfg.color }}>
                          <Icon className="h-4 w-4" />
                          Pilier sélectionné : {cfg.label}
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.stepCategory')}</label>
                      <select
                        value={selectedCategory}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                        required
                      >
                        <option value="">{t('dataEntry.chooseCategory')}</option>
                        {Object.keys(templates[selectedPillar]).map(cat => (
                          <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    {selectedCategory && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.stepIndicator')}</label>
                        <select
                          value={selectedMetric?.name || ''}
                          onChange={e => {
                            const metric = templates[selectedPillar][selectedCategory]?.find(
                              (m: MetricTemplate) => m.name === e.target.value
                            );
                            if (metric) handleMetricSelect(metric);
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                          required
                        >
                          <option value="">{t('dataEntry.chooseIndicator')}</option>
                          {templates[selectedPillar][selectedCategory]?.map((metric: MetricTemplate) => (
                            <option key={metric.name} value={metric.name}>{metric.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {selectedMetric?.description && (
                      <div className="flex items-start gap-2 p-3.5 bg-emerald-50 rounded-xl text-sm text-emerald-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        {selectedMetric.description}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Values & Details ── */}
                {step === 3 && selectedMetric && (
                  <div className="space-y-5">
                    {/* Recap banner */}
                    {(() => {
                      const cfg = getPillarCfg(selectedPillar);
                      const Icon = cfg.icon;
                      return (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: cfg.strip, backgroundColor: cfg.softBg }}>
                          <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                          <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-gray-400 text-sm">·</span>
                          <span className="text-sm text-gray-600 font-medium truncate">{selectedMetric.name}</span>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.valueLabel')}</label>
                        <div className="flex gap-2">
                          <input
                            type="number" step="any"
                            value={formData.value_numeric}
                            onChange={e => setFormData({ ...formData, value_numeric: e.target.value })}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400"
                            placeholder="0.00" required disabled={submitting}
                          />
                          <input
                            type="text"
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400 text-center"
                            placeholder={t('dataEntry.unitPlaceholder')}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.organisation')}</label>
                        <select
                          value={formData.organization_id}
                          onChange={e => setFormData({ ...formData, organization_id: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                          disabled={submitting}
                        >
                          <option value="">{t('dataEntry.allOrgs')}</option>
                          {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: t('dataEntry.periodStart'), key: 'period_start', type: 'date' },
                        { label: t('dataEntry.periodEnd'),   key: 'period_end',   type: 'date' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{f.label}</label>
                          <input
                            type={f.type}
                            value={(formData as any)[f.key]}
                            onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400"
                            required disabled={submitting}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.periodType')}</label>
                        <select
                          value={formData.period_type}
                          onChange={e => setFormData({ ...formData, period_type: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all bg-white"
                          disabled={submitting}
                        >
                          <option value="annual">{t('dataEntry.annual')}</option>
                          <option value="quarterly">{t('dataEntry.quarterly')}</option>
                          <option value="monthly">{t('dataEntry.monthly')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.dataSource')}</label>
                      <input
                        type="text"
                        value={formData.data_source}
                        onChange={e => setFormData({ ...formData, data_source: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400"
                        placeholder="Ex: Rapport annuel 2024, Système RH…"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataEntry.notes')}</label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all placeholder:text-gray-400 resize-none"
                        placeholder={t('dataEntry.notesPlaceholder')}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Navigation */}
              <div className="flex items-center gap-3 px-8 py-5 border-t border-gray-100">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  {t('dataEntry.cancel')}
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    disabled={
                      (step === 1 && !selectedPillar) ||
                      (step === 2 && (!selectedCategory || !selectedMetric))
                    }
                    onClick={() => setStep(s => s + 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#059669', color: 'white' }}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 hover:-translate-y-px hover:shadow-btn-primary-hover"
                    style={{ backgroundColor: '#059669', color: 'white' }}
                  >
                    {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                    {submitting ? t('dataEntry.saving') : t('dataEntry.save')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
