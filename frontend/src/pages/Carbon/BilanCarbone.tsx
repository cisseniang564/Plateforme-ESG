import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Flame, Zap, Package, Truck, Trash2, Briefcase, Users, Home,
  ArrowDownRight, Settings, ShoppingBag, BarChart3, Leaf, Download,
  AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp,
  Sparkles, Info, RefreshCw, TrendingDown, TrendingUp,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Scope3Category {
  id: number;
  num: string;           // "Cat. 1"
  name: string;
  description: string;
  icon: any;
  upstream: boolean;     // amont vs aval
  ademe_factor: number;  // kgCO2e / unité
  ademe_unit: string;    // unité du facteur
  placeholder: string;
  tooltip: string;
  value: number | null;  // tCO2e saisie par l'utilisateur
  aiEstimate: number | null; // suggestion IA (tCO2e)
  color: string;
}

// ─── Données ADEME / GHG Protocol ──────────────────────────────────────────────
const initialCategories: Scope3Category[] = [
  {
    id: 1, num: 'Cat. 1', name: 'Achats de biens & services', upstream: true,
    description: 'Émissions liées à la production des biens et services achetés par l\'entreprise (matières premières, fournitures, sous-traitance...)',
    icon: ShoppingBag, ademe_factor: 0.85, ademe_unit: 'kgCO2e/€ d\'achats',
    placeholder: 'ex: 1 250', tooltip: 'Source : Base Empreinte® ADEME - Facteur moyen tous secteurs confondus',
    value: null, aiEstimate: 1280, color: 'emerald',
  },
  {
    id: 2, num: 'Cat. 2', name: 'Biens d\'équipement (immobilisations)', upstream: true,
    description: 'Émissions associées à la fabrication des biens d\'équipements utilisés (machines, bâtiments, véhicules...)',
    icon: Settings, ademe_factor: 1.2, ademe_unit: 'kgCO2e/€ d\'immobilisations',
    placeholder: 'ex: 340', tooltip: 'Source : Base Empreinte® ADEME - Secteur équipements industriels',
    value: null, aiEstimate: 340, color: 'blue',
  },
  {
    id: 3, num: 'Cat. 3', name: 'Activités liées à l\'énergie', upstream: true,
    description: 'Émissions en amont de la production d\'énergie (extraction, raffinage, transport du gaz/fioul), non incluses en Scope 1 & 2',
    icon: Zap, ademe_factor: 0.084, ademe_unit: 'kgCO2e/kWh énergie',
    placeholder: 'ex: 45', tooltip: 'Source : ADEME / RTE - Facteur résidu réseau électrique français',
    value: null, aiEstimate: 48, color: 'yellow',
  },
  {
    id: 4, num: 'Cat. 4', name: 'Transport & distribution amont', upstream: true,
    description: 'Transport des matières premières et marchandises vers l\'entreprise (fret routier, maritime, aérien, ferroviaire)',
    icon: Truck, ademe_factor: 0.089, ademe_unit: 'kgCO2e/tonne.km',
    placeholder: 'ex: 180', tooltip: 'Source : Base Empreinte® ADEME - Poids lourd <26t, gazole Euro VI',
    value: null, aiEstimate: 195, color: 'orange',
  },
  {
    id: 5, num: 'Cat. 5', name: 'Déchets générés par l\'exploitation', upstream: true,
    description: 'Traitement des déchets produits par les opérations internes (déchets ménagers, industriels, dangereux...)',
    icon: Trash2, ademe_factor: 0.449, ademe_unit: 'kgCO2e/tonne de déchets',
    placeholder: 'ex: 22', tooltip: 'Source : ADEME - Enfouissement centre de stockage déchets ménagers',
    value: null, aiEstimate: 18, color: 'red',
  },
  {
    id: 6, num: 'Cat. 6', name: 'Déplacements professionnels', upstream: true,
    description: 'Voyages d\'affaires (avion, train, voiture de location, taxi) effectués par les employés',
    icon: Briefcase, ademe_factor: 0.186, ademe_unit: 'kgCO2e/km (avion court-courrier)',
    placeholder: 'ex: 95', tooltip: 'Source : ADEME - Avion court-courrier classe éco, incluant traînées condensation ×2',
    value: null, aiEstimate: 88, color: 'purple',
  },
  {
    id: 7, num: 'Cat. 7', name: 'Trajets domicile-travail', upstream: true,
    description: 'Émissions des déplacements quotidiens des salariés entre leur domicile et leur lieu de travail',
    icon: Home, ademe_factor: 0.218, ademe_unit: 'kgCO2e/km (voiture thermique moy.)',
    placeholder: 'ex: 140', tooltip: 'Source : ADEME - Véhicule particulier thermique moyen France 2023',
    value: null, aiEstimate: 152, color: 'indigo',
  },
  {
    id: 8, num: 'Cat. 8', name: 'Actifs en leasing (amont)', upstream: true,
    description: 'Émissions opérationnelles des biens loués par l\'entreprise (immeubles, équipements, véhicules de fonction)',
    icon: Home, ademe_factor: 0.025, ademe_unit: 'kgCO2e/m².an (bâtiment RT2012)',
    placeholder: 'ex: 35', tooltip: 'Source : ADEME - Bâtiment tertiaire chauffage gaz, norme RT2012',
    value: null, aiEstimate: 32, color: 'teal',
  },
  {
    id: 9, num: 'Cat. 9', name: 'Transport & distribution aval', upstream: false,
    description: 'Transport des produits vendus vers les clients finaux (fret et logistique aval)',
    icon: ArrowDownRight, ademe_factor: 0.089, ademe_unit: 'kgCO2e/tonne.km',
    placeholder: 'ex: 210', tooltip: 'Source : Base Empreinte® ADEME - Poids lourd <26t, gazole Euro VI',
    value: null, aiEstimate: 220, color: 'cyan',
  },
  {
    id: 10, num: 'Cat. 10', name: 'Traitement des produits vendus', upstream: false,
    description: 'Traitement et transformation des produits intermédiaires vendus par des tiers avant usage final',
    icon: Settings, ademe_factor: 0.5, ademe_unit: 'kgCO2e/tonne transformée',
    placeholder: 'ex: 65', tooltip: 'Source : Estimation GHG Protocol - Processus de transformation standard',
    value: null, aiEstimate: null, color: 'slate',
  },
  {
    id: 11, num: 'Cat. 11', name: 'Utilisation des produits vendus', upstream: false,
    description: 'Émissions générées lors de l\'utilisation des produits par les clients (électricité consommée, carburant, etc.)',
    icon: Flame, ademe_factor: 2.37, ademe_unit: 'kgCO2e/litre carburant utilisé',
    placeholder: 'ex: 4 200', tooltip: 'Source : ADEME - Gazole usage, facteur CO2 seul (hors ACV)',
    value: null, aiEstimate: null, color: 'rose',
  },
  {
    id: 12, num: 'Cat. 12', name: 'Fin de vie des produits vendus', upstream: false,
    description: 'Traitement en fin de vie des produits vendus (recyclage, enfouissement, incinération)',
    icon: Trash2, ademe_factor: 0.449, ademe_unit: 'kgCO2e/tonne en fin de vie',
    placeholder: 'ex: 80', tooltip: 'Source : ADEME - Mix de traitement déchets ménagers France',
    value: null, aiEstimate: null, color: 'amber',
  },
  {
    id: 13, num: 'Cat. 13', name: 'Actifs en leasing (aval)', upstream: false,
    description: 'Émissions des biens loués par l\'entreprise à d\'autres entités (locataires, clients)',
    icon: Package, ademe_factor: 0.025, ademe_unit: 'kgCO2e/m².an',
    placeholder: 'ex: 15', tooltip: 'Source : ADEME - Bâtiment tertiaire chauffage gaz, norme RT2012',
    value: null, aiEstimate: null, color: 'green',
  },
  {
    id: 14, num: 'Cat. 14', name: 'Franchises', upstream: false,
    description: 'Émissions opérationnelles des franchisés (non consolidées dans le Scope 1 & 2 de la maison mère)',
    icon: BarChart3, ademe_factor: 0.85, ademe_unit: 'kgCO2e/€ d\'achats franchisés',
    placeholder: 'ex: 520', tooltip: 'Source : Estimation GHG Protocol - Calquée sur Scope 1+2 moyen des franchisés',
    value: null, aiEstimate: null, color: 'violet',
  },
  {
    id: 15, num: 'Cat. 15', name: 'Investissements', upstream: false,
    description: 'Émissions des participations financières, prêts et investissements en capital (financed emissions)',
    icon: TrendingUp, ademe_factor: 0.3, ademe_unit: 'kgCO2e/k€ investi',
    placeholder: 'ex: 280', tooltip: 'Source : PCAF Standard - Financed Emissions Equity & Bonds (pondéré par intensité)',
    value: null, aiEstimate: null, color: 'pink',
  },
];

