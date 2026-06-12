import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Droplets, Leaf, RefreshCw, Save } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ── Indicator definitions ─────────────────────────────────────────────────────

interface Indicator {
  code: string;
  label: string;
  unit: string;
  type: 'number' | 'select';
  options?: string[];
  esrs: string;
  desc: string;
}

const getE3Indicators = (t: TFunction): Indicator[] => [
  { code: 'E3-1a', label: t('compliance.esrsEnv.ind.E3-1a.label', "Consommation d'eau totale"), unit: 'm³', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsEnv.ind.E3-1a.desc', "Volume total d'eau prélevé de toutes sources") },
  { code: 'E3-1b', label: t('compliance.esrsEnv.ind.E3-1b.label', "Eau recyclée/réutilisée"), unit: 'm³', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsEnv.ind.E3-1b.desc', "Volume d'eau recyclée ou réutilisée dans les processus") },
  { code: 'E3-1c', label: t('compliance.esrsEnv.ind.E3-1c.label', "Intensité eau (m³/M€ CA)"), unit: 'm³/M€', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsEnv.ind.E3-1c.desc', "Consommation eau rapportée au chiffre d'affaires") },
  { code: 'E3-2a', label: t('compliance.esrsEnv.ind.E3-2a.label', 'Sites en zones de stress hydrique'), unit: 'nb', type: 'number', esrs: 'E3-2', desc: t('compliance.esrsEnv.ind.E3-2a.desc', 'Nombre de sites opérant dans des zones à stress hydrique élevé (WRI Aqueduct)') },
  { code: 'E3-2b', label: t('compliance.esrsEnv.ind.E3-2b.label', "Part de l'eau consommée en zones stressées"), unit: '%', type: 'number', esrs: 'E3-2', desc: t('compliance.esrsEnv.ind.E3-2b.desc', 'Pourcentage de la consommation totale en zones à stress hydrique') },
  { code: 'E3-3a', label: t('compliance.esrsEnv.ind.E3-3a.label', "Rejets d'eau (total)"), unit: 'm³', type: 'number', esrs: 'E3-3', desc: t('compliance.esrsEnv.ind.E3-3a.desc', "Volume total d'eaux usées rejetées (incluant traitement)") },
  { code: 'E3-3b', label: t('compliance.esrsEnv.ind.E3-3b.label', 'Polluants dans les rejets'), unit: 'kg/an', type: 'number', esrs: 'E3-3', desc: t('compliance.esrsEnv.ind.E3-3b.desc', 'Masse de polluants dans les eaux rejetées (azote, phosphore, métaux lourds)') },
  { code: 'E3-policy', label: t('compliance.esrsEnv.ind.E3-policy.label', "Politique de gestion de l'eau formalisée"), unit: '', type: 'select', options: ['Oui', 'Non', 'En cours'], esrs: 'E3', desc: t('compliance.esrsEnv.ind.E3-policy.desc', "L'entreprise dispose-t-elle d'une politique eau formelle ?") },
  { code: 'E3-target', label: t('compliance.esrsEnv.ind.E3-target.label', 'Objectif de réduction de consommation eau'), unit: '%', type: 'number', esrs: 'E3', desc: t('compliance.esrsEnv.ind.E3-target.desc', "Objectif de réduction en % d'ici 2030 vs. année de référence") },
];

const getE4Indicators = (t: TFunction): Indicator[] => [
  { code: 'E4-1a', label: t('compliance.esrsEnv.ind.E4-1a.label', 'Sites en zones sensibles biodiversité'), unit: 'nb', type: 'number', esrs: 'E4-1', desc: t('compliance.esrsEnv.ind.E4-1a.desc', "Nombre de sites opérant dans ou près de zones protégées (Natura 2000, KBA, UICN)") },
  { code: 'E4-1b', label: t('compliance.esrsEnv.ind.E4-1b.label', 'Surface totale des sites opérationnels'), unit: 'ha', type: 'number', esrs: 'E4-1', desc: t('compliance.esrsEnv.ind.E4-1b.desc', "Surface totale de terrain utilisé par l'entreprise (propriété + location)") },
  { code: 'E4-2a', label: t('compliance.esrsEnv.ind.E4-2a.label', "Évaluation d'impact sur la biodiversité réalisée"), unit: '', type: 'select', options: ['Oui — tous sites', 'Oui — sites critiques uniquement', 'Non', 'En cours'], esrs: 'E4-2', desc: t('compliance.esrsEnv.ind.E4-2a.desc', "L'entreprise a-t-elle réalisé une évaluation d'impact biodiversité ?") },
  { code: 'E4-3a', label: t('compliance.esrsEnv.ind.E4-3a.label', 'Surface restaurée ou protégée'), unit: 'ha', type: 'number', esrs: 'E4-3', desc: t('compliance.esrsEnv.ind.E4-3a.desc', "Superficie d'habitats naturels restaurés, réhabilités ou protégés") },
  { code: 'E4-3b', label: t('compliance.esrsEnv.ind.E4-3b.label', 'Espèces menacées présentes sur les sites'), unit: 'nb', type: 'number', esrs: 'E4-3', desc: t('compliance.esrsEnv.ind.E4-3b.desc', "Nombre d'espèces classées menacées (Liste rouge UICN) présentes sur ou près des sites") },
  { code: 'E4-policy', label: t('compliance.esrsEnv.ind.E4-policy.label', 'Politique biodiversité formalisée'), unit: '', type: 'select', options: ['Oui', 'Non', 'En cours'], esrs: 'E4', desc: t('compliance.esrsEnv.ind.E4-policy.desc', "L'entreprise dispose-t-elle d'une politique biodiversité formelle ?") },
  { code: 'E4-tnfd', label: t('compliance.esrsEnv.ind.E4-tnfd.label', 'Alignement TNFD'), unit: '', type: 'select', options: ['Oui', 'Non', 'Étude en cours'], esrs: 'E4', desc: t('compliance.esrsEnv.ind.E4-tnfd.desc', "L'entreprise suit-elle le cadre TNFD (Taskforce on Nature-related Financial Disclosures) ?") },
];

const getE5Indicators = (t: TFunction): Indicator[] => [
  { code: 'E5-1a', label: t('compliance.esrsEnv.ind.E5-1a.label', 'Consommation matières premières totale'), unit: 'tonnes', type: 'number', esrs: 'E5-1', desc: t('compliance.esrsEnv.ind.E5-1a.desc', 'Masse totale de matières premières consommées (vierges + recyclées)') },
  { code: 'E5-1b', label: t('compliance.esrsEnv.ind.E5-1b.label', 'Part de matières recyclées/biosourcées'), unit: '%', type: 'number', esrs: 'E5-1', desc: t('compliance.esrsEnv.ind.E5-1b.desc', 'Pourcentage de matières premières recyclées, récupérées ou biosourcées') },
  { code: 'E5-2a', label: t('compliance.esrsEnv.ind.E5-2a.label', 'Déchets dangereux générés'), unit: 'tonnes', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsEnv.ind.E5-2a.desc', "Masse totale de déchets dangereux produits sur l'exercice") },
  { code: 'E5-2b', label: t('compliance.esrsEnv.ind.E5-2b.label', 'Déchets non dangereux générés'), unit: 'tonnes', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsEnv.ind.E5-2b.desc', 'Masse totale de déchets non dangereux produits') },
  { code: 'E5-2c', label: t('compliance.esrsEnv.ind.E5-2c.label', 'Taux de valorisation/recyclage des déchets'), unit: '%', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsEnv.ind.E5-2c.desc', 'Part des déchets valorisés (recyclés, compostés, énergie) vs. mis en décharge') },
  { code: 'E5-3a', label: t('compliance.esrsEnv.ind.E5-3a.label', 'Produits vendus réparables/recyclables'), unit: '%', type: 'number', esrs: 'E5-3', desc: t('compliance.esrsEnv.ind.E5-3a.desc', 'Pourcentage des produits vendus conçus pour être réparés ou recyclés') },
  { code: 'E5-3b', label: t('compliance.esrsEnv.ind.E5-3b.label', 'Programmes de reprise/réemploi'), unit: '', type: 'select', options: ['Oui', 'Non', 'En cours'], esrs: 'E5-3', desc: t('compliance.esrsEnv.ind.E5-3b.desc', "L'entreprise a-t-elle des programmes de reprise des produits en fin de vie ?") },
  { code: 'E5-4a', label: t('compliance.esrsEnv.ind.E5-4a.label', "Consommation d'eau intégrée dans l'économie circulaire"), unit: '%', type: 'number', esrs: 'E5-4', desc: t('compliance.esrsEnv.ind.E5-4a.desc', "Part de l'eau réutilisée dans les boucles de production") },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'E3' | 'E4' | 'E5';
type FormValues = Record<string, string>;

interface ExistingEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPeriod(year: number) {
  return {
    period_start: `${year}-01-01`,
    period_end: `${year}-12-31`,
    period_type: 'annual',
    data_source: 'manual',
    collection_method: 'manual',
  };
}

type TabConfig = { label: string; icon: React.ElementType; category: string; indicators: Indicator[]; color: string };

const getTabConfig = (t: TFunction): Record<TabKey, TabConfig> => ({
  E3: { label: t('compliance.esrsEnv.tab.e3', 'E3 — Eau'), icon: Droplets, category: 'ESRS_E3', indicators: getE3Indicators(t), color: 'text-blue-400' },
  E4: { label: t('compliance.esrsEnv.tab.e4', 'E4 — Biodiversité'), icon: Leaf, category: 'ESRS_E4', indicators: getE4Indicators(t), color: 'text-emerald-400' },
  E5: { label: t('compliance.esrsEnv.tab.e5', 'E5 — Économie circulaire'), icon: RefreshCw, category: 'ESRS_E5', indicators: getE5Indicators(t), color: 'text-teal-400' },
});

// ── Indicator row ─────────────────────────────────────────────────────────────

function IndicatorRow({
  indicator,
  value,
  onChange,
}: {
  indicator: Indicator;
  value: string;
  onChange: (code: string, val: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-12 gap-3 items-start py-3 border-b border-white/[0.05] last:border-0">
      <div className="col-span-5">
        <p className="text-[13px] font-medium text-slate-200 leading-snug">{indicator.label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{indicator.desc}</p>
      </div>
      <div className="col-span-2 flex items-center">
        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 ring-1 ring-white/10">
          {indicator.esrs}
        </span>
      </div>
      <div className="col-span-3">
        {indicator.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(indicator.code, e.target.value)}
            className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] text-[13px] text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-colors"
          >
            <option value="">{t('compliance.esrsEnv.select', '— Sélectionner —')}</option>
            {indicator.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(indicator.code, e.target.value)}
            placeholder="—"
            className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] text-[13px] text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-colors placeholder-slate-600"
          />
        )}
      </div>
      <div className="col-span-2 flex items-center">
        <span className="text-[12px] text-slate-500">{indicator.unit || '—'}</span>
      </div>
    </div>
  );
}

// ── Tab panel ─────────────────────────────────────────────────────────────────

function TabPanel({
  tabKey,
  year,
}: {
  tabKey: TabKey;
  year: number;
}) {
  const { t } = useTranslation();
  const config = getTabConfig(t)[tabKey];
  const [values, setValues] = useState<FormValues>({});
  const [existingEntries, setExistingEntries] = useState<ExistingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/data-entry/', {
        params: { category: config.category, year, limit: 200 },
      });
      const entries: ExistingEntry[] = res.data?.items ?? res.data ?? [];
      setExistingEntries(entries);
      const initial: FormValues = {};
      for (const entry of entries) {
        initial[entry.metric_name] = entry.value_text ?? (entry.value_numeric != null ? String(entry.value_numeric) : '');
      }
      setValues(initial);
    } catch {
      // Pre-fill empty
    } finally {
      setLoading(false);
    }
  }, [config.category, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (code: string, val: string) => {
    setValues((prev) => ({ ...prev, [code]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    const period = buildPeriod(year);
    const toSave = config.indicators.filter((ind) => values[ind.code] !== undefined && values[ind.code] !== '');

    if (toSave.length === 0) {
      toast(t('compliance.esrsEnv.toast.nothingToSave', 'Aucune valeur à enregistrer.'), { icon: 'ℹ️' });
      setSaving(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    await Promise.allSettled(
      toSave.map(async (ind) => {
        const existing = existingEntries.find((e) => e.metric_name === ind.code);
        const isSelect = ind.type === 'select';
        const payload = {
          pillar: 'environmental',
          category: config.category,
          metric_name: ind.code,
          unit: ind.unit || null,
          ...period,
          ...(isSelect
            ? { value_text: values[ind.code], value_numeric: null }
            : { value_numeric: parseFloat(values[ind.code]) || null, value_text: null }),
        };
        try {
          if (existing) {
            await api.put(`/data-entry/${existing.id}`, payload);
          } else {
            await api.post('/data-entry/', payload);
          }
          successCount++;
        } catch {
          errorCount++;
        }
      })
    );

    if (errorCount === 0) {
      toast.success(t('compliance.esrsEnv.toast.savedCount', '{{count}} indicateur(s) enregistré(s) avec succès.', { count: successCount }));
      await loadData();
    } else if (successCount > 0) {
      toast(t('compliance.esrsEnv.toast.partialSave', '{{success}} enregistré(s), {{errors}} erreur(s).', { success: successCount, errors: errorCount }), { icon: '⚠️' });
    } else {
      toast.error(t('compliance.esrsEnv.toast.saveError', "Erreur lors de l'enregistrement."));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-12 gap-3 px-4 pt-2 pb-1">
        <div className="col-span-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{t('compliance.esrsEnv.col.indicator', 'Indicateur')}</div>
        <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{t('compliance.esrsEnv.col.esrsRef', 'Réf. ESRS')}</div>
        <div className="col-span-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{t('compliance.esrsEnv.col.value', 'Valeur')}</div>
        <div className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{t('compliance.esrsEnv.col.unit', 'Unité')}</div>
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4">
        {config.indicators.map((ind) => (
          <IndicatorRow
            key={ind.code}
            indicator={ind}
            value={values[ind.code] ?? ''}
            onChange={handleChange}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 shadow-lg shadow-emerald-900/30"
        >
          <Save size={14} />
          {saving ? t('compliance.esrsEnv.saving', 'Enregistrement…') : t('compliance.esrsEnv.save', 'Enregistrer')}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ESRSEnvironmental() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('E3');
  const [year, setYear] = useState(new Date().getFullYear());

  const TAB_CONFIG = getTabConfig(t);
  const tabs = Object.entries(TAB_CONFIG) as [TabKey, TabConfig][];

  return (
    <div className="min-h-screen bg-[#0a0c12] text-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight">{t('compliance.esrsEnv.title', 'ESRS E3 / E4 / E5')}</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          {t('compliance.esrsEnv.subtitle', 'Saisie guidée des indicateurs environnementaux — Eau, Biodiversité, Économie circulaire')}
        </p>
      </div>

      {/* Year selector + tabs */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-slate-500 font-medium">{t('compliance.esrsEnv.yearLabel', 'Année')}</label>
          <input
            type="number"
            value={year}
            min={2020}
            max={2030}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[13px] text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
          {tabs.map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={14} className={isActive ? cfg.color : 'text-slate-600'} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      <TabPanel key={`${activeTab}-${year}`} tabKey={activeTab} year={year} />
    </div>
  );
}
