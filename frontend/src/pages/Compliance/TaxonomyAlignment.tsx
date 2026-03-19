import { useState } from 'react';
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
} from 'lucide-react';
import Card from '@/components/common/Card';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlignmentStatus = 'aligned' | 'partial' | 'not_aligned';
type ObjectiveKey = 'mitigation' | 'adaptation' | 'water' | 'circular' | 'pollution' | 'biodiversity';

interface Activity {
  id: number;
  name: string;
  sector: string;
  objective: ObjectiveKey;
  dnsh: boolean;
  safeguards: boolean;
  status: AlignmentStatus;
}

interface NewActivityForm {
  name: string;
  sector: string;
  objective: ObjectiveKey;
  contribution: boolean;
  dnsh: boolean;
  safeguards: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_ACTIVITIES: Activity[] = [
  { id: 1, name: "Production d'énergie solaire", sector: 'Énergie', objective: 'mitigation', dnsh: true, safeguards: true, status: 'aligned' },
  { id: 2, name: 'Transport ferroviaire', sector: 'Transport', objective: 'mitigation', dnsh: true, safeguards: true, status: 'aligned' },
  { id: 3, name: 'Rénovation de bâtiments', sector: 'Immobilier', objective: 'mitigation', dnsh: false, safeguards: true, status: 'partial' },
  { id: 4, name: 'Gestion des déchets', sector: 'Environnement', objective: 'circular', dnsh: true, safeguards: true, status: 'aligned' },
  { id: 5, name: 'Agriculture biologique', sector: 'Agriculture', objective: 'biodiversity', dnsh: true, safeguards: false, status: 'partial' },
  { id: 6, name: "Production d'acier", sector: 'Industrie', objective: 'mitigation', dnsh: false, safeguards: false, status: 'not_aligned' },
];

const OBJECTIVES: {
  key: ObjectiveKey;
  label: string;
  description: string;
  Icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: 'mitigation',
    label: 'Atténuation du changement climatique',
    description: 'Réduction des émissions de GES et séquestration du carbone pour limiter le réchauffement planétaire.',
    Icon: Thermometer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    key: 'adaptation',
    label: 'Adaptation au changement climatique',
    description: "Renforcement de la résilience face aux impacts climatiques actuels et futurs.",
    Icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'water',
    label: 'Eau et ressources marines',
    description: "Protection et usage durable de l'eau douce, des eaux de transition et des ressources marines.",
    Icon: Droplets,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  {
    key: 'circular',
    label: 'Économie circulaire',
    description: 'Transition vers des modèles de production et de consommation circulaires et sobres en ressources.',
    Icon: Recycle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    key: 'pollution',
    label: 'Prévention de la pollution',
    description: "Prévention et réduction de la pollution de l'air, de l'eau, des sols et des organismes vivants.",
    Icon: Wind,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    key: 'biodiversity',
    label: 'Biodiversité',
    description: 'Protection et restauration de la biodiversité et des écosystèmes terrestres et aquatiques.',
    Icon: Leaf,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const OBJECTIVE_LABELS: Record<ObjectiveKey, string> = {
  mitigation: 'Atténuation climat',
  adaptation: 'Adaptation climat',
  water: 'Eau & ressources marines',
  circular: 'Économie circulaire',
  pollution: 'Prévention pollution',
  biodiversity: 'Biodiversité',
};

const DEFAULT_FORM: NewActivityForm = {
  name: '',
  sector: '',
  objective: 'mitigation',
  contribution: false,
  dnsh: false,
  safeguards: false,
};

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AlignmentStatus }) {
  const config: Record<AlignmentStatus, { label: string; className: string; Icon: React.ElementType }> = {
    aligned: { label: 'Alignée', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200', Icon: CheckCircle },
    partial: { label: 'Partielle', className: 'bg-amber-100 text-amber-800 border border-amber-200', Icon: AlertCircle },
    not_aligned: { label: 'Non alignée', className: 'bg-red-100 text-red-800 border border-red-200', Icon: XCircle },
  };
  const { label, className, Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
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
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveKey | 'all'>('all');
  const [assessmentMode, setAssessmentMode] = useState<'view' | 'edit'>('view');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewActivityForm>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);

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

    const status: AlignmentStatus =
      form.contribution && form.dnsh && form.safeguards
        ? 'aligned'
        : form.contribution || form.dnsh || form.safeguards
        ? 'partial'
        : 'not_aligned';

    const newActivity: Activity = {
      id: Date.now(),
      name: form.name.trim(),
      sector: form.sector.trim(),
      objective: form.objective,
      dnsh: form.dnsh,
      safeguards: form.safeguards,
      status,
    };

    setActivities((prev) => [...prev, newActivity]);
    setForm(DEFAULT_FORM);
    setShowModal(false);
  };

  const handleToggleStatus = (id: number) => {
    if (assessmentMode !== 'edit') return;
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const cycle: AlignmentStatus[] = ['aligned', 'partial', 'not_aligned'];
        const next = cycle[(cycle.indexOf(a.status) + 1) % cycle.length];
        return { ...a, status: next };
      })
    );
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await api.post('/taxonomy/report', { activities });
    } catch {
      // silently ignore — report generation is best-effort
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-full mb-4">
                <Leaf size={14} />
                Taxonomie UE 2023
              </div>
              <h1 className="text-3xl font-bold mb-2">Alignement Taxonomie Européenne</h1>
              <p className="text-teal-200 text-sm max-w-xl">
                Évaluez l'alignement de vos activités économiques avec les six objectifs environnementaux
                du règlement EU 2020/852 sur la finance durable.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAssessmentMode(assessmentMode === 'view' ? 'edit' : 'view')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  assessmentMode === 'edit'
                    ? 'bg-white text-teal-900 border-white'
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                }`}
              >
                {assessmentMode === 'edit' ? 'Mode édition actif' : 'Activer édition'}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Plus size={16} />
                Déclarer une activité
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── Stats cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total activités</span>
            <span className="text-3xl font-bold text-gray-900">{totalActivities}</span>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Alignées</span>
            <span className="text-3xl font-bold text-emerald-600">{alignedCount}</span>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${totalActivities ? (alignedCount / totalActivities) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Partiellement alignées</span>
            <span className="text-3xl font-bold text-amber-500">{partialCount}</span>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all"
                style={{ width: `${totalActivities ? (partialCount / totalActivities) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">% CapEx éligible</span>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Objectifs environnementaux</h2>
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
              <h2 className="text-lg font-semibold text-gray-900">Activités économiques</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredActivities.length} activité{filteredActivities.length !== 1 ? 's' : ''}
                {selectedObjective !== 'all' && ` · filtrées par ${OBJECTIVE_LABELS[selectedObjective]}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedObjective !== 'all' && (
                <button
                  onClick={() => setSelectedObjective('all')}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X size={12} /> Effacer filtre
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
                Générer rapport
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Activité</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Secteur</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Objectif</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    Contribution substantielle
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    DNSH
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    Garde-fous sociaux
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    Statut
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
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{activity.name}</td>
                      <td className="px-4 py-3 text-gray-600">{activity.sector}</td>
                      <td className="px-4 py-3">
                        {obj && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${obj.bgColor} ${obj.color}`}
                          >
                            <obj.Icon size={11} />
                            {OBJECTIVE_LABELS[activity.objective]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BooleanBadge value={true} />
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
                <p className="text-sm">Aucune activité pour cet objectif</p>
              </div>
            )}
          </div>

          {assessmentMode === 'edit' && (
            <p className="mt-3 text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} />
              Mode édition : cliquez sur une ligne pour faire tourner le statut d'alignement.
            </p>
          )}
        </Card>

        {/* ── Summary progress ─────────────────────────────────────────────── */}
        <Card title="Récapitulatif d'alignement">
          <div className="space-y-4">
            {[
              { label: 'Alignées', count: alignedCount, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
              { label: 'Partiellement alignées', count: partialCount, color: 'bg-amber-400', textColor: 'text-amber-700' },
              {
                label: 'Non alignées',
                count: activities.filter((a) => a.status === 'not_aligned').length,
                color: 'bg-red-400',
                textColor: 'text-red-700',
              },
            ].map(({ label, count, color, textColor }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className={`font-medium ${textColor}`}>{label}</span>
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
                <h3 className="text-lg font-semibold text-gray-900">Déclarer une activité</h3>
                <p className="text-sm text-gray-500 mt-0.5">Ajouter une nouvelle activité économique</p>
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
                  Nom de l'activité <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Production d'énergie éolienne"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Secteur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                  placeholder="Ex: Énergie renouvelable"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Objectif environnemental</label>
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
                <p className="text-sm font-medium text-gray-700">Critères d'éligibilité</p>
                {[
                  { field: 'contribution' as const, label: 'Contribution substantielle', hint: "L'activité contribue substantiellement à l'objectif" },
                  { field: 'dnsh' as const, label: 'Absence de préjudice significatif (DNSH)', hint: 'Ne nuit pas aux cinq autres objectifs' },
                  { field: 'safeguards' as const, label: 'Garde-fous sociaux minimaux', hint: 'Respect des droits humains et normes sociales' },
                ].map(({ field, label, hint }) => (
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
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{hint}</p>
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
                Annuler
              </button>
              <button
                onClick={handleAddActivity}
                disabled={!form.name.trim() || !form.sector.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Ajouter l'activité
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
