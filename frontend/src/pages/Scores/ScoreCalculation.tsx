import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, CheckCircle, TrendingUp, TrendingDown, Leaf, Users, Scale,
  ArrowLeft, Search, Building2, Hash, Globe, Sparkles, ChevronDown,
  X, BarChart3, RefreshCw, Info, AlertTriangle, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import RadarChart from '@/components/charts/RadarChart';
import api from '@/services/api';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Organization {
  id: string;
  name: string;
  external_id?: string; // SIREN / identifiant externe
  industry?: string;
  org_type?: string;
  city?: string;
  country?: string;
}

interface ScoreResult {
  id?: string;
  calculation_date?: string;
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  rating?: string;
  grade?: string;
  best_pillar: string;
  worst_pillar: string;
  data_points_count?: number;
  indicators_used?: number;
  data_completeness?: number;
  confidence_level?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const GRADE_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  AAA: { label: 'AAA', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-400' },
  AA:  { label: 'AA',  color: 'text-green-700',   bg: 'bg-green-50',   ring: 'ring-green-400'   },
  A:   { label: 'A',   color: 'text-lime-700',     bg: 'bg-lime-50',    ring: 'ring-lime-400'    },
  BBB: { label: 'BBB', color: 'text-yellow-700',   bg: 'bg-yellow-50',  ring: 'ring-yellow-400'  },
  BB:  { label: 'BB',  color: 'text-amber-700',    bg: 'bg-amber-50',   ring: 'ring-amber-400'   },
  B:   { label: 'B',   color: 'text-orange-700',   bg: 'bg-orange-50',  ring: 'ring-orange-400'  },
  CCC: { label: 'CCC', color: 'text-red-700',      bg: 'bg-red-50',     ring: 'ring-red-400'     },
  CC:  { label: 'CC',  color: 'text-red-800',      bg: 'bg-red-100',    ring: 'ring-red-500'     },
  C:   { label: 'C',   color: 'text-rose-900',     bg: 'bg-rose-100',   ring: 'ring-rose-600'    },
};

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 55) return 'text-lime-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1.5">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ─── OrgSearchCombobox ──────────────────────────────────────────────────── */
interface OrgSearchProps {
  organizations: Organization[];
  value: string;
  onChange: (id: string, org?: Organization) => void;
  loading: boolean;
}

type SearchMode = 'name' | 'siren' | 'industry' | 'all';

