import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Droplets, Trash2, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Indicator {
  code: string;
  label: string;
  unit: string;
  type: 'number' | 'select';
  options?: string[];
  esrs: string;
  desc: string;
}

type FormValues = Record<string, string>;

interface ExistingEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
}

// ── E3 — Water ───────────────────────────────────────────────────────────────

const getE3Indicators = (t: TFunction): Indicator[] => [
  { code: 'E3-1a', label: t('compliance.esrsWaterWaste.ind.E3-1a.label', 'Volume total prélevé'), unit: 'm³/an', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsWaterWaste.ind.E3-1a.desc', "Volume total d'eau prélevé toutes sources confondues sur l'exercice") },
  { code: 'E3-1b', label: t('compliance.esrsWaterWaste.ind.E3-1b.label', 'dont eau de surface'), unit: 'm³/an', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsWaterWaste.ind.E3-1b.desc', "Volume prélevé dans les rivières, lacs, réservoirs naturels ou artificiels") },
  { code: 'E3-1c', label: t('compliance.esrsWaterWaste.ind.E3-1c.label', 'dont eau souterraine'), unit: 'm³/an', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsWaterWaste.ind.E3-1c.desc', "Volume prélevé dans les nappes phréatiques ou aquifères") },
  { code: 'E3-1d', label: t('compliance.esrsWaterWaste.ind.E3-1d.label', 'dont eau municipale / réseau'), unit: 'm³/an', type: 'number', esrs: 'E3-1', desc: t('compliance.esrsWaterWaste.ind.E3-1d.desc', "Volume fourni par le réseau d'eau potable ou les services d'eau municipaux") },
  { code: 'E3-2a', label: t('compliance.esrsWaterWaste.ind.E3-2a.label', 'Eau recyclée / réutilisée'), unit: 'm³/an', type: 'number', esrs: 'E3-2', desc: t('compliance.esrsWaterWaste.ind.E3-2a.desc', "Volume d'eau recyclé ou réutilisé en interne, sans repompage externe") },
  { code: 'E3-2b', label: t('compliance.esrsWaterWaste.ind.E3-2b.label', 'Taux de recyclage eau'), unit: '%', type: 'number', esrs: 'E3-2', desc: t('compliance.esrsWaterWaste.ind.E3-2b.desc', "Part de l'eau recyclée/réutilisée sur le total prélevé") },
  { code: 'E3-3a', label: t('compliance.esrsWaterWaste.ind.E3-3a.label', "Consommation nette d'eau"), unit: 'm³/an', type: 'number', esrs: 'E3-3', desc: t('compliance.esrsWaterWaste.ind.E3-3a.desc', "Prélèvement total moins les rejets retournant au même milieu (consommation nette ESRS E3-1)") },
  { code: 'E3-3b', label: t('compliance.esrsWaterWaste.ind.E3-3b.label', 'Intensité eau'), unit: 'm³/M€ CA', type: 'number', esrs: 'E3-3', desc: t('compliance.esrsWaterWaste.ind.E3-3b.desc', "Rapport entre la consommation nette d'eau et le chiffre d'affaires en M€") },
  { code: 'E3-4a', label: t('compliance.esrsWaterWaste.ind.E3-4a.label', "Volume d'eau rejetée"), unit: 'm³/an', type: 'number', esrs: 'E3-4', desc: t('compliance.esrsWaterWaste.ind.E3-4a.desc', "Volume total d'eau rejetée dans le milieu naturel (hors réseau municipal)") },
  { code: 'E3-4b', label: t('compliance.esrsWaterWaste.ind.E3-4b.label', 'Part en zone de stress hydrique élevé'), unit: '%', type: 'number', esrs: 'E3-4', desc: t('compliance.esrsWaterWaste.ind.E3-4b.desc', "Pourcentage des prélèvements et consommations localisés dans des zones à stress hydrique élevé (WRI Aqueduct score ≥ 3/5)") },
  { code: 'E3-5a', label: t('compliance.esrsWaterWaste.ind.E3-5a.label', "Politique de gestion de l'eau formalisée"), unit: '', type: 'select', options: ["Oui — certifiée ISO 14046", "Oui — interne non certifiée", "En cours d'élaboration", "Non"], esrs: 'E3-5', desc: t('compliance.esrsWaterWaste.ind.E3-5a.desc', "L'organisation dispose-t-elle d'une politique ou d'un système de management de l'eau formalisé ?") },
  { code: 'E3-5b', label: t('compliance.esrsWaterWaste.ind.E3-5b.label', 'Objectif de réduction eau défini'), unit: '', type: 'select', options: ["Oui — aligné SBTfN", "Oui — objectif interne", "En cours", "Non"], esrs: 'E3-5', desc: t('compliance.esrsWaterWaste.ind.E3-5b.desc', "L'organisation a-t-elle défini un objectif chiffré de réduction de ses prélèvements ou de sa consommation d'eau ?") },
];

const getE3SectionTitles = (t: TFunction): Record<string, string> => ({
  'E3-1': t('compliance.esrsWaterWaste.section.E3-1', "Prélèvements d'eau par source"),
  'E3-2': t('compliance.esrsWaterWaste.section.E3-2', 'Recyclage et efficacité hydrique'),
  'E3-3': t('compliance.esrsWaterWaste.section.E3-3', 'Consommation nette et intensité'),
  'E3-4': t('compliance.esrsWaterWaste.section.E3-4', 'Rejets et stress hydrique'),
  'E3-5': t('compliance.esrsWaterWaste.section.E3-5', 'Politique et objectifs eau'),
});

// ── E5 — Waste ───────────────────────────────────────────────────────────────

const getE5Indicators = (t: TFunction): Indicator[] => [
  { code: 'E5-1a', label: t('compliance.esrsWaterWaste.ind.E5-1a.label', 'Déchets non dangereux générés'), unit: 't/an', type: 'number', esrs: 'E5-1', desc: t('compliance.esrsWaterWaste.ind.E5-1a.desc', "Masse totale de déchets non dangereux produits sur l'exercice (GRI 306-3)") },
  { code: 'E5-1b', label: t('compliance.esrsWaterWaste.ind.E5-1b.label', 'Déchets dangereux générés'), unit: 't/an', type: 'number', esrs: 'E5-1', desc: t('compliance.esrsWaterWaste.ind.E5-1b.desc', "Masse totale de déchets classifiés dangereux selon la réglementation applicable") },
  { code: 'E5-1c', label: t('compliance.esrsWaterWaste.ind.E5-1c.label', 'Déchets radioactifs'), unit: 't/an', type: 'number', esrs: 'E5-1', desc: t('compliance.esrsWaterWaste.ind.E5-1c.desc', "Masse de déchets radioactifs générés (secteurs nucléaire, médical, industriel)") },
  { code: 'E5-2a', label: t('compliance.esrsWaterWaste.ind.E5-2a.label', 'Déchets recyclés'), unit: 't/an', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsWaterWaste.ind.E5-2a.desc', "Masse de déchets orientés vers le recyclage matière (hors valorisation énergétique)") },
  { code: 'E5-2b', label: t('compliance.esrsWaterWaste.ind.E5-2b.label', 'Valorisation énergétique'), unit: 't/an', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsWaterWaste.ind.E5-2b.desc', "Masse de déchets valorisés par incinération avec récupération d'énergie") },
  { code: 'E5-2c', label: t('compliance.esrsWaterWaste.ind.E5-2c.label', 'Réutilisation / reconditionnement'), unit: 't/an', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsWaterWaste.ind.E5-2c.desc', "Masse de déchets ou produits réintroduits directement dans un cycle d'utilisation") },
  { code: 'E5-2d', label: t('compliance.esrsWaterWaste.ind.E5-2d.label', 'Déchets éliminés (enfouissement)'), unit: 't/an', type: 'number', esrs: 'E5-2', desc: t('compliance.esrsWaterWaste.ind.E5-2d.desc', "Masse de déchets envoyés en décharge ou en traitement thermique sans récupération d'énergie") },
  { code: 'E5-3a', label: t('compliance.esrsWaterWaste.ind.E5-3a.label', 'Taux de valorisation total'), unit: '%', type: 'number', esrs: 'E5-3', desc: t('compliance.esrsWaterWaste.ind.E5-3a.desc', "(Recyclés + valorisation énergie + réutilisés) / Total généré × 100") },
  { code: 'E5-3b', label: t('compliance.esrsWaterWaste.ind.E5-3b.label', 'Déchets plastiques générés'), unit: 't/an', type: 'number', esrs: 'E5-3', desc: t('compliance.esrsWaterWaste.ind.E5-3b.desc', "Masse totale de déchets plastiques produits (dont emballages, équipements, films)") },
  { code: 'E5-4a', label: t('compliance.esrsWaterWaste.ind.E5-4a.label', 'Part de matières recyclées en entrée'), unit: '%', type: 'number', esrs: 'E5-4', desc: t('compliance.esrsWaterWaste.ind.E5-4a.desc', "Taux de contenu recyclé dans les matières premières ou composants achetés (économie circulaire)") },
  { code: 'E5-5a', label: t('compliance.esrsWaterWaste.ind.E5-5a.label', 'Objectif réduction déchets défini'), unit: '', type: 'select', options: ["Oui — avec jalons annuels", "Oui — objectif global", "En cours", "Non"], esrs: 'E5-5', desc: t('compliance.esrsWaterWaste.ind.E5-5a.desc', "L'organisation a-t-elle un objectif chiffré de réduction à la source de ses déchets ?") },
  { code: 'E5-5b', label: t('compliance.esrsWaterWaste.ind.E5-5b.label', 'Certifié ISO 14001 gestion déchets'), unit: '', type: 'select', options: ["Oui — périmètre total", "Oui — partiel", "Non", "En cours"], esrs: 'E5-5', desc: t('compliance.esrsWaterWaste.ind.E5-5b.desc', "Le système de management environnemental de l'organisation couvre-t-il la gestion des déchets (ISO 14001) ?") },
];

const getE5SectionTitles = (t: TFunction): Record<string, string> => ({
  'E5-1': t('compliance.esrsWaterWaste.section.E5-1', 'Génération de déchets par type'),
  'E5-2': t('compliance.esrsWaterWaste.section.E5-2', 'Modes de valorisation'),
  'E5-3': t('compliance.esrsWaterWaste.section.E5-3', 'Performance globale et plastiques'),
  'E5-4': t('compliance.esrsWaterWaste.section.E5-4', 'Économie circulaire (intrants)'),
  'E5-5': t('compliance.esrsWaterWaste.section.E5-5', 'Gouvernance et objectifs déchets'),
});

// ── Theme config ─────────────────────────────────────────────────────────────

const THEMES = {
  E3: {
    accent: '#0d9488',
    heroBg: 'linear-gradient(135deg,#042f2e 0%,#0d4f4a 40%,#0d9488 80%,#2dd4bf 100%)',
    badgeBg: 'rgba(13,148,136,0.18)',
    badgeText: '#5eead4',
    badgeBorder: 'rgba(13,148,136,0.35)',
    ring: 'focus:ring-teal-500',
    patternId: 'dots-e3',
    category: 'ESRS_E3',
    pillar: 'environment',
    badge: 'ESRS E3 — Eau et ressources marines',
  },
  E5: {
    accent: '#d97706',
    heroBg: 'linear-gradient(135deg,#1c0a00 0%,#451a03 40%,#92400e 80%,#d97706 100%)',
    badgeBg: 'rgba(217,119,6,0.18)',
    badgeText: '#fcd34d',
    badgeBorder: 'rgba(217,119,6,0.35)',
    ring: 'focus:ring-amber-500',
    patternId: 'dots-e5',
    category: 'ESRS_E5',
    pillar: 'environment',
    badge: 'ESRS E5 — Économie circulaire',
  },
} as const;

type TabKey = 'E3' | 'E5';

// ── Component ────────────────────────────────────────────────────────────────

export default function ESRSWaterWaste() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('E3');

  const E3_INDICATORS = getE3Indicators(t);
  const E5_INDICATORS = getE5Indicators(t);
  const E3_SECTION_TITLES = getE3SectionTitles(t);
  const E5_SECTION_TITLES = getE5SectionTitles(t);

  const [valuesE3, setValuesE3] = useState<FormValues>({});
  const [valuesE5, setValuesE5] = useState<FormValues>({});
  const [idsE3, setIdsE3] = useState<Record<string, string>>({});
  const [idsE5, setIdsE5] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load both tabs in parallel on mount ──────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resE3, resE5] = await Promise.all([
        api.get('/data-entry/', { params: { category: 'ESRS_E3', limit: 200 } }),
        api.get('/data-entry/', { params: { category: 'ESRS_E5', limit: 200 } }),
      ]);

      const parse = (res: { data: unknown }) => {
        const raw = res.data as { items?: ExistingEntry[] } | ExistingEntry[];
        const entries: ExistingEntry[] = (raw as { items?: ExistingEntry[] }).items ?? (raw as ExistingEntry[]) ?? [];
        const vals: FormValues = {};
        const ids: Record<string, string> = {};
        entries.forEach(e => {
          vals[e.metric_name] = e.value_text ?? (e.value_numeric != null ? String(e.value_numeric) : '');
          ids[e.metric_name] = e.id;
        });
        return { vals, ids };
      };

      const e3 = parse(resE3);
      const e5 = parse(resE5);
      setValuesE3(e3.vals); setIdsE3(e3.ids);
      setValuesE5(e5.vals); setIdsE5(e5.ids);
    } catch {
      toast.error(t('compliance.esrsWaterWaste.toast.loadError', 'Impossible de charger les données'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // ── Save active tab ───────────────────────────────────────────────────────

  const handleSave = async () => {
    const theme = THEMES[activeTab];
    const currentValues = activeTab === 'E3' ? valuesE3 : valuesE5;
    const currentIds = activeTab === 'E3' ? idsE3 : idsE5;
    const setIds = activeTab === 'E3' ? setIdsE3 : setIdsE5;
    const indicators = activeTab === 'E3' ? E3_INDICATORS : E5_INDICATORS;

    setSaving(true);
    try {
      await Promise.all(indicators.map(async ind => {
        const raw = currentValues[ind.code];
        if (raw === undefined || raw === '') return;
        const year = new Date().getFullYear();
        const isSelect = ind.type === 'select';
        const value_text = isSelect ? raw : raw;
        const value_numeric = isSelect ? null : (parseFloat(raw) || null);
        const payload = {
          metric_name: ind.code,
          pillar: theme.pillar,
          category: theme.category,
          period_start: `${year}-01-01`,
          period_end: `${year}-12-31`,
          period_type: 'annual',
          value_text,
          value_numeric,
          unit: ind.unit,
          data_source: 'manual',
          collection_method: 'manual',
          notes: ind.label,
        };
        if (currentIds[ind.code]) {
          await api.put(`/data-entry/${currentIds[ind.code]}`, {
            value_numeric,
            value_text,
            unit: ind.unit,
            notes: ind.label,
          });
        } else {
          const res = await api.post('/data-entry/', payload);
          setIds(prev => ({ ...prev, [ind.code]: res.data.id }));
        }
      }));
      const datasetLabel = activeTab === 'E3'
        ? t('compliance.esrsWaterWaste.dataset.e3', 'E3 (Eau)')
        : t('compliance.esrsWaterWaste.dataset.e5', 'E5 (Déchets)');
      toast.success(t('compliance.esrsWaterWaste.toast.saved', 'Données {{dataset}} sauvegardées', { dataset: datasetLabel }));
    } catch {
      toast.error(t('compliance.esrsWaterWaste.toast.saveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  // ── Derived state for active tab ──────────────────────────────────────────

  const theme = THEMES[activeTab];
  const indicators = activeTab === 'E3' ? E3_INDICATORS : E5_INDICATORS;
  const sectionTitles = activeTab === 'E3' ? E3_SECTION_TITLES : E5_SECTION_TITLES;
  const values = activeTab === 'E3' ? valuesE3 : valuesE5;
  const setValues = activeTab === 'E3' ? setValuesE3 : setValuesE5;

  const grouped = useMemo(() => {
    const g: Record<string, Indicator[]> = {};
    indicators.forEach(ind => {
      if (!g[ind.esrs]) g[ind.esrs] = [];
      g[ind.esrs].push(ind);
    });
    return g;
  }, [indicators]);

  const filledCount = indicators.filter(ind => values[ind.code] !== undefined && values[ind.code] !== '').length;
  const totalCount = indicators.length;
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  // Tab fill counts (for tab pills)
  const filledE3 = E3_INDICATORS.filter(i => valuesE3[i.code] !== undefined && valuesE3[i.code] !== '').length;
  const filledE5 = E5_INDICATORS.filter(i => valuesE5[i.code] !== undefined && valuesE5[i.code] !== '').length;

  // SVG completion ring
  const RING_R = 22;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringDash = (pct / 100) * RING_CIRC;

  return (
    <div
      className="rounded-2xl p-6 max-w-6xl mx-auto space-y-5 shadow-xl"
      style={{
        // Dark backdrop so the white/translucent-overlay design intent renders
        // legibly inside the app's light <main> shell.
        background: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg,#042f2e 0%,#0d4f4a 30%,#1c0a00 65%,#451a03 85%,#92400e 100%)' }} />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="dots-ew" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots-ew)" />
          </svg>
        </div>
        <div className="relative px-8 py-6 flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="h-4 w-4 text-teal-400/70" />
              <Trash2 className="h-4 w-4 text-amber-400/70" />
              <span className="text-xs font-bold text-white/60 tracking-widest uppercase">{t('compliance.esrsWaterWaste.eyebrow', 'ESRS Environnement')}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{t('compliance.esrsWaterWaste.title', 'Eau & Ressources · ESRS E3 / E5')}</h1>
            <p className="text-sm text-white/60 mt-0.5">{t('compliance.esrsWaterWaste.subtitle', "Suivi des prélèvements d'eau, consommation, déchets et économie circulaire")}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: 'rgba(13,148,136,0.22)', color: '#5eead4', borderColor: 'rgba(13,148,136,0.4)' }}>
                {t('compliance.esrsWaterWaste.badgeE3', 'ESRS E3 — Eau et ressources marines')}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: 'rgba(217,119,6,0.22)', color: '#fcd34d', borderColor: 'rgba(217,119,6,0.4)' }}>
                {t('compliance.esrsWaterWaste.badgeE5', 'ESRS E5 — Économie circulaire')}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 w-48 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: theme.accent }}
                />
              </div>
              <span className="text-xs text-white/50">{t('compliance.esrsWaterWaste.filledCount', '{{filled}} / {{total}} indicateurs renseignés', { filled: filledCount, total: totalCount })}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Completion ring */}
            <div className="relative w-14 h-14">
              <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                <circle cx="28" cy="28" r={RING_R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r={RING_R} fill="none"
                  stroke={theme.accent} strokeWidth="4"
                  strokeDasharray={`${ringDash} ${RING_CIRC}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.7s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}%</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 border border-white/20 hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('compliance.esrsWaterWaste.save', 'Sauvegarder')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {(['E3', 'E5'] as TabKey[]).map(key => {
          const th = THEMES[key];
          const isActive = activeTab === key;
          const filled = key === 'E3' ? filledE3 : filledE5;
          const total = key === 'E3' ? E3_INDICATORS.length : E5_INDICATORS.length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={isActive
                ? { background: th.badgeBg, color: th.badgeText, boxShadow: `inset 0 -2px 0 ${th.accent}` }
                : { color: 'rgba(255,255,255,0.4)' }
              }
            >
              {key === 'E3' ? <Droplets className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              {key === 'E3' ? t('compliance.esrsWaterWaste.tab.e3', '💧 Eau (E3)') : t('compliance.esrsWaterWaste.tab.e5', '♻️ Déchets (E5)')}
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: isActive ? `${th.accent}30` : 'rgba(255,255,255,0.07)', color: isActive ? th.badgeText : 'rgba(255,255,255,0.35)' }}
              >
                {filled}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-[76px] rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([esrsCode, sectionIndicators]) => {
            const sectionFilled = sectionIndicators.filter(ind => values[ind.code] !== undefined && values[ind.code] !== '').length;
            const sectionComplete = sectionFilled === sectionIndicators.length && sectionIndicators.length > 0;

            return (
              <div key={esrsCode} className="space-y-2">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border"
                    style={{ background: theme.badgeBg, color: theme.badgeText, borderColor: theme.badgeBorder }}
                  >
                    {esrsCode}
                  </span>
                  <span className="text-sm font-semibold text-slate-300">{sectionTitles[esrsCode] ?? esrsCode}</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="flex items-center gap-1.5">
                    {sectionComplete
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <span className="text-xs text-slate-500">{sectionFilled}/{sectionIndicators.length}</span>
                    }
                  </div>
                </div>

                {/* Indicator rows */}
                <div className="space-y-2">
                  {sectionIndicators.map(ind => {
                    const filled = values[ind.code] !== undefined && values[ind.code] !== '';
                    return (
                      <div
                        key={ind.code}
                        className="rounded-xl border px-5 py-3.5 transition-all"
                        style={{
                          background: filled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                          borderColor: filled ? `${theme.accent}40` : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: theme.badgeBg, color: theme.badgeText }}
                              >
                                {ind.code}
                              </span>
                              <span className="text-sm font-semibold text-white">{ind.label}</span>
                              {ind.unit && (
                                <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-mono">{ind.unit}</span>
                              )}
                              {filled && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{ind.desc}</p>
                          </div>
                          <div className="w-48 flex-shrink-0">
                            {ind.type === 'select' ? (
                              <select
                                value={values[ind.code] ?? ''}
                                onChange={e => setValues(prev => ({ ...prev, [ind.code]: e.target.value }))}
                                className={`w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 transition-all ${theme.ring}`}
                                style={{
                                  background: 'rgba(255,255,255,0.07)',
                                  border: `1px solid ${filled ? theme.accent + '55' : 'rgba(255,255,255,0.12)'}`,
                                }}
                              >
                                <option value="">{t('compliance.esrsWaterWaste.choose', '— Choisir')}</option>
                                {ind.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                type="number"
                                value={values[ind.code] ?? ''}
                                onChange={e => setValues(prev => ({ ...prev, [ind.code]: e.target.value }))}
                                placeholder="0"
                                className={`w-full rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${theme.ring}`}
                                style={{
                                  background: 'rgba(255,255,255,0.07)',
                                  border: `1px solid ${filled ? theme.accent + '55' : 'rgba(255,255,255,0.12)'}`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom save bar ───────────────────────────────────────────────────── */}
      {!loading && (
        <div className="sticky bottom-4 flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-xl transition-all disabled:opacity-60 border border-white/20"
            style={{ background: theme.accent, boxShadow: `0 8px 24px ${theme.accent}50` }}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('compliance.esrsWaterWaste.saving', 'Enregistrement…') : t('compliance.esrsWaterWaste.saveBottom', 'Sauvegarder')}
          </button>
        </div>
      )}
    </div>
  );
}
