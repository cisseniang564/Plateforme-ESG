import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  Flame, Zap, Package, Truck, Trash2, Briefcase, Users, Home,
  ArrowDownRight, Settings, ShoppingBag, BarChart3, Leaf, Download,
  AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp,
  Sparkles, Info, RefreshCw, TrendingDown, TrendingUp, Target,
  Calendar, Activity, Upload,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Scope3Category {
  id: number;
  num: string;
  name: string;
  description: string;
  icon: any;
  upstream: boolean;
  ademe_factor: number;
  ademe_unit: string;
  placeholder: string;
  tooltip: string;
  value: number | null;
  aiEstimate: number | null;
  hex: string;     // main hex color (inline styles — no Tailwind purging)
  softHex: string; // light bg hex
  borderHex: string;
}

// ─── Color palette (ALL inline, never dynamic Tailwind) ───────────────────────
const CAT_COLORS: Record<number, { hex: string; softHex: string; borderHex: string }> = {
  1:  { hex: '#059669', softHex: '#ecfdf5', borderHex: '#a7f3d0' },
  2:  { hex: '#2563eb', softHex: '#eff6ff', borderHex: '#bfdbfe' },
  3:  { hex: '#ca8a04', softHex: '#fefce8', borderHex: '#fde68a' },
  4:  { hex: '#ea580c', softHex: '#fff7ed', borderHex: '#fed7aa' },
  5:  { hex: '#dc2626', softHex: '#fef2f2', borderHex: '#fecaca' },
  6:  { hex: '#9333ea', softHex: '#faf5ff', borderHex: '#e9d5ff' },
  7:  { hex: '#4338ca', softHex: '#eef2ff', borderHex: '#c7d2fe' },
  8:  { hex: '#0d9488', softHex: '#f0fdfa', borderHex: '#99f6e4' },
  9:  { hex: '#0891b2', softHex: '#ecfeff', borderHex: '#a5f3fc' },
  10: { hex: '#475569', softHex: '#f8fafc', borderHex: '#e2e8f0' },
  11: { hex: '#e11d48', softHex: '#fff1f2', borderHex: '#fecdd3' },
  12: { hex: '#d97706', softHex: '#fffbeb', borderHex: '#fde68a' },
  13: { hex: '#16a34a', softHex: '#f0fdf4', borderHex: '#bbf7d0' },
  14: { hex: '#7c3aed', softHex: '#f5f3ff', borderHex: '#ddd6fe' },
  15: { hex: '#db2777', softHex: '#fdf2f8', borderHex: '#fbcfe8' },
};

