import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  Thermometer,
  Shield,
  Droplets,
  Recycle,
  Wind,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  X,
  FileText,
  Download,
  ArrowLeft,
  RefreshCw,
  Info,
} from 'lucide-react';
import Card from '@/components/common/Card';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlignmentStatus = 'aligned' | 'partial' | 'not_aligned';
type ObjectiveKey = 'mitigation' | 'adaptation' | 'water' | 'circular' | 'pollution' | 'biodiversity';

interface Activity {
  id: string | number;
  name: string;
  sector: string;
  objective: ObjectiveKey;
  dnsh: boolean;
  safeguards: boolean;
  contribution: boolean;
  status: AlignmentStatus;
  nace?: string;
  threshold?: string;
}

interface NewActivityForm {
  name: string;
  sector: string;
  objective: ObjectiveKey;
  contribution: boolean;
  dnsh: boolean;
  safeguards: boolean;
}

interface ApiSector {
  id: string;
  name: string;
}

interface ApiActivity {
  id: string;
  nace: string;
  name: string;
  sector: string;
  objective: string;
  threshold: string;
  dnsh_summary: string;
  eligible: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FORM: NewActivityForm = {
  name: '',
  sector: '',
  objective: 'mitigation',
  contribution: false,
  dnsh: false,
  safeguards: false,
};

function deriveStatus(contribution: boolean, dnsh: boolean, safeguards: boolean): AlignmentStatus {
  if (contribution && dnsh && safeguards) return 'aligned';
  if (contribution || dnsh || safeguards) return 'partial';
  return 'not_aligned';
}

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AlignmentStatus }) {
  const { t } = useTranslation();
  const config: Record<AlignmentStatus, { labelKey: string; className: string; Icon: React.ElementType }> = {
    aligned: { labelKey: 'taxonomy.statusAligned', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200', Icon: CheckCircle },
    partial: { labelKey: 'taxonomy.statusPartial', className: 'bg-amber-100 text-amber-800 border border-amber-200', Icon: AlertCircle },
    not_aligned: { labelKey: 'taxonomy.statusNotAligned', className: 'bg-red-100 text-red-800 border border-red-200', Icon: XCircle },
  };
  const { labelKey, className, Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon size={12} />
      {t(labelKey)}
    </span>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle size={18} className="text-emerald-500 mx-auto" />
  ) : (
    <XCircle size={18} className="text-red-400 mx-auto" />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaxonomyAlignment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveKey | 'all'>('all');
  const [assessmentMode, setAssessmentMode] = useState<'view' | 'edit'>('view');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewActivityForm>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectors, setSectors] = useState<ApiSector[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sectors from API
  useEffect(() => {
    api.get('/taxonomy/sectors')
      .then(res => setSectors(res.data?.sectors || []))
      .catch(() => {});
  }, []);

  // Load saved plan OR fall back to reference activities
  useEffect(() => {
    setLoadingActivities(true);
    api.get('/taxonomy/plan')
      .then(res => {
        const saved: Activity[] = res.data?.activities || [];
        if (saved.length > 0) {
          setActivities(saved);
          setPlanLoaded(true);
        } else {
          // No saved plan → load reference activities from API
          return api.get('/taxonomy/activities').then(r => {
            const refActivities: ApiActivity[] = r.data?.activities || [];
            setActivities(refActivities.map(a => ({
              id: a.id,
              name: a.name,
              sector: a.sector,
              objective: a.objective as ObjectiveKey,
              nace: a.nace,
              threshold: a.threshold,
              dnsh: true,
              safeguards: true,
              contribution: true,
              status: 'aligned' as AlignmentStatus,
            })));
            setPlanLoaded(true);
          });
        }
      })
      .catch(() => setPlanLoaded(true))
      .finally(() => setLoadingActivities(false));
  }, []);

  // Auto-save plan (debounced 1.5s)
  const savePlan = useCallback((currentActivities: Activity[]) => {
    if (!planLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      api.post('/taxonomy/plan', {
        activities: currentActivities,
        saved_at: new Date().toISOString(),
      })
        .catch(() => toast.error('Impossible de sauvegarder le plan'))
        .finally(() => setSaving(false));
    }, 1500);
  }, [planLoaded]);

  useEffect(() => {
    if (planLoaded && activities.length > 0) savePlan(activities);
  }, [activities, planLoaded, savePlan]);

  // ── Objectives config ────────────────────────────────────────────────────────
  const OBJECTIVES: {
    key: ObjectiveKey;
    label: string;
    labelShort: string;
    description: string;
    Icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
  }[] = [
    {
      key: 'mitigation',
      label: t('taxonomy.objectiveMitigation'),
      labelShort: t('taxonomy.objectiveMitigationShort'),
      description: t('taxonomy.objectiveMitigationDesc'),
      Icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      key: 'adaptation',
      label: t('taxonomy.objectiveAdaptation'),
      labelShort: t('taxonomy.objectiveAdaptationShort'),
      description: t('taxonomy.objectiveAdaptationDesc'),
      Icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      key: 'water',
      label: t('taxonomy.objectiveWater'),
      labelShort: t('taxonomy.objectiveWaterShort'),
      description: t('taxonomy.objectiveWaterDesc'),
      Icon: Droplets,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
    },
    {
      key: 'circular',
      label: t('taxonomy.objectiveCircular'),
      labelShort: t('taxonomy.objectiveCircularShort'),
      description: t('taxonomy.objectiveCircularDesc'),
      Icon: Recycle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      key: 'pollution',
      label: t('taxonomy.objectivePollution'),
      labelShort: t('taxonomy.objectivePollutionShort'),
      description: t('taxonomy.objectivePollutionDesc'),
      Icon: Wind,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      key: 'biodiversity',
      label: t('taxonomy.objectiveBiodiversity'),
      labelShort: t('taxonomy.objectiveBiodiversityShort'),
      description: t('taxonomy.objectiveBiodiversityDesc'),
      Icon: Leaf,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  // ── Computed stats ──────────────────────────────────────────────────────────
  const totalActivities = activities.length;
  const alignedCount = activities.filter((a) => a.status === 'aligned').length;
  const partialCount = activities.filter((a) => a.status === 'partial').length;
  const capexEligible = totalActivities > 0 ? Math.round((alignedCount / totalActivities) * 100) : 0;

  const filteredActivities =
    selectedObjective === 'all' ? activities : activities.filter((a) => a.objective === selectedObjective);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddActivity = () => {
    if (!form.name.trim() || !form.sector.trim()) return;
    const status = deriveStatus(form.contribution, form.dnsh, form.safeguards);
    const newActivity: Activity = {
      id: `custom-${Date.now()}`,
      name: form.name.trim(),
      sector: form.sector.trim(),
      objective: form.objective,
      dnsh: form.dnsh,
      safeguards: form.safeguards,
      contribution: form.contribution,
      status,
    };
    setActivities((prev) => [...prev, newActivity]);
    setForm(DEFAULT_FORM);
    setShowModal(false);
    toast.success('Activité ajoutée au plan');
  };

  const handleToggleStatus = (id: string | number) => {
    if (assessmentMode !== 'edit') return;
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const cycle: AlignmentStatus[] = ['aligned', 'partial', 'not_aligned'];
        const next = cycle[(cycle.indexOf(a.status) + 1) % cycle.length];
        const contrib = next === 'aligned';
        const dnsh = next !== 'not_aligned';
        return { ...a, status: next, contribution: contrib, dnsh, safeguards: contrib };
      })
    );
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/taxonomy/report', { activities });
      const summary = res.data?.summary;
      // Export CSV
      const rows = [
        ['Activité', 'Secteur', 'Objectif', 'Contribution substantielle', 'DNSH', 'Garanties min.', 'Statut', 'Code NACE', 'Seuil technique'],
        ...activities.map(a => [
          a.name, a.sector, a.objective,
          a.contribution ? 'Oui' : 'Non',
          a.dnsh ? 'Oui' : 'Non',
          a.safeguards ? 'Oui' : 'Non',
          a.status, a.nace || '', a.threshold || '',
        ]),
      ];
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taxonomie-ue-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (summary) {
        toast.success(`Rapport généré · ${summary.aligned_activities}/${summary.total_activities} activités alignées (${summary.aligned_capex_pct}% CapEx)`);
      }
    } catch {
      toast.error('Impossible de générer le rapport');
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-teal-900 to-emerald-700 text-white px-8 py-10 shadow-xl">
        <div>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-teal-200 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-full mb-4">
                <Leaf size={14} />
                {t('taxonomy.badge')}
              </div>
              <h1 className="text-3xl font-bold mb-2">{t('taxonomy.title')}</h1>
              <p className="text-teal-200 text-sm max-w-xl">
                {t('taxonomy.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {saving && (
                <span className="text-xs text-teal-200 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Sauvegarde…
                </span>
              )}
              {!saving && planLoaded && activities.length > 0 && (
                <span className="text-xs text-teal-200 flex items-center gap-1">
                  <CheckCircle size={12} /> Plan sauvegardé
                </span>
              )}
              <button
                onClick={() => setAssessmentMode(assessmentMode === 'view' ? 'edit' : 'view')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  assessmentMode === 'edit'
                    ? 'bg-white text-teal-900 border-white'
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                }`}
              >
                {assessmentMode === 'edit' ? t('taxonomy.editModeActive') : t('taxonomy.activateEdit')}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Plus size={16} />
                {t('taxonomy.declareActivity')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Stats cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('taxonomy.totalActivities')}</span>
            <span className="text-3xl font-bold text-gray-900">{totalActivities}</span>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('taxonomy.aligned')}</span>
            <span className="text-3xl font-bold text-emerald-600">{alignedCount}</span>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${totalActivities ? (alignedCount / totalActivities) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('taxonomy.partiallyAligned')}</span>
            <span className="text-3xl font-bold text-amber-500">{partialCount}</span>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all"
                style={{ width: `${totalActivities ? (partialCount / totalActivities) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('taxonomy.capexEligible')}</span>
            <span className="text-3xl font-bold text-teal-600">{capexEligible}%</span>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-teal-500 h-1.5 rounded-full transition-all"
                style={{ width: `${capexEligible}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Objective cards ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('taxonomy.environmentalObjectives')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OBJECTIVES.map(({ key, label, description, Icon, color, bgColor, borderColor }) => {
              const count = activities.filter((a) => a.objective === key).length;
              const alignedForObj = activities.filter((a) => a.objective === key && a.status === 'aligned').length;
              const isActive = selectedObjective === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedObjective(isActive ? 'all' : key)}
                  className={`text-left rounded-lg border-2 p-5 transition-all hover:shadow-md ${
                    isActive ? `${borderColor} ${bgColor}` : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                      <Icon size={20} className={color} />
                    </div>
                    {count > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bgColor} ${color}`}>
                        {alignedForObj}/{count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
                  {count > 0 && (
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(alignedForObj / count) * 100}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Activities table ─────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('taxonomy.economicActivities')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredActivities.length} {filteredActivities.length !== 1 ? t('taxonomy.activityPlural') : t('taxonomy.activitySingular')}
                {selectedObjective !== 'all' && ` · ${t('taxonomy.filteredBy')} ${OBJECTIVES.find(o => o.key === selectedObjective)?.labelShort ?? ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedObjective !== 'all' && (
                <button
                  onClick={() => setSelectedObjective('all')}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X size={12} /> {t('taxonomy.clearFilter')}
                </button>
              )}
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {generating ? (
                  <Download size={14} className="animate-bounce" />
                ) : (
                  <FileText size={14} />
                )}
                {t('taxonomy.generateReport')}
              </button>
            </div>
          </div>

          {loadingActivities ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Chargement des activités…
            </div>
          ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            {assessmentMode === 'edit' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
                <Info size={13} />
                Cliquez sur une ligne pour changer son statut d'alignement (Aligné → Partiel → Non aligné)
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('taxonomy.activity')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">NACE</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('taxonomy.sector')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('taxonomy.objective')}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    {t('taxonomy.substantialContribution')}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    DNSH
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    {t('taxonomy.socialSafeguards')}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    {t('taxonomy.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredActivities.map((activity) => {
                  const obj = OBJECTIVES.find((o) => o.key === activity.objective);
                  return (
                    <tr
                      key={activity.id}
                      onClick={() => handleToggleStatus(activity.id)}
                      className={`bg-white hover:bg-gray-50 transition-colors ${
                        assessmentMode === 'edit' ? 'cursor-pointer' : ''
                      }`}
                      title={activity.threshold ? `Seuil technique : ${activity.threshold}` : undefined}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {activity.name}
                        {activity.threshold && (
                          <div className="text-xs text-gray-400 mt-0.5 hidden lg:block truncate max-w-xs" title={activity.threshold}>
                            {activity.threshold}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{activity.nace || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{activity.sector}</td>
                      <td className="px-4 py-3">
                        {obj && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${obj.bgColor} ${obj.color}`}
                          >
                            <obj.Icon size={11} />
                            {obj.labelShort}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BooleanBadge value={activity.contribution} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BooleanBadge value={activity.dnsh} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BooleanBadge value={activity.safeguards} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={activity.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredActivities.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Leaf size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('taxonomy.noActivityForObjective')}</p>
              </div>
            )}
          </div>

          )}
        </Card>

        {/* ── Summary progress ─────────────────────────────────────────────── */}
        <Card title={t('taxonomy.alignmentSummary')}>
          <div className="space-y-4">
            {[
              { labelKey: 'taxonomy.alignedLabel', count: alignedCount, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
              { labelKey: 'taxonomy.partialLabel', count: partialCount, color: 'bg-amber-400', textColor: 'text-amber-700' },
              {
                labelKey: 'taxonomy.notAlignedLabel',
                count: activities.filter((a) => a.status === 'not_aligned').length,
                color: 'bg-red-400',
                textColor: 'text-red-700',
              },
            ].map(({ labelKey, count, color, textColor }) => (
              <div key={labelKey}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className={`font-medium ${textColor}`}>{t(labelKey)}</span>
                  <span className="text-gray-500">
                    {count} / {totalActivities} ({totalActivities ? Math.round((count / totalActivities) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`${color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${totalActivities ? (count / totalActivities) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Declare activity modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('taxonomy.declareModalTitle')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('taxonomy.declareModalSubtitle')}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('taxonomy.activityName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('taxonomy.activityPlaceholderName')}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('taxonomy.sectorRequired')} <span className="text-red-500">*</span>
                </label>
                {sectors.length > 0 ? (
                  <select
                    value={form.sector}
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                    className="input"
                  >
                    <option value="">-- Sélectionner un secteur --</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.sector}
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                    placeholder={t('taxonomy.sectorPlaceholder')}
                    className="input"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('taxonomy.environmentalObjective')}</label>
                <select
                  value={form.objective}
                  onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value as ObjectiveKey }))}
                  className="input"
                >
                  {OBJECTIVES.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-gray-700">{t('taxonomy.eligibilityCriteria')}</p>
                {[
                  { field: 'contribution' as const, labelKey: 'taxonomy.contributionLabel', hintKey: 'taxonomy.contributionHint' },
                  { field: 'dnsh' as const, labelKey: 'taxonomy.dnshLabel', hintKey: 'taxonomy.dnshHint' },
                  { field: 'safeguards' as const, labelKey: 'taxonomy.safeguardsLabel', hintKey: 'taxonomy.safeguardsHint' },
                ].map(({ field, labelKey, hintKey }) => (
                  <label key={field} className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={form[field]}
                        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                          form[field]
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 group-hover:border-emerald-400'
                        }`}
                      >
                        {form[field] && <CheckCircle size={12} className="text-white" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t(labelKey)}</p>
                      <p className="text-xs text-gray-500">{t(hintKey)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowModal(false); setForm(DEFAULT_FORM); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddActivity}
                disabled={!form.name.trim() || !form.sector.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                {t('taxonomy.addActivity')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