function OrgSearchCombobox({ organizations, value, onChange, loading }: OrgSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('all');
  const ref = useRef<HTMLDivElement>(null);

  const selectedOrg = organizations.find(o => o.id === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useCallback(() => {
    const q = query.toLowerCase().trim();
    if (!q) return organizations.slice(0, 50);
    return organizations.filter(org => {
      if (mode === 'name') return org.name.toLowerCase().includes(q);
      if (mode === 'siren') return (org.external_id || '').toLowerCase().includes(q);
      if (mode === 'industry') return (org.industry || '').toLowerCase().includes(q);
      return (
        org.name.toLowerCase().includes(q) ||
        (org.external_id || '').toLowerCase().includes(q) ||
        (org.industry || '').toLowerCase().includes(q) ||
        (org.city || '').toLowerCase().includes(q)
      );
    }).slice(0, 60);
  }, [query, mode, organizations]);

  const modes: { id: SearchMode; label: string; icon: typeof Search }[] = [
    { id: 'all',      label: 'Tout',     icon: Search    },
    { id: 'name',     label: 'Nom',      icon: Building2 },
    { id: 'siren',    label: 'SIREN',    icon: Hash      },
    { id: 'industry', label: 'Secteur',  icon: Globe     },
  ];

  const results = filtered();

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all shadow-sm"
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400 text-sm"><Spinner size="sm" /> Chargement...</span>
        ) : selectedOrg ? (
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-violet-600" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-gray-900 truncate">{selectedOrg.name}</span>
              {selectedOrg.external_id && (
                <span className="text-xs text-gray-400">SIREN : {selectedOrg.external_id}</span>
              )}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-gray-400 text-sm">
            <Search className="h-4 w-4" />
            Rechercher une organisation…
          </span>
        )}
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange('', undefined); setQuery(''); }}
              onKeyDown={(e) => e.key === 'Enter' && onChange('', undefined)}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Search + Mode tabs */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder={
                  mode === 'siren' ? 'Rechercher par SIREN/SIRET…' :
                  mode === 'name' ? 'Rechercher par nom…' :
                  mode === 'industry' ? 'Rechercher par secteur…' :
                  'Rechercher par nom, SIREN, secteur…'
                }
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Mode tabs */}
            <div className="flex gap-1">
              {modes.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === m.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                );
              })}
              <span className="ml-auto text-xs text-gray-400 flex items-center pr-1">
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* All orgs option */}
          <div className="px-2 pt-2">
            <button
              onClick={() => { onChange('', undefined); setOpen(false); setQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                !value ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-gray-500" />
              </span>
              <span>
                <span className="block font-medium">Toutes les organisations</span>
                <span className="text-xs text-gray-400">Score agrégé tenant</span>
              </span>
              {!value && <CheckCircle className="h-4 w-4 ml-auto text-violet-500" />}
            </button>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto px-2 pb-2 pt-1">
            {results.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                Aucune organisation trouvée
              </div>
            ) : (
              results.map(org => (
                <button
                  key={org.id}
                  onClick={() => { onChange(org.id, org); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    value === org.id ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-violet-400" />
                  </span>
                  <span className="flex-1 text-left min-w-0">
                    <span className="block font-medium truncate">{org.name}</span>
                    <span className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      {org.external_id && (
                        <span className="flex items-center gap-0.5">
                          <Hash className="h-2.5 w-2.5" />{org.external_id}
                        </span>
                      )}
                      {org.industry && <span className="capitalize">{org.industry}</span>}
                      {org.city && <span>{org.city}</span>}
                    </span>
                  </span>
                  {value === org.id && <CheckCircle className="h-4 w-4 flex-shrink-0 text-violet-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export default function ScoreCalculation() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedOrgObj, setSelectedOrgObj] = useState<Organization | undefined>();
  const [scoreDate, setScoreDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/organizations?limit=500')
      .then(res => setOrganizations(res.data?.items || res.data?.organizations || []))
      .catch(() => toast.error('Impossible de charger les organisations'))
      .finally(() => setLoadingOrgs(false));
  }, []);

  const handleCalculate = async () => {
    if (!scoreDate) { setError('Veuillez sélectionner une date'); return; }
    setCalculating(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/esg-scoring/calculate', {
        score_date: scoreDate,
        ...(selectedOrg && { organization_id: selectedOrg }),
      });
      setResult(res.data);
      toast.success('Score calculé avec succès');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors du calcul';
      setError(msg);
      toast.error(msg);
    } finally {
      setCalculating(false);
    }
  };

  const grade = result?.rating || result?.grade || '';
  const gradeMeta = GRADE_META[grade] || GRADE_META['C'];

  const radarData = result ? [
    { subject: 'Env.', value: result.environmental_score },
    { subject: 'Social', value: result.social_score },
    { subject: 'Gov.', value: result.governance_score },
  ] : [];

  const pillars = result ? [
    { label: 'Environnement', value: result.environmental_score, icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', border: 'border-emerald-200' },
    { label: 'Social',        value: result.social_score,        icon: Users, color: 'text-blue-600',    bg: 'bg-blue-50',    bar: 'bg-blue-500',    border: 'border-blue-200'    },
    { label: 'Gouvernance',   value: result.governance_score,    icon: Scale, color: 'text-violet-600',  bg: 'bg-violet-50',  bar: 'bg-violet-500',  border: 'border-violet-200'  },
  ] : [];

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,white_1px,transparent_1px),radial-gradient(circle_at_80%_20%,white_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative">
          <button
            onClick={() => navigate(-1)}
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wider uppercase">
                  Moteur de scoring
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-violet-400/20 border border-violet-300/30 rounded-full text-xs font-semibold text-violet-200">
                  <Sparkles className="h-3 w-3" /> IA Pondérée
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Calcul de Score ESG</h1>
              <p className="text-violet-200 text-sm max-w-md">
                Analyse multi-piliers pondérée par secteur · Normalisation 0-100 · Rating AAA→C
              </p>
            </div>
            {result && (
              <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20`}>
                <div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-0.5">Score global</p>
                  <p className={`text-4xl font-extrabold ${scoreColor(result.overall_score)} drop-shadow`}>
                    {Math.round(result.overall_score)}
                  </p>
                </div>
                <div className={`text-2xl font-black px-4 py-2 rounded-xl ring-2 ${gradeMeta.bg} ${gradeMeta.color} ${gradeMeta.ring}`}>
                  {gradeMeta.label}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left Panel : Paramètres ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="!p-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Paramètres de calcul</h2>
                  <p className="text-xs text-gray-500">{organizations.length} organisations disponibles</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Organisation search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisation
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(optionnel)</span>
                </label>
                <OrgSearchCombobox
                  organizations={organizations}
                  value={selectedOrg}
                  onChange={(id, org) => { setSelectedOrg(id); setSelectedOrgObj(org); }}
                  loading={loadingOrgs}
                />
                {selectedOrgObj && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedOrgObj.external_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-xs font-medium">
                        <Hash className="h-3 w-3" /> {selectedOrgObj.external_id}
                      </span>
                    )}
                    {selectedOrgObj.industry && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium capitalize">
                        <Globe className="h-3 w-3" /> {selectedOrgObj.industry}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1 text-gray-400" />
                  Date de calcul
                </label>
                <input
                  type="date"
                  value={scoreDate}
                  onChange={e => setScoreDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  title="Date de calcul"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all shadow-sm"
                />
                {scoreDate && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    Données jusqu'au {format(new Date(scoreDate + 'T00:00:00'), 'd MMMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleCalculate}
                disabled={calculating || !scoreDate}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {calculating ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Calcul en cours…</>
                ) : (
                  <><Calculator className="h-4 w-4" /> Calculer le Score</>
                )}
              </button>
            </div>

            {/* Info footer */}
            <div className="px-6 py-4 bg-blue-50/50 border-t border-blue-100">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Score calculé sur les données disponibles jusqu'à la date choisie,
                  pondérées par secteur d'activité et par indicateur.
                </p>
              </div>
            </div>
          </Card>

          {/* Methodology card */}
          <Card className="!p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                Méthodologie
              </h3>
            </div>
            <div className="px-6 py-4">
              <ol className="space-y-2.5">
                {[
                  { n: '1', label: 'Collecte', desc: 'Données indicateurs sur la période' },
                  { n: '2', label: 'Normalisation', desc: 'Échelle 0-100 par benchmark sectoriel' },
                  { n: '3', label: 'Pondération', desc: 'Poids E/S/G selon le secteur' },
                  { n: '4', label: 'Agrégation', desc: 'Score global et rating AAA→C' },
                ].map(step => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{step.label} :</span>{' '}
                      <span className="text-gray-500">{step.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>

        {/* ── Right Panel : Results ────────────────────────────────────── */}
        <div className="lg:col-span-3">
          {calculating ? (
            <Card className="h-full">
              <div className="flex flex-col items-center justify-center h-80 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-violet-100" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-violet-600 animate-spin" />
                  <Calculator className="absolute inset-0 m-auto h-6 w-6 text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Calcul en cours…</p>
                  <p className="text-sm text-gray-400 mt-1">Analyse des indicateurs E, S, G</p>
                </div>
              </div>
            </Card>
          ) : result ? (
            <div className="space-y-4">
              {/* Score card */}
              <Card className="!p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <h2 className="text-sm font-semibold text-gray-900">Résultat du calcul</h2>
                    </div>
                    {result.calculation_date && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(result.calculation_date + 'T00:00:00'), 'd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-6 py-5">
                  {/* Global score */}
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100">
                    <div className={`relative w-24 h-24 rounded-2xl ring-4 flex flex-col items-center justify-center ${gradeMeta.bg} ${gradeMeta.ring} flex-shrink-0`}>
                      <span className={`text-3xl font-black ${gradeMeta.color}`}>{gradeMeta.label}</span>
                      <span className="text-xs text-gray-400 mt-0.5">Rating</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className={`text-5xl font-extrabold ${scoreColor(result.overall_score)}`}>
                          {Math.round(result.overall_score)}
                        </span>
                        <span className="text-lg text-gray-400 font-medium">/100</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                        <div
                          className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000"
                          style={{ width: `${result.overall_score}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {result.data_points_count != null && (
                          <span>{result.data_points_count} points de données</span>
                        )}
                        {result.indicators_used != null && (
                          <span>· {result.indicators_used} indicateurs</span>
                        )}
                        {result.confidence_level && (
                          <span className={`capitalize font-medium ${
                            result.confidence_level === 'high' ? 'text-emerald-600' :
                            result.confidence_level === 'medium' ? 'text-amber-600' : 'text-red-500'
                          }`}>
                            · Fiabilité {result.confidence_level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pillar breakdown */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {pillars.map(p => {
                      const Icon = p.icon;
                      return (
                        <div key={p.label} className={`rounded-xl border ${p.border} ${p.bg} p-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <Icon className={`h-4 w-4 ${p.color}`} />
                            <span className={`text-xl font-bold ${p.color}`}>{Math.round(p.value)}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-600 mb-1">{p.label}</p>
                          <ScoreBar value={p.value} color={p.bar} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Best / worst */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Meilleur pilier</p>
                        <p className="text-sm font-semibold text-emerald-700 capitalize">{result.best_pillar}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl border border-red-100">
                      <TrendingDown className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">À améliorer</p>
                        <p className="text-sm font-semibold text-red-600 capitalize">{result.worst_pillar}</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate('/app/scores')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors text-sm"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Voir le tableau de bord complet
                  </button>
                </div>
              </Card>

              {/* Radar */}
              <Card className="!p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                  <h3 className="text-sm font-semibold text-gray-900">Répartition par pilier</h3>
                </div>
                <div className="px-4 pb-4">
                  <RadarChart data={radarData} dataKey="value" height={250} />
                </div>
              </Card>
            </div>
          ) : (
            /* Empty state */
            <Card className="h-full">
              <div className="flex flex-col items-center justify-center min-h-[360px] text-center px-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-5">
                  <Calculator className="h-10 w-10 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun résultat</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
                  Sélectionnez une organisation et une date, puis lancez le calcul pour obtenir votre score ESG.
                </p>
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                  {[
                    { icon: Leaf,  label: 'Environnement', color: 'bg-emerald-50 text-emerald-600' },
                    { icon: Users, label: 'Social',        color: 'bg-blue-50 text-blue-600'       },
                    { icon: Scale, label: 'Gouvernance',   color: 'bg-violet-50 text-violet-600'   },
                  ].map(p => {
                    const Icon = p.icon;
                    return (
                      <div key={p.label} className={`rounded-xl p-3 text-center ${p.color.split(' ')[0]}`}>
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${p.color.split(' ')[1]}`} />
                        <p className={`text-xs font-medium ${p.color.split(' ')[1]}`}>{p.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