// ─── Static data ───────────────────────────────────────────────────────────────
const initialCategories: Scope3Category[] = [
  {
    id: 1, num: 'Cat. 1', name: 'Achats de biens & services', upstream: true,
    description: 'Émissions liées à la production des biens et services achetés par l\'entreprise (matières premières, fournitures, sous-traitance...)',
    icon: ShoppingBag, ademe_factor: 0.85, ademe_unit: 'kgCO₂e/€ d\'achats',
    placeholder: 'ex : 1 250', tooltip: 'Source : Base Empreinte® ADEME — Facteur moyen tous secteurs confondus',
    value: null, aiEstimate: 1280, ...CAT_COLORS[1],
  },
  {
    id: 2, num: 'Cat. 2', name: 'Biens d\'équipement (immobilisations)', upstream: true,
    description: 'Émissions associées à la fabrication des biens d\'équipements utilisés (machines, bâtiments, véhicules...)',
    icon: Settings, ademe_factor: 1.2, ademe_unit: 'kgCO₂e/€ d\'immobilisations',
    placeholder: 'ex : 340', tooltip: 'Source : Base Empreinte® ADEME — Secteur équipements industriels',
    value: null, aiEstimate: 340, ...CAT_COLORS[2],
  },
  {
    id: 3, num: 'Cat. 3', name: 'Activités liées à l\'énergie', upstream: true,
    description: 'Émissions en amont de la production d\'énergie (extraction, raffinage, transport du gaz/fioul), non incluses en Scope 1 & 2',
    icon: Zap, ademe_factor: 0.084, ademe_unit: 'kgCO₂e/kWh énergie',
    placeholder: 'ex : 45', tooltip: 'Source : ADEME / RTE — Facteur résidu réseau électrique français',
    value: null, aiEstimate: 48, ...CAT_COLORS[3],
  },
  {
    id: 4, num: 'Cat. 4', name: 'Transport & distribution amont', upstream: true,
    description: 'Transport des matières premières et marchandises vers l\'entreprise (fret routier, maritime, aérien, ferroviaire)',
    icon: Truck, ademe_factor: 0.089, ademe_unit: 'kgCO₂e/tonne.km',
    placeholder: 'ex : 180', tooltip: 'Source : Base Empreinte® ADEME — Poids lourd <26t, gazole Euro VI',
    value: null, aiEstimate: 195, ...CAT_COLORS[4],
  },
  {
    id: 5, num: 'Cat. 5', name: 'Déchets générés par l\'exploitation', upstream: true,
    description: 'Traitement des déchets produits par les opérations internes (déchets ménagers, industriels, dangereux...)',
    icon: Trash2, ademe_factor: 0.449, ademe_unit: 'kgCO₂e/tonne de déchets',
    placeholder: 'ex : 22', tooltip: 'Source : ADEME — Enfouissement centre de stockage déchets ménagers',
    value: null, aiEstimate: 18, ...CAT_COLORS[5],
  },
  {
    id: 6, num: 'Cat. 6', name: 'Déplacements professionnels', upstream: true,
    description: 'Voyages d\'affaires (avion, train, voiture de location, taxi) effectués par les employés',
    icon: Briefcase, ademe_factor: 0.186, ademe_unit: 'kgCO₂e/km (avion court-courrier)',
    placeholder: 'ex : 95', tooltip: 'Source : ADEME — Avion court-courrier classe éco, incluant traînées condensation ×2',
    value: null, aiEstimate: 88, ...CAT_COLORS[6],
  },
  {
    id: 7, num: 'Cat. 7', name: 'Trajets domicile-travail', upstream: true,
    description: 'Émissions des déplacements quotidiens des salariés entre leur domicile et leur lieu de travail',
    icon: Users, ademe_factor: 0.218, ademe_unit: 'kgCO₂e/km (voiture thermique moy.)',
    placeholder: 'ex : 140', tooltip: 'Source : ADEME — Véhicule particulier thermique moyen France 2023',
    value: null, aiEstimate: 152, ...CAT_COLORS[7],
  },
  {
    id: 8, num: 'Cat. 8', name: 'Actifs en leasing (amont)', upstream: true,
    description: 'Émissions opérationnelles des biens loués par l\'entreprise (immeubles, équipements, véhicules de fonction)',
    icon: Home, ademe_factor: 0.025, ademe_unit: 'kgCO₂e/m².an (bâtiment RT2012)',
    placeholder: 'ex : 35', tooltip: 'Source : ADEME — Bâtiment tertiaire chauffage gaz, norme RT2012',
    value: null, aiEstimate: 32, ...CAT_COLORS[8],
  },
  {
    id: 9, num: 'Cat. 9', name: 'Transport & distribution aval', upstream: false,
    description: 'Transport des produits vendus vers les clients finaux (fret et logistique aval)',
    icon: ArrowDownRight, ademe_factor: 0.089, ademe_unit: 'kgCO₂e/tonne.km',
    placeholder: 'ex : 210', tooltip: 'Source : Base Empreinte® ADEME — Poids lourd <26t, gazole Euro VI',
    value: null, aiEstimate: 220, ...CAT_COLORS[9],
  },
  {
    id: 10, num: 'Cat. 10', name: 'Traitement des produits vendus', upstream: false,
    description: 'Traitement et transformation des produits intermédiaires vendus par des tiers avant usage final',
    icon: Settings, ademe_factor: 0.5, ademe_unit: 'kgCO₂e/tonne transformée',
    placeholder: 'ex : 65', tooltip: 'Source : Estimation GHG Protocol — Processus de transformation standard',
    value: null, aiEstimate: null, ...CAT_COLORS[10],
  },
  {
    id: 11, num: 'Cat. 11', name: 'Utilisation des produits vendus', upstream: false,
    description: 'Émissions générées lors de l\'utilisation des produits par les clients (électricité consommée, carburant, etc.)',
    icon: Flame, ademe_factor: 2.37, ademe_unit: 'kgCO₂e/litre carburant utilisé',
    placeholder: 'ex : 4 200', tooltip: 'Source : ADEME — Gazole usage, facteur CO₂ seul (hors ACV)',
    value: null, aiEstimate: null, ...CAT_COLORS[11],
  },
  {
    id: 12, num: 'Cat. 12', name: 'Fin de vie des produits vendus', upstream: false,
    description: 'Traitement en fin de vie des produits vendus (recyclage, enfouissement, incinération)',
    icon: Trash2, ademe_factor: 0.449, ademe_unit: 'kgCO₂e/tonne en fin de vie',
    placeholder: 'ex : 80', tooltip: 'Source : ADEME — Mix de traitement déchets ménagers France',
    value: null, aiEstimate: null, ...CAT_COLORS[12],
  },
  {
    id: 13, num: 'Cat. 13', name: 'Actifs en leasing (aval)', upstream: false,
    description: 'Émissions des biens loués par l\'entreprise à d\'autres entités (locataires, clients)',
    icon: Package, ademe_factor: 0.025, ademe_unit: 'kgCO₂e/m².an',
    placeholder: 'ex : 15', tooltip: 'Source : ADEME — Bâtiment tertiaire chauffage gaz, norme RT2012',
    value: null, aiEstimate: null, ...CAT_COLORS[13],
  },
  {
    id: 14, num: 'Cat. 14', name: 'Franchises', upstream: false,
    description: 'Émissions opérationnelles des franchisés (non consolidées dans le Scope 1 & 2 de la maison mère)',
    icon: BarChart3, ademe_factor: 0.85, ademe_unit: 'kgCO₂e/€ d\'achats franchisés',
    placeholder: 'ex : 520', tooltip: 'Source : Estimation GHG Protocol — Calquée sur Scope 1+2 moyen des franchisés',
    value: null, aiEstimate: null, ...CAT_COLORS[14],
  },
  {
    id: 15, num: 'Cat. 15', name: 'Investissements', upstream: false,
    description: 'Émissions des participations financières, prêts et investissements en capital (financed emissions)',
    icon: TrendingUp, ademe_factor: 0.3, ademe_unit: 'kgCO₂e/k€ investi',
    placeholder: 'ex : 280', tooltip: 'Source : PCAF Standard — Financed Emissions Equity & Bonds (pondéré par intensité)',
    value: null, aiEstimate: null, ...CAT_COLORS[15],
  },
];


function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

