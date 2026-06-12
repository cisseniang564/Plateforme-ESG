/**
 * Scope3Calculator — Calculateur Scope 3 ADEME (méthode spend-based + activity-based).
 *
 * UX: l'utilisateur ajoute des lignes (facteur + quantité), voit en temps réel
 * la répartition par catégorie GHG Protocol et le total tCO₂e.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Flame, Plus, Trash2, Download, Sparkles, AlertCircle,
  TrendingUp, Database, Loader2, Search, BookOpen,
  Users, MapPin, Bike, Car, Train, Briefcase, CheckCircle2, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

// Locale-aware number formatting (read at call time)
const numLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface Factor {
  code: string;
  label: string;
  category_id: number;
  category_name: string;
  unit: string;
  factor: number;
  source: string;
  notes?: string | null;
}

interface FactorsResponse {
  spend_based: Factor[];
  activity_based: Factor[];
  source: string;
  total_factors: number;
}

interface Line {
  id: string;        // local id for React keys
  factor_code: string;
  quantity: number;
  label?: string;
}

interface CalcResult {
  total_kgco2e: number;
  total_tco2e: number;
  by_category: Array<{ category_id: number; category_name: string; kgco2e: number; tco2e: number; lines: number }>;
  details: Array<{
    factor_code: string;
    factor_label: string;
    factor_value: number;
    factor_unit: string;
    category_id: number;
    category_name: string;
    quantity: number;
    emissions_kgco2e: number;
    emissions_tco2e: number;
    user_label?: string | null;
  }>;
  warnings: string[];
  source: string;
}

const CATEGORY_COLORS: Record<number, string> = {
  1: '#10b981', 2: '#0ea5e9', 3: '#a78bfa', 4: '#f59e0b',
  5: '#ef4444', 6: '#ec4899', 7: '#14b8a6', 8: '#6366f1',
  9: '#84cc16', 10: '#fb923c', 11: '#06b6d4', 12: '#64748b',
  13: '#8b5cf6', 14: '#f43f5e', 15: '#22c55e',
};

let rowSeq = 0;
const newId = () => `row-${++rowSeq}-${Date.now()}`;

export default function Scope3Calculator() {
  const { t } = useTranslation();
  const [factors, setFactors]         = useState<FactorsResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lines, setLines]             = useState<Line[]>([
    { id: newId(), factor_code: 'services_informatiques', quantity: 0, label: '' },
  ]);
  const [result, setResult]           = useState<CalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showFactors, setShowFactors] = useState(false);
  const [search, setSearch]           = useState('');

  // Load factors
  useEffect(() => {
    api.get<FactorsResponse>('/scope3/factors')
      .then(res => setFactors(res.data))
      .catch(() => setFactors(null))
      .finally(() => setLoading(false));
  }, []);

  const allFactors = useMemo(() => {
    if (!factors) return [];
    return [...factors.spend_based, ...factors.activity_based];
  }, [factors]);

  const filteredFactors = useMemo(() => {
    if (!search.trim()) return allFactors;
    const q = search.toLowerCase();
    return allFactors.filter(f =>
      f.label.toLowerCase().includes(q) ||
      f.code.toLowerCase().includes(q) ||
      f.category_name.toLowerCase().includes(q),
    );
  }, [allFactors, search]);

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines(prev => [...prev, { id: newId(), factor_code: 'services_informatiques', quantity: 0, label: '' }]);

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.id !== id));

  const runCalculation = async () => {
    const valid = lines.filter(l => l.factor_code && l.quantity > 0);
    if (valid.length === 0) {
      toast.error(t('scope3.addLineWarn', 'Ajoutez au moins une ligne avec une quantité > 0.'));
      return;
    }
    setCalculating(true);
    try {
      const res = await api.post<CalcResult>('/scope3/calculate', {
        lines: valid.map(l => ({
          factor_code: l.factor_code,
          quantity: Number(l.quantity),
          label: l.label || undefined,
        })),
      });
      setResult(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : t('scope3.calcError', 'Erreur lors du calcul'));
    } finally {
      setCalculating(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const rows = [
      ['Catégorie ID', 'Catégorie', 'Facteur', 'Libellé', 'Quantité', 'Unité facteur', 'Facteur', 'kgCO2e', 'tCO2e'].join(';'),
      ...result.details.map(d => [
        d.category_id,
        d.category_name,
        d.factor_label,
        d.user_label || '',
        d.quantity,
        d.factor_unit,
        d.factor_value,
        d.emissions_kgco2e,
        d.emissions_tco2e,
      ].join(';')),
      '',
      ['', '', '', '', '', '', 'Total', result.total_kgco2e, result.total_tco2e].join(';'),
    ];
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scope3_bilan_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Commute Auto-Calculator — Scope 3 Cat. 7 from HR data */}
      <CommuteAutoCalculator />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border border-orange-100 rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
              {t('scope3.heroBadge', 'Bilan Carbone · GHG Protocol')}
            </span>
            <h1 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl">
                <Flame className="h-5 w-5" />
              </span>
              {t('scope3.heroTitle', 'Calculateur Scope 3')}
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl">
              {t('scope3.heroDescA', 'Évaluez les émissions des ')}<strong>{t('scope3.heroDescStrong', '15 catégories Scope 3')}</strong>{t('scope3.heroDescB', ' du GHG Protocol selon la méthodologie ADEME Base Empreinte 2024. Spend-based (€) ou activity-based (km, kWh, tonne).')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowFactors(v => !v)}
              className="inline-flex items-center gap-2 px-4 h-10 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              {showFactors ? t('scope3.hide', 'Masquer') : t('scope3.show', 'Voir')} {t('scope3.theFactors', 'les facteurs')}
            </button>
          </div>
        </div>
      </div>

      {/* Factors catalog */}
      {showFactors && factors && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Database className="h-4 w-4 text-gray-500" />
              {t('scope3.factorsCount', '{{count}} facteurs ADEME', { count: factors.total_factors })}
            </h2>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('scope3.searchPlaceholder', 'Rechercher…')}
                className="pl-10 pr-3 h-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredFactors.slice(0, 200).map(f => (
              <div key={f.code} className="border border-gray-100 rounded-lg p-3 text-xs hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-gray-900">{f.label}</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0"
                        style={{ background: (CATEGORY_COLORS[f.category_id] || '#999') + '20', color: CATEGORY_COLORS[f.category_id] || '#666' }}>
                    Cat. {f.category_id}
                  </span>
                </div>
                <p className="text-gray-500 mb-1 truncate">{f.category_name}</p>
                <p className="font-mono text-emerald-700 font-bold">{f.factor} {f.unit}</p>
                {f.notes && <p className="text-gray-400 italic mt-1">{f.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — input table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">{t('scope3.inputTitle', 'Saisie des dépenses / activités')}</h2>
            <span className="text-xs text-gray-400">{t('scope3.linesCount', '{{count}} ligne{{s}}', { count: lines.length, s: lines.length > 1 ? 's' : '' })}</span>
          </div>
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {lines.map(line => {
              const f = allFactors.find(x => x.code === line.factor_code);
              return (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-5">
                    <select
                      value={line.factor_code}
                      onChange={e => updateLine(line.id, { factor_code: e.target.value })}
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <optgroup label="💰 Spend-based (€)">
                        {factors?.spend_based.map(f => (
                          <option key={f.code} value={f.code}>Cat.{f.category_id} — {f.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📐 Activity-based (km, kWh, t)">
                        {factors?.activity_based.map(f => (
                          <option key={f.code} value={f.code}>Cat.{f.category_id} — {f.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="col-span-7 sm:col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.quantity || ''}
                      onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                      placeholder={t('scope3.qtyPlaceholder', 'Quantité')}
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right tabular-nums"
                    />
                    {f && <p className="text-[10px] text-gray-400 mt-1 text-right">{f.unit.replace('kgCO2e/', '')}</p>}
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <input
                      type="text"
                      value={line.label || ''}
                      onChange={e => updateLine(line.id, { label: e.target.value })}
                      placeholder={t('scope3.labelPlaceholder', 'Libellé (optionnel)')}
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="col-span-1 flex">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      title={t('scope3.removeLine', 'Supprimer la ligne')}
                      className="inline-flex items-center justify-center h-10 w-10 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 h-9 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('scope3.addLine', 'Ajouter une ligne')}
            </button>
            <button
              type="button"
              onClick={runCalculation}
              disabled={calculating}
              className="inline-flex items-center gap-2 px-5 h-10 text-sm font-bold text-white bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t('scope3.calcEmissions', 'Calculer les émissions')}
            </button>
          </div>
        </div>

        {/* RIGHT — results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-2">{t('scope3.totalEmissions', 'Émissions totales Scope 3')}</p>
                <p className="text-4xl font-black tabular-nums">{result.total_tco2e.toFixed(2)}</p>
                <p className="text-sm opacity-90 mt-1">tCO₂e</p>
                <p className="text-[10px] opacity-70 mt-3 border-t border-white/20 pt-2">
                  {result.source} · {t('scope3.linesCount', '{{count}} ligne{{s}}', { count: result.details.length, s: result.details.length > 1 ? 's' : '' })}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    {t('scope3.byCategory', 'Répartition par catégorie')}
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {result.by_category.map(c => {
                    const pct = result.total_kgco2e > 0 ? (c.kgco2e / result.total_kgco2e) * 100 : 0;
                    const color = CATEGORY_COLORS[c.category_id] || '#999';
                    return (
                      <div key={c.category_id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">Cat. {c.category_id} — {c.category_name}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color }}>{c.tco2e.toFixed(2)} t</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t('scope3.warnings', 'Avertissements')}
                  </p>
                  <ul className="text-[11px] text-amber-700 space-y-0.5 list-disc list-inside">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={exportCsv}
                className="w-full inline-flex items-center justify-center gap-2 px-4 h-10 text-sm font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <Flame className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">{t('scope3.noCalc', 'Aucun calcul lancé')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('scope3.noCalcHint', 'Ajoutez vos dépenses et cliquez sur Calculer.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Commute Auto-Calculator — Scope 3 Cat. 7 from HR data ──────────────────

interface ModeContribution {
  mode: string;
  label_fr: string;
  modal_share_pct: number;
  emission_factor_kgco2e_per_pkm: number;
  annual_pkm_per_employee: number;
  annual_kgco2e_per_employee: number;
  annual_kgco2e_total: number;
  pct_of_total: number;
}

interface CommuteResult {
  inputs: any;
  annual_pkm_per_employee: number;
  annual_kgco2e_per_employee: number;
  annual_kgco2e_total: number;
  annual_tco2e_total: number;
  by_mode: ModeContribution[];
  methodology: string;
}

// code stays literal (stored value); label + hint translated
const getGeographicProfiles = (t: TFunction) => [
  { code: 'national_avg', label: t('scope3.geoNationalLabel', 'Moyenne nationale'), hint: t('scope3.geoNationalHint', 'Référence INSEE pour France entière') },
  { code: 'dense_urban',  label: t('scope3.geoUrbanLabel', 'Urbain dense'),         hint: t('scope3.geoUrbanHint', 'Paris, Lyon centre, transports en commun forts') },
  { code: 'suburban',     label: t('scope3.geoSuburbanLabel', 'Périurbain'),        hint: t('scope3.geoSuburbanHint', 'Villes moyennes, mix voiture/transports') },
  { code: 'rural',        label: t('scope3.geoRuralLabel', 'Rural'),                hint: t('scope3.geoRuralHint', 'Petites villes, voiture dominante') },
];

function CommuteAutoCalculator() {
  const { t } = useTranslation();
  const GEOGRAPHIC_PROFILES = getGeographicProfiles(t);
  const [headcount, setHeadcount] = useState<number>(50);
  const [profile, setProfile]     = useState<string>('national_avg');
  const [distance, setDistance]   = useState<number>(14);
  const [teleworking, setTeleworking] = useState<number>(1);
  const [working_days, setWorkingDays] = useState<number>(215);
  const [result, setResult]       = useState<CommuteResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [pushing, setPushing]     = useState(false);

  const compute = async () => {
    setLoading(true);
    try {
      const res = await api.post<CommuteResult>('/commute-emissions/compute', {
        headcount,
        geographic_profile: profile,
        distance_km_one_way: distance,
        working_days,
        teleworking_days_per_week: teleworking,
      });
      setResult(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('scope3.computeError', 'Erreur de calcul'));
    } finally {
      setLoading(false);
    }
  };

  const pushToScope3 = async () => {
    setPushing(true);
    try {
      const res = await api.post('/commute-emissions/push-to-entry', {
        headcount,
        geographic_profile: profile,
        distance_km_one_way: distance,
        working_days,
        teleworking_days_per_week: teleworking,
      });
      toast.success(
        t('scope3.pushSuccess', '{{value}} tCO₂eq ajouté à vos données Scope 3', { value: res.data.value_numeric.toLocaleString(numLocale()) }),
        { duration: 5000 },
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('scope3.saveError', "Erreur lors de l'enregistrement"));
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 border border-indigo-100 rounded-2xl p-6 md:p-8">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
            {t('scope3.commuteBadge', 'Auto-calcul · Scope 3 Cat. 7')}
          </span>
          <h2 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl">
              <Users className="h-5 w-5" />
            </span>
            {t('scope3.commuteTitle', 'Émissions domicile-travail')}
          </h2>
          <p className="text-sm text-gray-600 max-w-2xl">
            {t('scope3.commuteDescA', 'Calcul automatique ')}<strong>activity-based</strong>{t('scope3.commuteDescB', ' selon GHG Protocol — utilise vos ETP, le split modal INSEE et les facteurs ADEME. Pas de saisie ligne par ligne.')}
          </p>
        </div>
      </div>

      {/* Inputs row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
            <Briefcase className="h-3 w-3 inline mr-1" /> {t('scope3.lblFte', 'ETP')}
          </label>
          <input
            type="number"
            value={headcount}
            onChange={e => setHeadcount(parseInt(e.target.value) || 0)}
            min={1}
            className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
            <MapPin className="h-3 w-3 inline mr-1" /> {t('scope3.lblGeoProfile', 'Profil géo')}
          </label>
          <select
            value={profile}
            onChange={e => setProfile(e.target.value)}
            className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {GEOGRAPHIC_PROFILES.map(p => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
            {t('scope3.lblDistance', 'Distance (km A/R)')}
          </label>
          <input
            type="number"
            value={distance}
            onChange={e => setDistance(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.5}
            className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
            {t('scope3.lblTelework', 'Télétravail (j/sem)')}
          </label>
          <input
            type="number"
            value={teleworking}
            onChange={e => setTeleworking(parseFloat(e.target.value) || 0)}
            min={0}
            max={5}
            step={0.5}
            className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
            {t('scope3.lblWorkdays', 'Jours travaillés/an')}
          </label>
          <input
            type="number"
            value={working_days}
            onChange={e => setWorkingDays(parseInt(e.target.value) || 0)}
            min={100}
            max={300}
            className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={compute}
          disabled={loading || headcount <= 0}
          className="inline-flex items-center gap-1.5 px-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t('scope3.calculate', 'Calculer')}
        </button>
        {result && (
          <button
            onClick={pushToScope3}
            disabled={pushing}
            className="inline-flex items-center gap-1.5 px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('scope3.pushToScope3', 'Pousser dans Scope 3')} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        <p className="text-[11px] text-gray-500 max-w-md">
          {t('scope3.defaultsHint', 'Défauts : 14 km A/R, 215 j/an (INSEE 2022, DARES 2023). Modifiez selon votre HR.')}
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {/* Total KPI */}
          <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">{t('scope3.annualTotal', 'Total annuel')}</p>
            <p className="text-3xl font-black text-gray-900">
              {result.annual_tco2e_total.toLocaleString(numLocale(), { maximumFractionDigits: 1 })}
              <span className="text-base font-bold text-indigo-600 ml-1">tCO₂eq</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ≈ {result.annual_kgco2e_per_employee.toLocaleString(numLocale(), { maximumFractionDigits: 0 })} kgCO₂eq / {t('scope3.lblFte', 'ETP')}
            </p>
          </div>
          {/* Distance */}
          <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">{t('scope3.annualDistance', 'Distance annuelle / ETP')}</p>
            <p className="text-3xl font-black text-gray-900">
              {result.annual_pkm_per_employee.toLocaleString(numLocale(), { maximumFractionDigits: 0 })}
              <span className="text-base font-bold text-indigo-600 ml-1">km</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('scope3.teamPkm', 'Soit {{value}} k pkm équipe', { value: (result.annual_pkm_per_employee * headcount / 1000).toLocaleString(numLocale(), { maximumFractionDigits: 0 }) })}
            </p>
          </div>
          {/* Top mode */}
          {result.by_mode[0] && (
            <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">{t('scope3.mainMode', 'Mode principal')}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{result.by_mode[0].label_fr}</p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>{result.by_mode[0].pct_of_total}%</strong> {t('scope3.ofEmissions', 'des émissions')} ·{' '}
                {(result.by_mode[0].annual_kgco2e_total / 1000).toLocaleString(numLocale(), { maximumFractionDigits: 1 })} t
              </p>
            </div>
          )}

          {/* Mode breakdown */}
          <div className="md:col-span-3 bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-3">{t('scope3.byMode', 'Répartition par mode')}</p>
            <div className="space-y-2">
              {result.by_mode.filter(m => m.modal_share_pct > 0).map(mode => (
                <div key={mode.mode} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{mode.label_fr}</p>
                    <p className="text-[10px] text-gray-400">{mode.modal_share_pct}{t('scope3.ofTrips', '% des trajets')}</p>
                  </div>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                      style={{ width: `${Math.max(mode.pct_of_total, 1)}%` }}
                    />
                  </div>
                  <div className="w-28 text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-900">
                      {(mode.annual_kgco2e_total / 1000).toLocaleString(numLocale(), { maximumFractionDigits: 2 })} t
                    </p>
                    <p className="text-[10px] text-gray-400">{mode.pct_of_total}%</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 italic">{result.methodology}</p>
          </div>
        </div>
      )}
    </div>
  );
}
