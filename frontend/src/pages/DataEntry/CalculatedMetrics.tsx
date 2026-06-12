/**
 * CalculatedMetrics — Calculs automatiques ESG
 * Affiche toutes les formules avec leur statut (calculée / inputs manquants)
 * + Saisie rapide inline pour alimenter les calculs sans quitter la page
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Calculator, Zap, RefreshCw, Leaf, Users, Landmark,
  CheckCircle, AlertCircle, Clock, ChevronRight, X,
  ArrowUpRight, ArrowDownRight, Minus, Loader2,
  FlameKindling, Percent, BarChart3, BookOpen, Plus,
  Info, TrendingUp,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormulaDefinition {
  inputs: string[];
  unit: string;
  category: string;
  pillar: string;
}

interface CalculatedResult {
  name: string;
  value: number;
  unit: string;
  category: string;
  pillar: string;
  inputs_used: Record<string, number>;
}

// ─── Config statique des formules (miroir du backend) ─────────────────────────
const FORMULA_META: Record<string, {
  displayName: string; description: string; formulaStr: string;
  inputs: string[]; inputLabels: Record<string, string>;
  unit: string; pillar: string; category: string; icon: React.ElementType;
}> = {
  scope_3_total: {
    displayName: 'Scope 3 Total',
    description: 'Total des émissions indirectes (Scope 1 + Scope 2)',
    formulaStr: 'Scope 1 + Scope 2',
    inputs: ['scope_1', 'scope_2'],
    inputLabels: { scope_1: 'Émissions Scope 1 (tCO₂e)', scope_2: 'Émissions Scope 2 (tCO₂e)' },
    unit: 'tCO₂e', pillar: 'environmental', category: 'Émissions', icon: FlameKindling,
  },
  carbon_intensity: {
    displayName: 'Intensité Carbone',
    description: 'Émissions totales rapportées au chiffre d\'affaires',
    formulaStr: '(Émissions totales / CA) × 1000',
    inputs: ['total_emissions', 'revenue'],
    inputLabels: { total_emissions: 'Émissions totales (tCO₂e)', revenue: 'Chiffre d\'affaires (M€)' },
    unit: 'tCO₂e/M€', pillar: 'environmental', category: 'Émissions', icon: BarChart3,
  },
  renewable_percentage: {
    displayName: '% Énergies Renouvelables',
    description: 'Part des énergies renouvelables dans la consommation totale',
    formulaStr: '(Énergie renouvelable / Énergie totale) × 100',
    inputs: ['renewable_energy', 'total_energy'],
    inputLabels: { renewable_energy: 'Énergie renouvelable (MWh)', total_energy: 'Énergie totale (MWh)' },
    unit: '%', pillar: 'environmental', category: 'Énergie', icon: Percent,
  },
  turnover_rate: {
    displayName: 'Taux de Turnover',
    description: 'Rotation du personnel sur l\'effectif moyen',
    formulaStr: '(Départs / Effectif moyen) × 100',
    inputs: ['departures', 'average_headcount'],
    inputLabels: { departures: 'Nombre de départs', average_headcount: 'Effectif moyen' },
    unit: '%', pillar: 'social', category: 'RH', icon: Users,
  },
  training_rate: {
    displayName: 'Formation par Salarié',
    description: 'Nombre moyen d\'heures de formation par salarié',
    formulaStr: 'Heures formation / Effectif',
    inputs: ['training_hours', 'headcount'],
    inputLabels: { training_hours: 'Heures de formation (h)', headcount: 'Effectif total' },
    unit: 'h/personne', pillar: 'social', category: 'RH', icon: BookOpen,
  },
  women_percentage: {
    displayName: 'Parité Femmes',
    description: 'Part des femmes dans l\'effectif total',
    formulaStr: '(Effectif femmes / Effectif total) × 100',
    inputs: ['women_count', 'total_headcount'],
    inputLabels: { women_count: 'Effectif femmes', total_headcount: 'Effectif total' },
    unit: '%', pillar: 'social', category: 'Diversité', icon: Users,
  },
};

// ─── Pillar config ────────────────────────────────────────────────────────────
const PILLAR_CFG = {
  environmental: { label: 'Environnement', icon: Leaf, color: '#059669', softBg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  social:        { label: 'Social',         icon: Users, color: '#2563eb', softBg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  governance:    { label: 'Gouvernance',    icon: Landmark, color: '#7c3aed', softBg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' },
} as const;

function getPillar(key: string) {
  return PILLAR_CFG[key as keyof typeof PILLAR_CFG] ?? {
    label: key, icon: Zap, color: '#6b7280', softBg: '#f9fafb', border: '#e5e7eb', text: '#374151',
  };
}

// ─── Quick input modal ────────────────────────────────────────────────────────
function QuickInputModal({
  formulaKey, missingInputs, year,
  onClose, onSaved,
}: {
  formulaKey: string; missingInputs: string[]; year: number;
  onClose: () => void; onSaved: () => void;
}) {
  const meta = FORMULA_META[formulaKey];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Mapping input key → metric_name attendu par le backend
  const INPUT_TO_METRIC: Record<string, string> = {
    scope_1: 'Scope 1',
    scope_2: 'Scope 2',
    total_emissions: 'Émissions totales',
    revenue: "Chiffre d'affaires",
    renewable_energy: 'Énergie renouvelable',
    total_energy: 'Énergie totale',
    departures: 'Départs',
    average_headcount: 'Effectif moyen',
    training_hours: 'Heures formation',
    headcount: 'Effectif total',
    women_count: 'Effectif femmes',
    total_headcount: 'Effectif total',
  };

  const UNIT_MAP: Record<string, string> = {
    scope_1: 'tCO2e', scope_2: 'tCO2e', total_emissions: 'tCO2e',
    revenue: 'M€', renewable_energy: 'MWh', total_energy: 'MWh',
    departures: 'personnes', average_headcount: 'personnes',
    training_hours: 'heures', headcount: 'personnes',
    women_count: 'personnes', total_headcount: 'personnes',
  };

  const handleSave = async () => {
    const entries = missingInputs.map(key => ({
      metric_name: INPUT_TO_METRIC[key] || key,
      value_numeric: parseFloat(values[key] || '0'),
      unit: UNIT_MAP[key] || '',
      period_start: `${year}-01-01`,
      period_end: `${year}-12-31`,
      period_type: 'annual',
      pillar: meta.pillar,
      category: meta.category,
      collection_method: 'manual',
    }));

    if (entries.some(e => isNaN(e.value_numeric) || e.value_numeric === 0)) {
      toast.error('Veuillez saisir des valeurs numériques non nulles.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all(entries.map(e => api.post('/data-entry/', e)));
      toast.success('Données enregistrées — recalcul en cours…');
      onSaved();
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: getPillar(meta.pillar).softBg }}>
                <meta.icon className="h-3.5 w-3.5" style={{ color: getPillar(meta.pillar).color }} />
              </div>
              <span className="text-sm font-bold text-gray-900">{meta.displayName}</span>
            </div>
            <p className="text-xs text-gray-500">Saisir les données manquantes pour {year}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formula preview */}
        <div className="mx-5 mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Formule</p>
          <p className="text-sm font-mono text-gray-700 font-medium">{meta.formulaStr}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">→ Résultat en {meta.unit}</p>
        </div>

        {/* Inputs */}
        <div className="p-5 space-y-3">
          {missingInputs.map(key => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {meta.inputLabels[key] || key}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={values[key] || ''}
                  onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-400 font-medium w-16 text-right">{UNIT_MAP[key]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || missingInputs.some(k => !values[k])}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Enregistrer & calculer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formula card ─────────────────────────────────────────────────────────────
function FormulaCard({
  formulaKey, result, year, onQuickInput,
}: {
  formulaKey: string; result: CalculatedResult | null; year: number; onQuickInput: (key: string, missing: string[]) => void;
}) {
  const meta = FORMULA_META[formulaKey];
  if (!meta) return null;
  const pillar = getPillar(meta.pillar);
  const Icon = meta.icon;
  const isCalculated = result !== null;

  // Identifier les inputs manquants
  const inputsUsedKeys = result ? Object.keys(result.inputs_used) : [];
  const missingInputs = isCalculated ? [] : meta.inputs;

  return (
    <div className={`relative rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-md ${
      isCalculated ? 'border-gray-200 shadow-sm' : 'border-gray-200 shadow-sm'
    }`}>
      {/* Bande colorée en haut */}
      <div className="h-1.5 w-full" style={{ background: isCalculated ? pillar.color : '#e5e7eb' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: pillar.softBg }}>
              <Icon className="h-4 w-4" style={{ color: pillar.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: pillar.text }}>{meta.category}</p>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{meta.displayName}</h3>
            </div>
          </div>
          {/* Statut badge */}
          {isCalculated ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full flex-shrink-0">
              <CheckCircle className="h-3 w-3" /> Calculé
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full flex-shrink-0">
              <AlertCircle className="h-3 w-3" /> En attente
            </span>
          )}
        </div>

        {/* Résultat ou formule */}
        {isCalculated ? (
          <>
            {/* Valeur calculée */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">
                  {result!.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-medium text-gray-500">{result!.unit}</span>
              </div>
            </div>

            {/* Inputs utilisés */}
            <div className="rounded-xl border p-3 space-y-1.5" style={{ background: pillar.softBg, borderColor: pillar.border }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: pillar.text }}>Calculé depuis</p>
              {Object.entries(result!.inputs_used).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-gray-900">{v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            {/* Formule (détail) */}
            <p className="mt-2.5 text-[11px] text-gray-400 font-mono">{meta.formulaStr}</p>
          </>
        ) : (
          <>
            {/* Description + formule */}
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{meta.description}</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 mb-4">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Formule</p>
              <p className="text-xs font-mono text-gray-700">{meta.formulaStr}</p>
            </div>

            {/* Inputs manquants */}
            <div className="space-y-1.5 mb-4">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Données requises</p>
              {meta.inputs.map(inp => (
                <div key={inp} className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  <span className="text-gray-600">{meta.inputLabels[inp] || inp}</span>
                </div>
              ))}
            </div>

            {/* CTA saisie rapide */}
            <button
              onClick={() => onQuickInput(formulaKey, missingInputs)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Saisir les données pour {year}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
const YEARS = [2023, 2024, 2025, 2026];

export default function CalculatedMetrics() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<Record<string, CalculatedResult>>({});
  const [quickInputKey, setQuickInputKey] = useState<string | null>(null);
  const [quickInputMissing, setQuickInputMissing] = useState<string[]>([]);

  const formulaKeys = Object.keys(FORMULA_META);
  const calculatedCount = Object.keys(results).length;
  const totalCount = formulaKeys.length;
  const pct = Math.round((calculatedCount / totalCount) * 100);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/calculations/metrics?year=${year}`);
      setResults(res.data || {});
    } catch {
      toast.error('Erreur de chargement des calculs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleQuickInput = (key: string, missing: string[]) => {
    setQuickInputKey(key);
    setQuickInputMissing(missing);
  };

  const handleSaved = () => {
    setQuickInputKey(null);
    load(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label="Données" />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #5b21b6 100%)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs font-semibold mb-3 border border-white/20">
              <Zap className="h-3.5 w-3.5 text-yellow-300" /> Moteur de calcul automatique
            </div>
            <h1 className="text-2xl font-bold mb-1">Calculs Automatiques</h1>
            <p className="text-violet-200 text-sm">
              {calculatedCount > 0
                ? `${calculatedCount} sur ${totalCount} formules calculées depuis vos données`
                : `${totalCount} formules prêtes — saisissez vos données pour les activer`}
            </p>

            {/* Progress bar */}
            <div className="mt-4 max-w-xs">
              <div className="flex justify-between text-xs text-violet-200 mb-1.5">
                <span>Formules actives</span>
                <span className="font-bold text-white">{calculatedCount}/{totalCount}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Year selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/20">
              {YEARS.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
                    y === year ? 'bg-white text-violet-900 shadow' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Calcul…' : 'Recalculer'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Banner recalcul ──────────────────────────────────────────────────── */}
      {refreshing && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <Loader2 className="h-4 w-4 text-indigo-500 animate-spin flex-shrink-0" />
          <p className="text-sm font-medium text-indigo-700">Recalcul de toutes les formules pour {year}…</p>
        </div>
      )}

      {/* ── Grille des formules ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {totalCount} formules ESG — exercice {year}
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Calculé ({calculatedCount})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> En attente ({totalCount - calculatedCount})</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {formulaKeys.map(key => (
            <FormulaCard
              key={key}
              formulaKey={key}
              result={results[key] || null}
              year={year}
              onQuickInput={handleQuickInput}
            />
          ))}
        </div>
      </section>

      {/* ── Info ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <Info className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-indigo-900">Comment ça fonctionne ?</p>
          <p className="mt-1 text-sm text-indigo-700">
            Les calculs sont automatiques : dès que vous saisissez les données requises via{' '}
            <strong>Saisir des données</strong>, les formules se déclenchent. Vous pouvez aussi utiliser{' '}
            <strong>Saisir les données</strong> directement sur chaque carte pour alimenter une formule spécifique.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/data-entry')}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          Saisir des données <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Modal saisie rapide ──────────────────────────────────────────────── */}
      {quickInputKey && (
        <QuickInputModal
          formulaKey={quickInputKey}
          missingInputs={quickInputMissing}
          year={year}
          onClose={() => setQuickInputKey(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