// ─── Sankey Scope 3 component ──────────────────────────────────────────────────
function SankeyScope3({ categories, total }: { categories: Scope3Category[]; total: number }) {
  const active = [...categories]
    .filter(c => (c.value ?? 0) > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const SVG_H = 500;
  const startY = 20;
  const endY = 480;
  const totalH = endY - startY;
  const GAP = 4;
  const totalGaps = (active.length - 1) * GAP;
  const availableH = totalH - totalGaps;

  let leftAcc = startY;
  let rightAcc = startY;

  const nodes = active.map(cat => {
    const nodeH = Math.max(1, (cat.value! / total) * availableH);
    const leftBandStart = leftAcc;
    const leftBandEnd = leftAcc + (cat.value! / total) * totalH;
    const rightNodeY = rightAcc;
    const rightNodeH = nodeH;
    leftAcc = leftBandEnd;
    rightAcc = rightAcc + nodeH + GAP;
    const hex = cat.hex;
    const cpX = 400;
    const path = [
      `M 120 ${leftBandStart}`,
      `C ${cpX} ${leftBandStart} ${cpX} ${rightNodeY + rightNodeH / 2} 680 ${rightNodeY}`,
      `L 680 ${rightNodeY + rightNodeH}`,
      `C ${cpX} ${rightNodeY + rightNodeH} ${cpX} ${leftBandEnd} 120 ${leftBandEnd}`,
      'Z',
    ].join(' ');
    return { cat, hex, path, rightNodeY, rightNodeH, leftBandStart, leftBandEnd };
  });

  return (
    <svg viewBox="0 0 800 500" width="100%" style={{ display: 'block' }} aria-label="Sankey Scope 3">
      <rect x={0} y={startY} width={120} height={totalH} rx={6} fill="#10b981" />
      <text x={60} y={startY + totalH / 2 - 8} textAnchor="middle" fill="white" fontSize={12} fontWeight="700">Scope 3</text>
      <text x={60} y={startY + totalH / 2 + 8} textAnchor="middle" fill="white" fontSize={12} fontWeight="700">Total</text>
      <text x={60} y={startY + totalH / 2 + 26} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={10}>
        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(total)} tCO₂e
      </text>
      {nodes.map(n => (
        <path key={n.cat.id} d={n.path} fill={n.hex} opacity={0.70} />
      ))}
      {nodes.map(n => (
        <g key={`node-${n.cat.id}`}>
          <rect x={680} y={n.rightNodeY} width={120} height={n.rightNodeH} rx={4} fill={n.hex} />
          <text
            x={675} y={n.rightNodeY + n.rightNodeH / 2 + 4}
            textAnchor="end" fill="#111827"
            fontSize={n.rightNodeH >= 16 ? 11 : 9} fontWeight="600"
          >
            {n.cat.num} — {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n.cat.value!)} tCO₂e
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <Info
        className="h-3.5 w-3.5 text-gray-400 cursor-pointer hover:text-gray-600"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 leading-relaxed pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ─── SVG Donut ──────────────────────────────────────────────────────────────────
function DonutChart({
  parts, total,
}: { parts: { label: string; value: number; pct: number; color: string }[]; total: number }) {
  const R = 70, C = 2 * Math.PI * R;
  let off = 0;
  const segs = parts.map(p => {
    const dash = (p.pct / 100) * C;
    const s = { ...p, dash, gap: C - dash, offset: off };
    off += dash;
    return s;
  });
  return (
    <div className="flex items-center gap-8">
      <div className="relative flex-shrink-0">
        <svg width="170" height="170" viewBox="0 0 170 170">
          <circle cx="85" cy="85" r={R} fill="none" stroke="#f3f4f6" strokeWidth="20" />
          {segs.map((s, i) => (
            <circle key={i} cx="85" cy="85" r={R} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset + C * 0.25}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
          ))}
          <text x="85" y="80" textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827" fontFamily="system-ui,sans-serif">
            {fmt(total)}
          </text>
          <text x="85" y="99" textAnchor="middle" fontSize="11" fill="#9ca3af" fontFamily="system-ui,sans-serif">
            tCO₂e total
          </text>
        </svg>
      </div>
      <div className="space-y-3 flex-1 min-w-0">
        {parts.map((p, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-medium text-gray-700">{p.label}</span>
              </div>
              <span className="font-bold text-gray-900 tabular-nums">{p.pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 text-right tabular-nums">{fmt(p.value)} tCO₂e</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BilanCarbone() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [categories, setCategories] = useState<Scope3Category[]>(initialCategories);
  const [scope1, setScope1] = useState(0);
  const [scope2, setScope2] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'scope3' | 'decomposition' | 'sankey'>('overview');
  const [showUpstream, setShowUpstream] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [applyingAI, setApplyingAI] = useState<number | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load real data from backend ───────────────────────────────────────────────
  useEffect(() => {
    api.get('/carbon/scope-summary', { params: { year } })
      .then(res => {
        const d = res.data;
        const s1 = d?.scope1?.total_tco2e ?? 0;
        const s2 = d?.scope2?.total_tco2e ?? 0;
        const s3ByCat: Record<string, number> = d?.scope3?.by_category ?? {};
        if (s1 > 0 || s2 > 0) { setScope1(Math.round(s1)); setScope2(Math.round(s2)); setHasRealData(true); }
        if (Object.keys(s3ByCat).length > 0) {
          setHasRealData(true);
          setCategories(prev => prev.map(cat => {
            const val = s3ByCat[String(cat.id)];
            return val != null ? { ...cat, value: Math.round(val) } : cat;
          }));
        }
      })
      .catch(() => {});
  }, [year]);

  // ── Derived values ─────────────────────────────────────────────────────────────
  const scope3Total = useMemo(() => categories.reduce((acc, c) => acc + (c.value ?? 0), 0), [categories]);
  const grandTotal = scope1 + scope2 + scope3Total;
  const completedCount = categories.filter(c => c.value !== null).length;
  const aiAvailable = categories.filter(c => c.value === null && c.aiEstimate !== null).length;
  const completenessRate = Math.round((completedCount / 15) * 100);

  // SBTi 1.5°C target (−42% from current)
  const sbtiTarget2030 = grandTotal > 0 ? Math.round(grandTotal * 0.58) : 0;
  const requiredReduction = grandTotal > 0 ? grandTotal - sbtiTarget2030 : 0;
  // Simplified on-track heuristic: scope3 < 80% of total (good practice)
  const scope3Pct = grandTotal > 0 ? (scope3Total / grandTotal) * 100 : 0;
  const onTrack = scope3Pct < 80 && grandTotal > 0;

  // Donut parts
  const donutParts = grandTotal > 0 ? [
    { label: 'Scope 1 — Direct', value: scope1, pct: (scope1 / grandTotal) * 100, color: '#ef4444' },
    { label: 'Scope 2 — Énergie', value: scope2, pct: (scope2 / grandTotal) * 100, color: '#f97316' },
    { label: 'Scope 3 — Indirect', value: scope3Total, pct: (scope3Total / grandTotal) * 100, color: '#22c55e' },
  ] : [];

  const filteredCategories = categories.filter(c => c.upstream === showUpstream);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const updateValue = (id: number, raw: string) => {
    const num = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
    setCategories(prev => prev.map(c => c.id === id ? { ...c, value: isNaN(num) ? null : num } : c));
  };

  const applyAI = (id: number) => {
    setApplyingAI(id);
    setTimeout(() => {
      setCategories(prev => prev.map(c => c.id === id && c.aiEstimate !== null ? { ...c, value: c.aiEstimate } : c));
      setApplyingAI(null);
    }, 600);
  };

  const applyAllAI = () => {
    setCategories(prev => prev.map(c => (c.value === null && c.aiEstimate !== null) ? { ...c, value: c.aiEstimate } : c));
    toast.success(t('carbon.toastAIFilled', '{{n}} catégorie(s) remplies par les estimations IA', { n: aiAvailable }));
  };

  const saveScope3 = async () => {
    const filled = categories.filter(c => c.value !== null && c.value > 0);
    if (!filled.length) { toast.error(t('carbon.toastNoValues', 'Aucune valeur à sauvegarder. Saisissez au moins une catégorie.')); return; }
    setSaving(true);
    try {
      const res = await api.post('/carbon/save-scope3', {
        year,
        entries: filled.map(c => ({
          cat_id: c.id, name: c.name, num: c.num, value: c.value,
          unit: 'tCO2e', ademe_factor: c.ademe_factor, ademe_unit: c.ademe_unit,
        })),
      });
      toast.success(t('carbon.toastSaved', '✅ {{n}} catégorie(s) Scope 3 sauvegardées pour {{year}}', { n: res.data.inserted, year }));
      setHasRealData(true);
    } catch {
      toast.error(t('carbon.toastSaveError', 'Erreur lors de la sauvegarde. Réessayez.'));
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const header = ['Catégorie', 'Nom', 'Type', 'tCO₂e', 'Statut', 'Facteur ADEME', 'Unité'];
    const rows = categories.map(c => [
      c.num, c.name, c.upstream ? 'Amont' : 'Aval',
      c.value ?? '', c.value !== null ? 'Complété' : 'Non renseigné',
      c.ademe_factor, c.ademe_unit,
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bilan-carbone-scope3-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t('carbon.toastCsvExported', 'Export CSV téléchargé'));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 35%, #047857 70%, #059669 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
        {/* dot pattern */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="carbondots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#carbondots)" />
          </svg>
        </div>

        <div className="relative px-8 py-7">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: title + stats */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">{t('carbon.title', 'Bilan Carbone — Scope 3')}</h1>
              </div>
              <p className="text-emerald-200 text-sm ml-1 mb-5">
                {t('carbon.subtitle15cat', '15 catégories GHG Protocol • Base Empreinte® ADEME')}
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t('carbon.pillTotal', 'Total {{val}} tCO₂e', { val: fmt(grandTotal) }), bg: 'rgba(255,255,255,0.15)', text: 'white' },
                  { label: t('carbon.pillScope3Count', 'Scope 3 : {{n}}/15 cat.', { n: completedCount }), bg: grandTotal > 0 ? '#bbf7d0' : 'rgba(255,255,255,0.15)', text: grandTotal > 0 ? '#166534' : 'white' },
                  { label: hasRealData ? t('carbon.pillRealData', 'Données réelles {{year}}', { year }) : t('carbon.pillEstimates', 'Estimations {{year}}', { year }), bg: hasRealData ? '#a7f3d0' : 'rgba(255,255,255,0.12)', text: hasRealData ? '#065f46' : 'white' },
                ].map(p => (
                  <div key={p.label} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: p.bg, color: p.text }}>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: year selector + actions */}
            <div className="flex flex-col gap-3 shrink-0">
              {/* Year selector */}
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
                <Calendar className="h-4 w-4 text-emerald-300" />
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                    <option key={y} value={y} className="text-gray-900 bg-white">{y}</option>
                  ))}
                </select>
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => navigate('/app/carbon/fec-wizard')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                  title="Calcul Scope 3 depuis votre Fichier des Écritures Comptables">
                  <Upload className="h-4 w-4" />
                  {t('carbon.importFEC', 'Import FEC')}
                </button>
                {aiAvailable > 0 && (
                  <button onClick={applyAllAI}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                    <Sparkles className="h-4 w-4" />
                    {t('carbon.aiBtn', 'IA ({{n}})', { n: aiAvailable })}
                  </button>
                )}
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await api.get(`/carbon/beges-export.xlsx?year=${year}`, { responseType: 'blob' });
                      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `BEGES_${year}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      toast.success(t('carbon.toastBegesDownloaded', 'BEGES {{year}} téléchargé', { year }));
                    } catch {
                      toast.error(t('carbon.toastBegesFailed', 'Échec du téléchargement BEGES'));
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(16,185,129,0.95)', color: 'white' }}
                  title="Export au format ADEME pour soumission bilans-ges.ademe.fr (Art. L229-25)"
                >
                  <Download className="h-4 w-4" />
                  BEGES.xlsx
                </button>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="mt-6 flex flex-wrap gap-2">
            {([
              { key: 'overview',      label: t('carbon.tabOverview', "📊 Vue d'ensemble") },
              { key: 'scope3',        label: t('carbon.tabScope3Cats', '📋 15 catégories Scope 3') },
              { key: 'decomposition', label: t('carbon.tabDecomposition', '📈 Décomposition Scope 3') },
              { key: 'sankey',        label: t('carbon.tabSankey', '🌊 Flux Sankey') },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key ? 'bg-white text-emerald-800 shadow-md' : 'text-white/80 hover:bg-white/15'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data banner ───────────────────────────────────────────────────────── */}
      {hasRealData && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', border: '1px solid #a7f3d0', color: '#065f46' }}>
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {t('carbon.dataBannerReal', 'Données réelles chargées pour {{year}}', { year })} —{' '}
            <strong>Scope 1 : {fmt(scope1)} tCO₂e</strong> ·{' '}
            <strong>Scope 2 : {fmt(scope2)} tCO₂e</strong>
            {scope3Total > 0 && <> · <strong>Scope 3 : {fmt(scope3Total)} tCO₂e</strong></>}
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* KPI row — 4 cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('carbon.kpiScope1Label', 'Scope 1 — Direct'), value: scope1, pct: grandTotal > 0 ? (scope1/grandTotal*100).toFixed(1) : '—', icon: Flame, color: '#ef4444', soft: '#fef2f2', sub: t('carbon.kpiScope1Sub', 'Combustion propre, fugitifs') },
              { label: t('carbon.kpiScope2Label', 'Scope 2 — Énergie'), value: scope2, pct: grandTotal > 0 ? (scope2/grandTotal*100).toFixed(1) : '—', icon: Zap, color: '#f97316', soft: '#fff7ed', sub: t('carbon.kpiScope2Sub', 'Électricité, chaleur achetée') },
              { label: t('carbon.kpiScope3Label', 'Scope 3 — Indirect'), value: scope3Total, pct: grandTotal > 0 ? (scope3Total/grandTotal*100).toFixed(1) : '—', icon: Package, color: '#059669', soft: '#ecfdf5', sub: t('carbon.kpiScope3Sub', '{{done}}/15 catégories saisies', { done: completedCount }) },
              { label: t('carbon.kpiTotalLabel', 'Total GES'), value: grandTotal, pct: '100', icon: Activity, color: '#7c3aed', soft: '#f5f3ff', sub: t('carbon.kpiTotalSub', 'Exercice {{year}}', { year }) },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.soft }}>
                      <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
                      style={{ backgroundColor: kpi.soft, color: kpi.color }}>
                      {kpi.pct}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(kpi.value)}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: kpi.color }}>tCO₂e</p>
                  <p className="text-sm font-semibold text-gray-700 mt-2">{kpi.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Donut chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-4 w-4 text-gray-500" />
                <h3 className="text-base font-bold text-gray-900">{t('carbon.emissionsChart', 'Répartition des émissions')}</h3>
              </div>
              {grandTotal > 0 ? (
                <DonutChart parts={donutParts} total={grandTotal} />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Leaf className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">{t('carbon.emissionsChartEmpty', 'Saisissez des données pour voir le graphique')}</p>
                </div>
              )}
            </div>

            {/* Scope 1 & 2 inputs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-gray-500" />
                <h3 className="text-base font-bold text-gray-900">{t('carbon.scope12DirectEntry', 'Scope 1 & 2 — Saisie directe')}</h3>
              </div>
              <p className="text-sm text-gray-500">{t('carbon.scope12Desc', 'Renseignez vos émissions directes et énergie achetée pour compléter le bilan total.')}</p>

              {[
                { label: t('carbon.scope1FullLabel', 'Scope 1 — Émissions directes'), desc: t('carbon.scope1Desc', 'Combustion de combustibles, procédés industriels, fuites réfrigérants'), color: '#ef4444', softColor: '#fef2f2', value: scope1, setter: setScope1 },
                { label: t('carbon.scope2FullLabel', 'Scope 2 — Énergie achetée'), desc: t('carbon.scope2Desc', 'Électricité, chaleur, vapeur et froid achetés à des tiers'), color: '#f97316', softColor: '#fff7ed', value: scope2, setter: setScope2 },
              ].map(field => (
                <div key={field.label} className="p-4 rounded-xl border" style={{ backgroundColor: field.softColor, borderColor: '#e5e7eb' }}>
                  <label className="block text-sm font-semibold text-gray-800 mb-0.5">{field.label}</label>
                  <p className="text-xs text-gray-500 mb-3">{field.desc}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0"
                      value={field.value || ''}
                      onChange={e => field.setter(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': field.color } as any}
                    />
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">tCO₂e</span>
                  </div>
                </div>
              ))}

              {/* Benchmark note */}
              <div className="p-3 rounded-xl flex items-start gap-2.5" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                <p className="text-xs" style={{ color: '#92400e' }}>
                  <strong>{t('carbon.benchmarkLabel', 'Benchmark sectoriel :')}</strong> {t('carbon.benchmarkNote', 'Le Scope 3 représente en moyenne 78% des émissions totales des entreprises. Vos émissions Scope 3 représentent actuellement {{pct}}%.', { pct: grandTotal > 0 ? scope3Pct.toFixed(0) : 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* SBTi Trajectory */}
          {grandTotal > 0 && (
            <div className="rounded-2xl border p-6" style={{ background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', borderColor: '#a7f3d0' }}>
              <div className="flex items-center gap-2 mb-5">
                <Target className="h-5 w-5" style={{ color: '#059669' }} />
                <h3 className="text-base font-bold text-gray-900">{t('carbon.sbtiTitle', 'Trajectoire de réduction — SBTi 1,5°C')}</h3>
                <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: onTrack ? '#dcfce7' : '#fef3c7', color: onTrack ? '#166534' : '#92400e' }}>
                  {onTrack ? t('carbon.onTrack', '✓ Sur la bonne trajectoire') : t('carbon.offTrack', '⚠ Efforts supplémentaires requis')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                  { label: t('carbon.sbtiCurrent', 'Empreinte actuelle'), value: fmt(grandTotal), unit: 'tCO₂e/an', color: '#374151', soft: '#f9fafb', border: '#e5e7eb' },
                  { label: t('carbon.sbtiTarget', 'Objectif SBTi 2030'), value: fmt(sbtiTarget2030), unit: t('carbon.sbtiTargetUnit', '−42% vs aujourd\'hui'), color: '#059669', soft: '#ecfdf5', border: '#a7f3d0' },
                  { label: t('carbon.sbtiReduction', 'Réduction à réaliser'), value: fmt(requiredReduction), unit: t('carbon.sbtiReductionUnit', "tCO₂e à éliminer d'ici 2030"), color: onTrack ? '#059669' : '#d97706', soft: onTrack ? '#ecfdf5' : '#fffbeb', border: onTrack ? '#a7f3d0' : '#fde68a' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: s.soft, border: `1px solid ${s.border}` }}>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: s.color }}>{s.unit}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{t('carbon.sbtiProgress', "Progression vers l'objectif 2030")}</span>
                  <span className="font-bold" style={{ color: '#059669' }}>{t('carbon.sbtiProgressBaseline', 'Baseline établie — démarrez les réductions')}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#d1fae5' }}>
                  <div className="h-3 rounded-full transition-all duration-700"
                    style={{ width: '5%', background: 'linear-gradient(90deg, #059669, #10b981)' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  {t('carbon.sbtiNote', "Science-Based Targets initiative (SBTi) — trajectoire 1,5°C, réduction cumulée −42% d'ici 2030 vs baseline")}
                </p>
              </div>
            </div>
          )}

          {/* Top Scope 3 categories bar chart */}
          {scope3Total > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <h3 className="text-base font-bold text-gray-900">{t('carbon.topCatsTitle', 'Top catégories Scope 3')}</h3>
                <span className="text-xs text-gray-400">{t('carbon.topCatsCount', '{{n}} sur 15 renseignées', { n: completedCount })}</span>
                <button onClick={() => setActiveTab('decomposition')}
                  className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t('carbon.decompositionMore', 'Décomposition complète →')}
                </button>
              </div>
              <div className="space-y-3">
                {[...categories]
                  .filter(c => c.value !== null && c.value > 0)
                  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                  .slice(0, 8)
                  .map(c => {
                    const pct = scope3Total > 0 ? ((c.value ?? 0) / scope3Total) * 100 : 0;
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-gray-500 flex-shrink-0 text-right font-medium">{c.num}</div>
                        <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                          <div className="h-7 rounded-lg flex items-center px-3 transition-all duration-500 min-w-[56px]"
                            style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: c.softHex, border: `1px solid ${c.borderHex}` }}>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: c.hex }}>
                              {fmt(c.value ?? 0)} t
                            </span>
                          </div>
                        </div>
                        <div className="w-12 text-xs font-semibold text-gray-700 text-right tabular-nums">{pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Empty state when no data */}
          {grandTotal === 0 && (
            <div className="rounded-2xl border-2 border-dashed p-12 text-center" style={{ borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}>
              <Leaf className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: '#059669' }} />
              <h3 className="text-lg font-bold text-gray-800 mb-2">{t('carbon.noDataTitle', 'Aucune donnée pour {{year}}', { year })}</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
                {t('carbon.noDataDesc', "Commencez par renseigner vos Scope 1 & 2 ci-dessus, puis passez à l'onglet « 15 catégories Scope 3 » pour compléter votre bilan carbone.")}
              </p>
              <button onClick={() => setActiveTab('scope3')}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#059669' }}>
                {t('carbon.noDataCta', 'Saisir les 15 catégories Scope 3 →')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: DECOMPOSITION SCOPE 3                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'decomposition' && (() => {
        const allSorted = [...categories].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        const upstreamCats = categories.filter(c => c.upstream);
        const downstreamCats = categories.filter(c => !c.upstream);
        const upstreamTotal = upstreamCats.reduce((s, c) => s + (c.value ?? 0), 0);
        const downstreamTotal = downstreamCats.reduce((s, c) => s + (c.value ?? 0), 0);
        const maxVal = allSorted.length > 0 ? (allSorted[0].value ?? 0) : 0;

        return (
          <div className="space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: t('carbon.decompUpstreamKpi', 'Émissions amont (Cat. 1–8)'), value: upstreamTotal, color: '#059669', soft: '#ecfdf5', border: '#a7f3d0', pct: scope3Total > 0 ? (upstreamTotal / scope3Total * 100) : 0, icon: '⬆' },
                { label: t('carbon.decompDownstreamKpi', 'Émissions aval (Cat. 9–15)'), value: downstreamTotal, color: '#3b82f6', soft: '#eff6ff', border: '#bfdbfe', pct: scope3Total > 0 ? (downstreamTotal / scope3Total * 100) : 0, icon: '⬇' },
                { label: t('carbon.decompTotalKpi', 'Total Scope 3'), value: scope3Total, color: '#7c3aed', soft: '#f5f3ff', border: '#ddd6fe', pct: 100, icon: '∑' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-5" style={{ backgroundColor: k.soft, border: `1px solid ${k.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{k.icon}</span>
                    <span className="text-xs font-semibold text-gray-600">{k.label}</span>
                  </div>
                  <p className="text-3xl font-bold tabular-nums" style={{ color: k.color }}>{fmt(k.value)}</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: k.color }}>tCO₂e · {k.pct.toFixed(1)}{t('carbon.pctScope3Suffix', '% du Scope 3')}</p>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {scope3Total === 0 && (
              <div className="rounded-2xl border-2 border-dashed p-12 text-center" style={{ borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}>
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: '#059669' }} />
                <p className="text-sm text-gray-500">{t('carbon.decompEmptyDesc', 'Saisissez des données Scope 3 pour voir la décomposition par catégorie.')}</p>
                <button onClick={() => setActiveTab('scope3')}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#059669' }}>
                  {t('carbon.decompEmptyCta', 'Saisir les catégories →')}
                </button>
              </div>
            )}

            {/* Ranked bar chart — ALL 15 categories */}
            {scope3Total > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-5 w-5 text-gray-500" />
                  <h3 className="text-base font-bold text-gray-900">{t('carbon.decompChartTitle', 'Classement des 15 catégories GHG Protocol')}</h3>
                </div>
                <p className="text-xs text-gray-400 mb-6 ml-7">{t('carbon.decompChartSub', 'Triées par contribution décroissante · Facteurs ADEME / GHG Protocol')}</p>

                <div className="space-y-2.5">
                  {allSorted.map((cat, idx) => {
                    const Icon = cat.icon;
                    const val = cat.value ?? 0;
                    const pct = scope3Total > 0 ? (val / scope3Total) * 100 : 0;
                    const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    const hasValue = cat.value !== null;
                    return (
                      <div key={cat.id} className="grid items-center gap-3"
                        style={{ gridTemplateColumns: '1.5rem 6rem 1fr 5rem 3.5rem' }}>
                        {/* rank */}
                        <span className="text-xs font-bold text-gray-400 text-right">#{idx + 1}</span>
                        {/* label */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: hasValue ? cat.softHex : '#f9fafb' }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: hasValue ? cat.hex : '#d1d5db' }} />
                          </div>
                          <span className="text-xs font-semibold truncate" style={{ color: hasValue ? '#111827' : '#9ca3af' }}>
                            {cat.num}
                          </span>
                        </div>
                        {/* bar track */}
                        <div className="relative h-7 rounded-lg overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                          {hasValue && (
                            <div className="h-7 rounded-lg flex items-center gap-2 px-3 transition-all duration-700"
                              style={{
                                width: `${Math.max(barPct, 4)}%`,
                                backgroundColor: cat.softHex,
                                border: `1px solid ${cat.borderHex}`,
                              }}>
                              <span className="text-xs font-bold whitespace-nowrap" style={{ color: cat.hex }}>
                                {cat.name.length > 20 ? cat.name.slice(0, 20) + '…' : cat.name}
                              </span>
                            </div>
                          )}
                          {!hasValue && (
                            <div className="h-7 flex items-center px-3">
                              <span className="text-xs text-gray-300 italic">{cat.name}{t('carbon.notEntered', ' — non renseigné')}</span>
                            </div>
                          )}
                        </div>
                        {/* tCO2e */}
                        <div className="text-right">
                          <span className="text-sm font-bold tabular-nums"
                            style={{ color: hasValue ? '#111827' : '#d1d5db' }}>
                            {hasValue ? fmt(val) : '—'}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">t</span>
                        </div>
                        {/* % */}
                        <div className="text-right">
                          <span className="text-xs font-semibold tabular-nums"
                            style={{ color: hasValue ? cat.hex : '#d1d5db' }}>
                            {hasValue ? pct.toFixed(1) + '%' : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upstream vs Downstream breakdown */}
            {scope3Total > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                  { label: t('carbon.decompUpstreamGroup', '⬆ Émissions amont'), cats: upstreamCats, total: upstreamTotal, color: '#059669', soft: '#ecfdf5', border: '#a7f3d0' },
                  { label: t('carbon.decompDownstreamGroup', '⬇ Émissions aval'), cats: downstreamCats, total: downstreamTotal, color: '#3b82f6', soft: '#eff6ff', border: '#bfdbfe' },
                ].map(group => (
                  <div key={group.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-base font-bold text-gray-900">{group.label}</h3>
                      <span className="text-sm font-bold tabular-nums px-3 py-1 rounded-full"
                        style={{ backgroundColor: group.soft, color: group.color }}>
                        {fmt(group.total)} tCO₂e
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[...group.cats].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map(cat => {
                        const Icon = cat.icon;
                        const val = cat.value ?? 0;
                        const pct = group.total > 0 ? (val / group.total) * 100 : 0;
                        const hasValue = cat.value !== null;
                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                                  style={{ backgroundColor: hasValue ? cat.softHex : '#f9fafb' }}>
                                  <Icon className="h-3 w-3" style={{ color: hasValue ? cat.hex : '#d1d5db' }} />
                                </div>
                                <span className="font-semibold" style={{ color: hasValue ? '#374151' : '#9ca3af' }}>
                                  {cat.num} {cat.name.length > 26 ? cat.name.slice(0, 26) + '…' : cat.name}
                                </span>
                              </div>
                              <span className="font-bold tabular-nums" style={{ color: hasValue ? cat.hex : '#d1d5db' }}>
                                {hasValue ? `${fmt(val)} t` : '—'}
                              </span>
                            </div>
                            <div className="h-2 rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
                              {hasValue && (
                                <div className="h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: cat.hex }} />
                              )}
                            </div>
                            {hasValue && (
                              <p className="text-right text-xs tabular-nums" style={{ color: '#9ca3af' }}>
                                {pct.toFixed(1)}{t('carbon.pctGroup', '% du groupe')}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completeness summary */}
            <div className="rounded-2xl p-5 flex flex-wrap items-center gap-6"
              style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #a7f3d0' }}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#059669' }}>
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{t('carbon.decompFilledLabel', 'Catégories renseignées')}</p>
                  <p className="text-3xl font-bold" style={{ color: '#059669' }}>{completedCount}<span className="text-lg text-gray-400">/15</span></p>
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{t('carbon.decompCompletenessLabel', 'Complétude Scope 3')}</span>
                  <span className="font-bold" style={{ color: '#059669' }}>{completenessRate}%</span>
                </div>
                <div className="h-3 rounded-full" style={{ backgroundColor: '#d1fae5' }}>
                  <div className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${completenessRate}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('carbon.decompRemaining', '{{n}} catégories restantes · source GHG Protocol Scope 3 Standard', { n: 15 - completedCount })}
                </p>
              </div>
              <button onClick={() => setActiveTab('scope3')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#059669' }}>
                {t('carbon.decompCompleteCta', 'Compléter →')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: 15 SCOPE 3 CATEGORIES                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scope3' && (
        <div className="space-y-5">

          {/* Progress banner */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-gray-700">{t('carbon.scope3CompletenessLabel', 'Complétude Scope 3')}</span>
                  <span className="font-bold tabular-nums" style={{ color: '#059669' }}>
                    {t('carbon.scope3Progress', '{{n}} / 15 catégories — {{pct}}%', { n: completedCount, pct: completenessRate })}
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                  <div className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completenessRate}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                </div>
              </div>
              <div className="flex gap-5 text-sm">
                <div className="flex items-center gap-1.5 font-medium" style={{ color: '#059669' }}>
                  <CheckCircle className="h-4 w-4" />{t('carbon.scope3Completed', '{{n}} complétées', { n: completedCount })}
                </div>
                <div className="flex items-center gap-1.5 font-medium" style={{ color: '#d97706' }}>
                  <Clock className="h-4 w-4" />{t('carbon.scope3Remaining', '{{n}} restantes', { n: 15 - completedCount })}
                </div>
                {aiAvailable > 0 && (
                  <div className="flex items-center gap-1.5 font-medium" style={{ color: '#7c3aed' }}>
                    <Sparkles className="h-4 w-4" />{t('carbon.scope3AIAvail', '{{n}} estimations IA disponibles', { n: aiAvailable })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upstream / Downstream toggle */}
          <div className="flex gap-2">
            {[
              { val: true,  label: t('carbon.scope3ToggleUpstream', '⬆ Émissions amont (Cat. 1→8)'),  count: categories.filter(c => c.upstream && c.value !== null).length, total: 8 },
              { val: false, label: t('carbon.scope3ToggleDownstream', '⬇ Émissions aval (Cat. 9→15)'), count: categories.filter(c => !c.upstream && c.value !== null).length, total: 7 },
            ].map(opt => (
              <button key={String(opt.val)} onClick={() => setShowUpstream(opt.val)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border`}
                style={showUpstream === opt.val
                  ? { backgroundColor: '#111827', color: 'white', borderColor: '#111827' }
                  : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }}>
                {opt.label}
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={showUpstream === opt.val
                    ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#374151' }}>
                  {opt.count}/{opt.total}
                </span>
              </button>
            ))}
          </div>

          {/* Category cards */}
          <div className="space-y-3">
            {filteredCategories.map(cat => {
              const Icon = cat.icon;
              const isExpanded = expandedId === cat.id;
              const pct = scope3Total > 0 && cat.value !== null ? ((cat.value / scope3Total) * 100) : 0;
              const status: 'done' | 'ai' | 'missing' = cat.value !== null ? 'done' : cat.aiEstimate !== null ? 'ai' : 'missing';

              return (
                <div key={cat.id}
                  className="bg-white rounded-2xl shadow-sm transition-all duration-200"
                  style={{
                    border: isExpanded ? `2px solid ${cat.borderHex}` : '1px solid #f3f4f6',
                    boxShadow: isExpanded ? `0 4px 20px -4px ${cat.hex}22` : undefined,
                  }}>

                  {/* Card header */}
                  <div className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : cat.id)}>

                    {/* Icon bubble */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.softHex }}>
                      <Icon className="h-5 w-5" style={{ color: cat.hex }} />
                    </div>

                    {/* Title + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cat.softHex, color: cat.hex }}>
                          {cat.num}
                        </span>
                        <span className="font-semibold text-gray-900 text-sm truncate">{cat.name}</span>
                        {status === 'done' && <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />}
                        {status === 'ai' && <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: '#7c3aed' }} />}
                        {status === 'missing' && <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />}
                      </div>

                      {/* Mini progress bar */}
                      {cat.value !== null && scope3Total > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full max-w-[160px]" style={{ backgroundColor: '#f3f4f6' }}>
                            <div className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cat.hex }} />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums">{pct.toFixed(1)}{t('carbon.pctScope3Suffix', '% du Scope 3')}</span>
                        </div>
                      )}
                    </div>

                    {/* Value display */}
                    <div className="text-right flex-shrink-0 mr-2">
                      {cat.value !== null ? (
                        <div>
                          <span className="text-lg font-bold text-gray-900 tabular-nums">{fmt(cat.value)}</span>
                          <span className="text-xs text-gray-400 ml-1">tCO₂e</span>
                        </div>
                      ) : cat.aiEstimate !== null ? (
                        <div>
                          <span className="text-sm font-medium tabular-nums" style={{ color: '#7c3aed' }}>~{fmt(cat.aiEstimate)}</span>
                          <span className="text-xs ml-1" style={{ color: '#7c3aed' }}>IA</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300 italic">—</span>
                      )}
                    </div>

                    {isExpanded
                      ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 space-y-4" style={{ borderTop: `1px solid ${cat.borderHex}` }}>
                      <p className="text-sm text-gray-600 leading-relaxed pt-4">{cat.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Value input */}
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                            {t('carbon.measuredValue', 'Valeur mesurée')} <InfoTooltip text={cat.tooltip} />
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number" min="0"
                              placeholder={cat.placeholder}
                              value={cat.value ?? ''}
                              onChange={e => updateValue(cat.id, e.target.value)}
                              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                              style={{ '--tw-ring-color': cat.hex } as any}
                            />
                            <span className="text-sm text-gray-500 font-medium">tCO₂e</span>
                          </div>
                        </div>

                        {/* ADEME factor */}
                        <div className="rounded-xl p-4" style={{ backgroundColor: cat.softHex, border: `1px solid ${cat.borderHex}` }}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                            {t('carbon.ademeFactorLabel', "Facteur d'émission ADEME")}
                          </p>
                          <p className="text-xl font-bold" style={{ color: cat.hex }}>{cat.ademe_factor}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{cat.ademe_unit}</p>
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{cat.tooltip}</p>
                        </div>
                      </div>

                      {/* AI suggestion */}
                      {cat.aiEstimate !== null && (
                        <div className="flex items-center gap-4 p-4 rounded-xl"
                          style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                          <Sparkles className="h-5 w-5 flex-shrink-0" style={{ color: '#7c3aed' }} />
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: '#6d28d9' }}>{t('carbon.aiEstimateTitle', 'Estimation IA disponible')}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#7c3aed' }}>
                              {t('carbon.aiEstimateDesc', 'Valeur estimée :')} <strong>{fmt(cat.aiEstimate!)} tCO₂e</strong>{t('carbon.aiEstimateSrc', ' — basée sur vos données sectorielles')}
                            </p>
                          </div>
                          <button onClick={() => applyAI(cat.id)} disabled={applyingAI === cat.id}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                            style={{ backgroundColor: '#7c3aed' }}>
                            {applyingAI === cat.id
                              ? <RefreshCw className="h-4 w-4 animate-spin" />
                              : <Sparkles className="h-4 w-4" />}
                            {t('carbon.applyBtn', 'Appliquer')}
                          </button>
                        </div>
                      )}

                      {/* Status banners */}
                      {cat.aiEstimate === null && cat.value === null && (
                        <div className="flex items-center gap-3 p-3 rounded-xl text-sm"
                          style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
                          {t('carbon.noAIBanner', 'Aucune estimation IA disponible — saisie manuelle requise (données trop spécifiques à votre secteur).')}
                        </div>
                      )}
                      {cat.value !== null && (
                        <div className="flex items-center gap-3 p-3 rounded-xl text-sm"
                          style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }}>
                          <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
                          <span>
                            {t('carbon.catFilled', 'Catégorie renseignée —')} <strong>{fmt(cat.value)} tCO₂e</strong>
                            {scope3Total > 0 && <> · <strong>{pct.toFixed(1)}%</strong> {t('carbon.ofScope3Total', 'du total Scope 3')}</>}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          <div className="rounded-2xl p-6 text-white"
            style={{ background: 'linear-gradient(135deg, #064e3b, #047857)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <p className="text-emerald-300 text-sm font-medium mb-1">{t('carbon.footerScope3Total', 'Total Scope 3 saisi')}</p>
                <p className="text-4xl font-bold tabular-nums">
                  {fmt(scope3Total)} <span className="text-xl text-emerald-300">tCO₂e</span>
                </p>
                <p className="text-emerald-400 text-sm mt-1">
                  {t('carbon.footerCatCount', '{{n}} catégories sur 15 complétées', { n: completedCount })}
                  {aiAvailable > 0 && ` · ${t('carbon.footerAICount', '{{n}} estimations IA disponibles', { n: aiAvailable })}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiAvailable > 0 && (
                  <button onClick={applyAllAI}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white' }}>
                    <Sparkles className="h-4 w-4" />
                    {t('carbon.applyAllAI', "Compléter avec l'IA ({{n}})", { n: aiAvailable })}
                  </button>
                )}
                <button onClick={saveScope3} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#10b981', color: 'white' }}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {saving ? t('carbon.saving', 'Sauvegarde...') : t('carbon.saveDB', 'Sauvegarder en DB')}
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ backgroundColor: 'white', color: '#064e3b' }}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: SANKEY SCOPE 3                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sankey' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-bold text-gray-900">{t('carbon.sankeyTitle', 'Flux Sankey — Scope 3 par catégorie')}</h3>
          </div>
          {scope3Total > 0
            ? <SankeyScope3 categories={categories} total={scope3Total} />
            : <p className="text-gray-400 text-sm">{t('carbon.sankeyEmpty', 'Aucune donnée Scope 3 saisie.')}</p>
          }
        </div>
      )}
    </div>
  );
}