const SCOPE1_DEFAULT = 320;  // tCO2e
const SCOPE2_DEFAULT = 185;  // tCO2e

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { bg: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
  yellow:  { bg: 'bg-yellow-50',   text: 'text-yellow-700',   border: 'border-yellow-200',  badge: 'bg-yellow-100 text-yellow-700' },
  orange:  { bg: 'bg-orange-50',   text: 'text-orange-700',   border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700' },
  red:     { bg: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200',     badge: 'bg-red-100 text-red-700' },
  purple:  { bg: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700' },
  indigo:  { bg: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-200',  badge: 'bg-indigo-100 text-indigo-700' },
  teal:    { bg: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200',    badge: 'bg-teal-100 text-teal-700' },
  cyan:    { bg: 'bg-cyan-50',     text: 'text-cyan-700',     border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700' },
  slate:   { bg: 'bg-slate-50',    text: 'text-slate-700',    border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700' },
  rose:    { bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700' },
  amber:   { bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  green:   { bg: 'bg-green-50',    text: 'text-green-700',    border: 'border-green-200',   badge: 'bg-green-100 text-green-700' },
  violet:  { bg: 'bg-violet-50',   text: 'text-violet-700',   border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700' },
  pink:    { bg: 'bg-pink-50',     text: 'text-pink-700',     border: 'border-pink-200',    badge: 'bg-pink-100 text-pink-700' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

// ─── Tooltip component ─────────────────────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <Info
        className="h-3.5 w-3.5 text-gray-400 cursor-pointer hover:text-gray-600"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BilanCarbone() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Scope3Category[]>(initialCategories);
  const [scope1, setScope1] = useState<number>(SCOPE1_DEFAULT);
  const [scope2, setScope2] = useState<number>(SCOPE2_DEFAULT);
  const [activeTab, setActiveTab] = useState<'overview' | 'scope3'>('overview');
  const [showUpstream, setShowUpstream] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [applyingAI, setApplyingAI] = useState<number | null>(null);
  const [year] = useState(2025);

  // ── Totals ───────────────────────────────────────────────────────────────────
  const scope3Total = useMemo(
    () => categories.reduce((acc, c) => acc + (c.value ?? 0), 0),
    [categories]
  );
  const grandTotal = scope1 + scope2 + scope3Total;
  const completedCount = categories.filter(c => c.value !== null).length;
  const aiAvailable = categories.filter(c => c.value === null && c.aiEstimate !== null).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateValue = (id: number, raw: string) => {
    const num = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
    setCategories(prev =>
      prev.map(c => c.id === id ? { ...c, value: isNaN(num) ? null : num } : c)
    );
  };

  const applyAI = (id: number) => {
    setApplyingAI(id);
    setTimeout(() => {
      setCategories(prev =>
        prev.map(c => c.id === id && c.aiEstimate !== null ? { ...c, value: c.aiEstimate } : c)
      );
      setApplyingAI(null);
    }, 600);
  };

  const applyAllAI = () => {
    setCategories(prev =>
      prev.map(c => (c.value === null && c.aiEstimate !== null) ? { ...c, value: c.aiEstimate } : c)
    );
  };

  const exportCSV = () => {
    const header = [
      t('carbon.csvCategory'), t('carbon.csvName'), t('carbon.csvType'),
      t('carbon.csvValue'), t('carbon.csvStatus'), t('carbon.csvFactor'), t('carbon.csvUnit'),
    ];
    const rows = categories.map(c => [
      c.num, c.name, c.upstream ? t('carbon.upstream') : t('carbon.downstream'),
      c.value ?? '', c.value !== null ? t('carbon.csvCompleted') : t('carbon.notFilled'),
      c.ademe_factor, c.ademe_unit,
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bilan-carbone-scope3-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Donut data ────────────────────────────────────────────────────────────────
  const donutParts = grandTotal > 0 ? [
    { label: 'Scope 1', value: scope1, pct: (scope1 / grandTotal) * 100, color: '#ef4444' },
    { label: 'Scope 2', value: scope2, pct: (scope2 / grandTotal) * 100, color: '#f97316' },
    { label: 'Scope 3', value: scope3Total, pct: (scope3Total / grandTotal) * 100, color: '#22c55e' },
  ] : [];

  // SVG donut
  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  let offset = 0;
  const donutSegments = donutParts.map(p => {
    const dash = (p.pct / 100) * CIRCUMFERENCE;
    const gap = CIRCUMFERENCE - dash;
    const seg = { ...p, dash, gap, offset };
    offset += dash;
    return seg;
  });

  const filteredCategories = categories.filter(c => c.upstream === showUpstream);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('carbon.title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('carbon.subtitle15cat')} {year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {aiAvailable > 0 && (
              <button
                onClick={applyAllAI}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-medium rounded-xl transition-colors text-sm"
              >
                <Sparkles className="h-4 w-4" />
                {t('carbon.completeWithAI')} ({aiAvailable})
              </button>
            )}
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-medium rounded-xl transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              {t('carbon.exportCSV')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-5 flex gap-1">
          {(['overview', 'scope3'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'overview' ? t('carbon.tabOverview') : t('carbon.tabScope3')}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: t('carbon.totalScope1'), value: scope1, unit: 'tCO2e', icon: Flame, color: 'red', sub: t('carbon.directEmissions'), pct: grandTotal > 0 ? ((scope1/grandTotal)*100).toFixed(1) : '—' },
                { label: t('carbon.totalScope2'), value: scope2, unit: 'tCO2e', icon: Zap, color: 'orange', sub: t('carbon.indirectEnergy'), pct: grandTotal > 0 ? ((scope2/grandTotal)*100).toFixed(1) : '—' },
                { label: t('carbon.totalScope3'), value: scope3Total, unit: 'tCO2e', icon: Package, color: 'green', sub: `${completedCount}/15 ${t('carbon.catsCompleted')}`, pct: grandTotal > 0 ? ((scope3Total/grandTotal)*100).toFixed(1) : '—' },
                { label: t('carbon.grandTotal'), value: grandTotal, unit: 'tCO2e', icon: Leaf, color: 'emerald', sub: `${t('carbon.exercise')} ${year}`, pct: '100' },
              ].map((kpi, i) => {
                const colors = COLOR_MAP[kpi.color] ?? COLOR_MAP.emerald;
                const Icon = kpi.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}>{kpi.pct}%</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{fmt(kpi.value)}</p>
                    <p className="text-xs text-gray-400 font-medium">{kpi.unit}</p>
                    <p className="text-sm text-gray-600 mt-1">{kpi.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Donut + breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Donut chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">{t('carbon.emissionsDistribution')}</h3>
                <div className="flex items-center gap-8">
                  <div className="relative flex-shrink-0">
                    <svg width="170" height="170" viewBox="0 0 170 170">
                      <circle cx="85" cy="85" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="20" />
                      {donutSegments.map((seg, i) => (
                        <circle
                          key={i}
                          cx="85" cy="85" r={RADIUS}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="20"
                          strokeDasharray={`${seg.dash} ${seg.gap}`}
                          strokeDashoffset={-seg.offset + CIRCUMFERENCE * 0.25}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                      ))}
                      <text x="85" y="80" textAnchor="middle" className="fill-gray-900" fontSize="20" fontWeight="700">
                        {fmt(grandTotal)}
                      </text>
                      <text x="85" y="98" textAnchor="middle" fill="#9ca3af" fontSize="11">
                        {t('carbon.tCO2eTotal')}
                      </text>
                    </svg>
                  </div>
                  <div className="space-y-3 flex-1">
                    {donutParts.map((p, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="font-medium text-gray-700">{p.label}</span>
                          </div>
                          <span className="font-bold text-gray-900">{p.pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 text-right">{fmt(p.value)} tCO2e</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scope 1 & 2 manual inputs + benchmark */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 className="text-base font-bold text-gray-900">{t('carbon.scope12DirectEntry')}</h3>
                <p className="text-sm text-gray-500">{t('carbon.scope12Desc')}</p>

                {[
                  { label: t('carbon.scope1Label'), desc: t('carbon.scope1Desc'), key: 'scope1' as const, value: scope1, setter: setScope1 },
                  { label: t('carbon.scope2Label'), desc: t('carbon.scope2Desc'), key: 'scope2' as const, value: scope2, setter: setScope2 },
                ].map(field => (
                  <div key={field.key} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{field.label}</label>
                    <p className="text-xs text-gray-500 mb-3">{field.desc}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={field.value}
                        onChange={e => field.setter(parseFloat(e.target.value) || 0)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-500 font-medium whitespace-nowrap">tCO2e</span>
                    </div>
                  </div>
                ))}

                {/* Benchmark insight */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800 mb-1">{t('carbon.benchmarkTitle')}</p>
                    <p className="text-amber-700">
                      {t('carbon.benchmarkDesc')} <strong>78%</strong> {t('carbon.benchmarkDesc2')}{' '}
                      <strong>{grandTotal > 0 ? ((scope3Total / grandTotal) * 100).toFixed(0) : 0}%</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scope 3 top categories bar chart */}
            {scope3Total > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-6">{t('carbon.topScope3Categories')}</h3>
                <div className="space-y-3">
                  {[...categories]
                    .filter(c => c.value !== null && c.value > 0)
                    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                    .slice(0, 8)
                    .map(c => {
                      const pct = scope3Total > 0 ? ((c.value ?? 0) / scope3Total) * 100 : 0;
                      const colors = COLOR_MAP[c.color] ?? COLOR_MAP.emerald;
                      return (
                        <div key={c.id} className="flex items-center gap-4">
                          <div className="w-28 text-xs text-gray-500 flex-shrink-0 text-right">{c.num}</div>
                          <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className={`h-7 ${colors.bg} border ${colors.border} rounded-lg flex items-center px-3 transition-all duration-500`}
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            >
                              <span className={`text-xs font-bold ${colors.text} whitespace-nowrap`}>{fmt(c.value ?? 0)} t</span>
                            </div>
                          </div>
                          <div className="w-12 text-xs font-semibold text-gray-700 text-right">{pct.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: 15 SCOPE 3 CATEGORIES                                         */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'scope3' && (
          <div className="space-y-6">

            {/* Progress banner */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-gray-700">{t('carbon.scope3Completeness')}</span>
                  <span className="font-bold text-green-600">{completedCount} / 15 {t('carbon.categories')}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full">
                  <div
                    className="h-3 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / 15) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle className="h-4 w-4" />{completedCount} {t('carbon.completed')}
                </div>
                <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <Clock className="h-4 w-4" />{15 - completedCount} {t('carbon.remaining')}
                </div>
              </div>
            </div>

            {/* Upstream / Downstream toggle */}
            <div className="flex gap-2">
              {[
                { val: true, label: `⬆️ ${t('carbon.upstreamCategories')}` },
                { val: false, label: `⬇️ ${t('carbon.downstreamCategories')}` },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => setShowUpstream(opt.val)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    showUpstream === opt.val
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Category cards */}
            <div className="space-y-4">
              {filteredCategories.map(cat => {
                const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.emerald;
                const Icon = cat.icon;
                const isExpanded = expandedId === cat.id;
                const pct = scope3Total > 0 && cat.value !== null ? ((cat.value / scope3Total) * 100) : 0;
                const status = cat.value !== null ? 'done' : cat.aiEstimate !== null ? 'ai' : 'missing';

                return (
                  <div
                    key={cat.id}
                    className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                      isExpanded ? `${colors.border} shadow-md` : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Card header — always visible */}
                    <div
                      className="flex items-center gap-4 p-5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                    >
                      <div className={`w-11 h-11 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{cat.num}</span>
                          <span className="font-semibold text-gray-900 text-sm">{cat.name}</span>
                          {status === 'done' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          {status === 'ai' && <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />}
                          {status === 'missing' && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                        </div>
                        {cat.value !== null && scope3Total > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-xs">
                              <div className={`h-1.5 rounded-full transition-all duration-500 ${colors.bg.replace('50', '400')}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{pct.toFixed(1)}% {t('carbon.percentOfScope3')}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        {cat.value !== null ? (
                          <div>
                            <span className="text-lg font-bold text-gray-900">{fmt(cat.value)}</span>
                            <span className="text-xs text-gray-400 ml-1">tCO2e</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">{t('carbon.notFilled')}</span>
                        )}
                      </div>

                      <div className="flex-shrink-0 ml-2">
                        {isExpanded
                          ? <ChevronUp className="h-5 w-5 text-gray-400" />
                          : <ChevronDown className="h-5 w-5 text-gray-400" />
                        }
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className={`border-t ${colors.border} px-5 pb-5 pt-4 space-y-5`}>
                        <p className="text-sm text-gray-600 leading-relaxed">{cat.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Input */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('carbon.measuredValue')} <Tooltip text={cat.tooltip} />
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder={cat.placeholder}
                                value={cat.value ?? ''}
                                onChange={e => updateValue(cat.id, e.target.value)}
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                              <span className="flex items-center text-sm text-gray-500 font-medium">tCO2e</span>
                            </div>
                          </div>

                          {/* ADEME Factor */}
                          <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              {t('carbon.ademeEmissionFactor')}
                            </p>
                            <p className={`text-xl font-bold ${colors.text}`}>{cat.ademe_factor}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{cat.ademe_unit}</p>
                            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{cat.tooltip}</p>
                          </div>
                        </div>

                        {/* AI suggestion */}
                        {cat.aiEstimate !== null && (
                          <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-purple-800">{t('carbon.aiSuggestion')}</p>
                              <p className="text-xs text-purple-600 mt-0.5">
                                {t('carbon.aiEstimatedAt')} <strong>{fmt(cat.aiEstimate)} tCO2e</strong> {t('carbon.aiBasedOn')}
                              </p>
                            </div>
                            <button
                              onClick={() => applyAI(cat.id)}
                              disabled={applyingAI === cat.id}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
                            >
                              {applyingAI === cat.id
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <Sparkles className="h-4 w-4" />
                              }
                              {t('carbon.apply')}
                            </button>
                          </div>
                        )}

                        {/* No AI available */}
                        {cat.aiEstimate === null && cat.value === null && (
                          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <span>{t('carbon.noAIData')}</span>
                          </div>
                        )}

                        {cat.value !== null && (
                          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{t('carbon.catFilledMsg')} — <strong>{fmt(cat.value)} tCO2e</strong> {t('carbon.ofScope3Total')} <strong>{pct.toFixed(1)}%</strong></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="bg-gradient-to-br from-green-900 to-emerald-800 rounded-2xl p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-green-300 text-sm font-medium mb-1">{t('carbon.scope3TotalEntered')}</p>
                  <p className="text-4xl font-bold">{fmt(scope3Total)} <span className="text-xl text-green-300">tCO2e</span></p>
                  <p className="text-green-400 text-sm mt-1">
                    {completedCount > 1
                      ? `${completedCount} ${t('carbon.scope3TotalOf15Plural')}`
                      : `${completedCount} ${t('carbon.scope3TotalOf15')}`
                    }
                  </p>
                </div>
                <div className="flex gap-3">
                  {aiAvailable > 0 && (
                    <button onClick={applyAllAI} className="flex items-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl font-semibold text-sm transition-colors">
                      <Sparkles className="h-4 w-4" />
                      {t('carbon.aiCompleteRemaining')} {aiAvailable} {t('carbon.aiCompleteRemainingUnit')}
                    </button>
                  )}
                  <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 bg-white text-green-900 rounded-xl font-bold text-sm hover:bg-green-50 transition-colors shadow-lg">
                    <Download className="h-4 w-4" />
                    {t('carbon.export')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
