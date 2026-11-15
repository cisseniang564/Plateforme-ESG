import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  Flame, Zap, Package, Truck, Trash2, Briefcase, Users, Home,
  ArrowDownRight, Settings, ShoppingBag, BarChart3, Leaf, Download,
  AlertTriangle, CheckCircle, ChevronDown, Info, TrendingUp, Target, Upload,
} from 'lucide-react';
import { Badge, Button, EmptyState } from '@/components/common';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Scope3Category {
  id: number;
  num: string;
  name: string;
  description: string;
  icon: any;
  upstream: boolean;
  ademe_unit: string;
  placeholder: string;
  tooltip: string;
  value: number | null;
  hex: string; // couleur de la catégorie (styles inline : pas de purge Tailwind)
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────
// Deux familles seulement : vert pour l'amont (Cat. 1–8), bleu pour l'aval (Cat. 9–15).
// Les nuances vont du plus foncé au plus clair pour garder les catégories lisibles côte à côte.
const UPSTREAM_SHADES = ['#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
const DOWNSTREAM_SHADES = ['#0c4a6e', '#075985', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'];
const CAT_COLORS: Record<number, { hex: string }> = Object.fromEntries(
  Array.from({ length: 15 }, (_, i) => [i + 1, { hex: i < 8 ? UPSTREAM_SHADES[i] : DOWNSTREAM_SHADES[i - 8] }]),
);

/** Couleurs des trois scopes, dans la même famille verte que la marque. */
const SCOPE_COLORS = { s1: '#064e3b', s2: '#059669', s3: '#6ee7b7' } as const;

// ─── Static data ───────────────────────────────────────────────────────────────
const initialCategories: Scope3Category[] = [
  {
    id: 1, num: 'Cat. 1', name: 'Achats de biens & services', upstream: true,
    description: 'Émissions liées à la production des biens et services achetés par l\'entreprise (matières premières, fournitures, sous-traitance...)',
    icon: ShoppingBag, ademe_unit: 'kgCO₂e/€ d\'achats',
    placeholder: 'ex : 1 250', tooltip: 'Repère : Base Empreinte® ADEME — Facteur moyen tous secteurs confondus',
    value: null, ...CAT_COLORS[1],
  },
  {
    id: 2, num: 'Cat. 2', name: 'Biens d\'équipement (immobilisations)', upstream: true,
    description: 'Émissions associées à la fabrication des biens d\'équipements utilisés (machines, bâtiments, véhicules...)',
    icon: Settings, ademe_unit: 'kgCO₂e/€ d\'immobilisations',
    placeholder: 'ex : 340', tooltip: 'Repère : Base Empreinte® ADEME — Secteur équipements industriels',
    value: null, ...CAT_COLORS[2],
  },
  {
    id: 3, num: 'Cat. 3', name: 'Activités liées à l\'énergie', upstream: true,
    description: 'Émissions en amont de la production d\'énergie (extraction, raffinage, transport du gaz/fioul), non incluses en Scope 1 & 2',
    icon: Zap, ademe_unit: 'kgCO₂e/kWh énergie',
    placeholder: 'ex : 45', tooltip: 'Repère : ADEME / RTE — Facteur résidu réseau électrique français',
    value: null, ...CAT_COLORS[3],
  },
  {
    id: 4, num: 'Cat. 4', name: 'Transport & distribution amont', upstream: true,
    description: 'Transport des matières premières et marchandises vers l\'entreprise (fret routier, maritime, aérien, ferroviaire)',
    icon: Truck, ademe_unit: 'kgCO₂e/tonne.km',
    placeholder: 'ex : 180', tooltip: 'Repère : Base Empreinte® ADEME — Poids lourd <26t, gazole Euro VI',
    value: null, ...CAT_COLORS[4],
  },
  {
    id: 5, num: 'Cat. 5', name: 'Déchets générés par l\'exploitation', upstream: true,
    description: 'Traitement des déchets produits par les opérations internes (déchets ménagers, industriels, dangereux...)',
    icon: Trash2, ademe_unit: 'kgCO₂e/tonne de déchets',
    placeholder: 'ex : 22', tooltip: 'Repère : ADEME — Enfouissement centre de stockage déchets ménagers',
    value: null, ...CAT_COLORS[5],
  },
  {
    id: 6, num: 'Cat. 6', name: 'Déplacements professionnels', upstream: true,
    description: 'Voyages d\'affaires (avion, train, voiture de location, taxi) effectués par les employés',
    icon: Briefcase, ademe_unit: 'kgCO₂e/km (avion court-courrier)',
    placeholder: 'ex : 95', tooltip: 'Repère : ADEME — Avion court-courrier classe éco, incluant traînées condensation ×2',
    value: null, ...CAT_COLORS[6],
  },
  {
    id: 7, num: 'Cat. 7', name: 'Trajets domicile-travail', upstream: true,
    description: 'Émissions des déplacements quotidiens des salariés entre leur domicile et leur lieu de travail',
    icon: Users, ademe_unit: 'kgCO₂e/km (voiture thermique moy.)',
    placeholder: 'ex : 140', tooltip: 'Repère : ADEME — Véhicule particulier thermique moyen France 2023',
    value: null, ...CAT_COLORS[7],
  },
  {
    id: 8, num: 'Cat. 8', name: 'Actifs en leasing (amont)', upstream: true,
    description: 'Émissions opérationnelles des biens loués par l\'entreprise (immeubles, équipements, véhicules de fonction)',
    icon: Home, ademe_unit: 'kgCO₂e/m².an (bâtiment RT2012)',
    placeholder: 'ex : 35', tooltip: 'Repère : ADEME — Bâtiment tertiaire chauffage gaz, norme RT2012',
    value: null, ...CAT_COLORS[8],
  },
  {
    id: 9, num: 'Cat. 9', name: 'Transport & distribution aval', upstream: false,
    description: 'Transport des produits vendus vers les clients finaux (fret et logistique aval)',
    icon: ArrowDownRight, ademe_unit: 'kgCO₂e/tonne.km',
    placeholder: 'ex : 210', tooltip: 'Repère : Base Empreinte® ADEME — Poids lourd <26t, gazole Euro VI',
    value: null, ...CAT_COLORS[9],
  },
  {
    id: 10, num: 'Cat. 10', name: 'Traitement des produits vendus', upstream: false,
    description: 'Traitement et transformation des produits intermédiaires vendus par des tiers avant usage final',
    icon: Settings, ademe_unit: 'kgCO₂e/tonne transformée',
    placeholder: 'ex : 65', tooltip: 'Repère : Estimation GHG Protocol — Processus de transformation standard',
    value: null, ...CAT_COLORS[10],
  },
  {
    id: 11, num: 'Cat. 11', name: 'Utilisation des produits vendus', upstream: false,
    description: 'Émissions générées lors de l\'utilisation des produits par les clients (électricité consommée, carburant, etc.)',
    icon: Flame, ademe_unit: 'kgCO₂e/litre carburant utilisé',
    placeholder: 'ex : 4 200', tooltip: 'Repère : ADEME — Gazole usage, facteur CO₂ seul (hors ACV)',
    value: null, ...CAT_COLORS[11],
  },
  {
    id: 12, num: 'Cat. 12', name: 'Fin de vie des produits vendus', upstream: false,
    description: 'Traitement en fin de vie des produits vendus (recyclage, enfouissement, incinération)',
    icon: Trash2, ademe_unit: 'kgCO₂e/tonne en fin de vie',
    placeholder: 'ex : 80', tooltip: 'Repère : ADEME — Mix de traitement déchets ménagers France',
    value: null, ...CAT_COLORS[12],
  },
  {
    id: 13, num: 'Cat. 13', name: 'Actifs en leasing (aval)', upstream: false,
    description: 'Émissions des biens loués par l\'entreprise à d\'autres entités (locataires, clients)',
    icon: Package, ademe_unit: 'kgCO₂e/m².an',
    placeholder: 'ex : 15', tooltip: 'Repère : ADEME — Bâtiment tertiaire chauffage gaz, norme RT2012',
    value: null, ...CAT_COLORS[13],
  },
  {
    id: 14, num: 'Cat. 14', name: 'Franchises', upstream: false,
    description: 'Émissions opérationnelles des franchisés (non consolidées dans le Scope 1 & 2 de la maison mère)',
    icon: BarChart3, ademe_unit: 'kgCO₂e/€ d\'achats franchisés',
    placeholder: 'ex : 520', tooltip: 'Repère : Estimation GHG Protocol — Calquée sur Scope 1+2 moyen des franchisés',
    value: null, ...CAT_COLORS[14],
  },
  {
    id: 15, num: 'Cat. 15', name: 'Investissements', upstream: false,
    description: 'Émissions des participations financières, prêts et investissements en capital (financed emissions)',
    icon: TrendingUp, ademe_unit: 'kgCO₂e/k€ investi',
    placeholder: 'ex : 280', tooltip: 'Repère : PCAF Standard — Financed Emissions Equity & Bonds (pondéré par intensité)',
    value: null, ...CAT_COLORS[15],
  },
];


function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

// ─── Sankey Scope 3 ───────────────────────────────────────────────────────────
function SankeyScope3({ categories, total }: { categories: Scope3Category[]; total: number }) {
  const active = [...categories]
    .filter(c => (c.value ?? 0) > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

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
    const cpX = 330;
    const path = [
      `M 120 ${leftBandStart}`,
      `C ${cpX} ${leftBandStart} ${cpX} ${rightNodeY + rightNodeH / 2} 540 ${rightNodeY}`,
      `L 540 ${rightNodeY + rightNodeH}`,
      `C ${cpX} ${rightNodeY + rightNodeH} ${cpX} ${leftBandEnd} 120 ${leftBandEnd}`,
      'Z',
    ].join(' ');
    return { cat, path, rightNodeY, rightNodeH };
  });

  return (
    <svg viewBox="0 0 860 500" width="100%" className="block text-gray-900" role="img"
      aria-label={`Scope 3 : ${fmt(total)} tCO₂e répartis sur ${active.length} catégorie(s)`}>
      <rect x={0} y={startY} width={120} height={totalH} rx={8} fill="#047857" />
      <text x={60} y={startY + totalH / 2 - 6} textAnchor="middle" fill="white" fontSize={13} fontWeight="600">Scope 3</text>
      <text x={60} y={startY + totalH / 2 + 14} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={11}>
        {fmt(total)} tCO₂e
      </text>
      {nodes.map(n => (
        <path key={n.cat.id} d={n.path} fill={n.cat.hex} opacity={0.6}>
          <title>{`${n.cat.num} ${n.cat.name} : ${fmt(n.cat.value!)} tCO₂e`}</title>
        </path>
      ))}
      {nodes.map(n => (
        <g key={`node-${n.cat.id}`}>
          <rect x={540} y={n.rightNodeY} width={10} height={n.rightNodeH} rx={2} fill={n.cat.hex} />
          {n.rightNodeH >= 9 && (
            <text x={558} y={n.rightNodeY + n.rightNodeH / 2 + 4} fill="currentColor" fontSize={n.rightNodeH >= 16 ? 12 : 10}>
              <tspan fontWeight="600">{n.cat.num}</tspan>
              <tspan dx={6} opacity={0.7}>{n.cat.name.length > 28 ? n.cat.name.slice(0, 27) + '…' : n.cat.name}</tspan>
              <tspan dx={6} fontWeight="600">{fmt(n.cat.value!)} t</tspan>
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Barre fine qui se remplit au chargement (sans animation si l'utilisateur réduit les mouvements). */
function Meter({ pct, color, label, height = 'h-2' }: { pct: number; color: string; label: string; height?: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className={`${height} rounded-full bg-gray-100`} role="img" aria-label={label}>
      <div className={`${height} rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out`}
        style={{ width: shown ? `${Math.max(0, Math.min(pct, 100))}%` : '0%', background: color }} />
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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [savingS12, setSavingS12] = useState(false);
  const [hasRealData, setHasRealData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decompFilter, setDecompFilter] = useState<'all' | 'up' | 'down'>('all');

  // ── Load real data from backend ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    // Repart d'une page vierge à chaque changement d'exercice (sinon les valeurs
    // de l'année précédente restent affichées sous la nouvelle année).
    setCategories(initialCategories);
    setScope1(0);
    setScope2(0);
    setHasRealData(false);
    setLoadError(false);
    api.get('/carbon/scope-summary', { params: { year } })
      .then(res => {
        if (cancelled) return;
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
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [year, reloadKey]);

  // ── Derived values ─────────────────────────────────────────────────────────────
  const scope3Total = useMemo(() => categories.reduce((acc, c) => acc + (c.value ?? 0), 0), [categories]);
  const grandTotal = scope1 + scope2 + scope3Total;
  const completedCount = categories.filter(c => c.value !== null).length;
  const completenessRate = Math.round((completedCount / 15) * 100);

  // Repère SBTi (trajectoire 1,5 °C) : −4,2 %/an sur les Scopes 1+2, linéaire
  // jusqu'en 2030. Repère méthodologique, pas un engagement validé.
  const scope3Pct = grandTotal > 0 ? (scope3Total / grandTotal) * 100 : 0;
  const scope12 = scope1 + scope2;
  const yearsTo2030 = Math.max(0, 2030 - year);
  const sbtiTarget2030 = Math.round(scope12 * Math.max(0, 1 - 0.042 * yearsTo2030));
  const requiredReduction = Math.max(0, scope12 - sbtiTarget2030);

  // Répartition des trois scopes
  const donutParts = grandTotal > 0 ? [
    { key: 's1', label: t('carbon.kpiScope1Label', 'Scope 1 — Direct'), sub: t('carbon.kpiScope1Sub', 'Combustion propre, fugitifs'), value: scope1, pct: (scope1 / grandTotal) * 100, color: SCOPE_COLORS.s1 },
    { key: 's2', label: t('carbon.kpiScope2Label', 'Scope 2 — Énergie'), sub: t('carbon.kpiScope2Sub', 'Électricité, chaleur achetée'), value: scope2, pct: (scope2 / grandTotal) * 100, color: SCOPE_COLORS.s2 },
    { key: 's3', label: t('carbon.kpiScope3Label', 'Scope 3 — Indirect'), sub: t('carbon.kpiScope3Sub', '{{done}}/15 catégories saisies', { done: completedCount }), value: scope3Total, pct: (scope3Total / grandTotal) * 100, color: SCOPE_COLORS.s3 },
  ] : [];

  const filteredCategories = categories.filter(c => c.upstream === showUpstream);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const updateValue = (id: number, raw: string) => {
    const num = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
    setCategories(prev => prev.map(c => c.id === id ? { ...c, value: isNaN(num) ? null : num } : c));
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
          unit: 'tCO2e',
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

  const saveScope12 = async () => {
    setSavingS12(true);
    try {
      await api.post('/carbon/save-scope12', { year, scope1, scope2 });
      toast.success(t('carbon.toastScope12Saved', 'Scope 1 et 2 enregistrés pour {{year}}', { year }));
      setHasRealData(scope1 > 0 || scope2 > 0 || scope3Total > 0);
    } catch {
      toast.error(t('carbon.toastSaveError', 'Erreur lors de la sauvegarde. Réessayez.'));
    } finally {
      setSavingS12(false);
    }
  };

  const exportCSV = () => {
    const header = ['Catégorie', 'Nom', 'Type', 'tCO₂e', 'Statut', 'Unité de calcul usuelle'];
    const rows = categories.map(c => [
      c.num, c.name, c.upstream ? 'Amont' : 'Aval',
      c.value ?? '', c.value !== null ? 'Complété' : 'Non renseigné',
      c.ademe_unit,
    ]);
    const esc = (v: unknown) => {
      let x = String(v ?? '');
      if (/^[=+\-@]/.test(x)) x = "'" + x; // neutralise l'injection de formule Excel
      return /[";\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    };
    const csv = [header, ...rows].map(r => r.map(esc).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bilan-carbone-scope3-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t('carbon.toastCsvExported', 'Export CSV téléchargé'));
  };

  const exportBeges = async () => {
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
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const card = 'rounded-2xl border border-gray-200 bg-white';
  const sectionTitle = 'text-[15px] font-semibold text-gray-900';
  const sectionHint = 'mt-0.5 text-[13px] text-gray-500';
  const link = 'inline-flex items-center gap-1 rounded text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300';
  const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] font-medium tabular-nums text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20';
  const pctOf = (v: number, base: number) => (base > 0 ? (v / base) * 100 : 0);
  const upstreamDone = categories.filter(c => c.upstream && c.value !== null).length;
  const downstreamDone = categories.filter(c => !c.upstream && c.value !== null).length;
  const tabs = [
    { key: 'overview' as const,      label: t('carbon.tabOverviewPlain', 'Vue d’ensemble') },
    { key: 'scope3' as const,        label: t('carbon.tabScope3Plain', 'Saisie Scope 3') },
    { key: 'decomposition' as const, label: t('carbon.tabDecompositionPlain', 'Décomposition') },
    { key: 'sankey' as const,        label: t('carbon.tabSankeyPlain', 'Flux') },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">

      {/* ── En-tête ── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
            <label htmlFor="carbon-year">{t('carbon.yearLabel', 'Exercice')}</label>
            <select id="carbon-year" value={year} onChange={e => setYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white py-1 pl-2.5 pr-7 text-[13px] font-semibold text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20">
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {hasRealData
              ? <Badge tone="success" dot>{t('carbon.statusSaved', 'Données enregistrées')}</Badge>
              : <Badge tone="neutral">{t('carbon.pillEmpty', 'Aucune donnée {{year}}', { year })}</Badge>}
          </div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-[28px]">
            {t('carbon.titlePlain', 'Bilan carbone')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            {t('carbon.subtitlePlain', 'Scopes 1, 2 et 3 selon le GHG Protocol. Les facteurs proposés sont indicatifs : confrontez-les à la Base Empreinte® de l’ADEME.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:flex-none lg:flex-nowrap">
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCSV}>CSV</Button>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportBeges}
            title={t('carbon.begesHint', 'Export de travail pour préparer la déclaration BEGES : à vérifier et compléter avant tout dépôt sur bilans-ges.ademe.fr')}>
            BEGES.xlsx
          </Button>
          <Button icon={<Upload className="h-4 w-4" />} onClick={() => navigate('/app/carbon/fec-wizard')}
            title={t('carbon.fecHint', 'Calcul du Scope 3 depuis votre Fichier des Écritures Comptables')}>
            {t('carbon.importFECPlain', 'Importer un FEC')}
          </Button>
        </div>
      </header>

      {/* ── Onglets ── */}
      <div role="tablist" aria-label={t('carbon.tabsLabel', 'Vues du bilan carbone')}
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-gray-200 px-1">
        {tabs.map(tab => {
          const on = activeTab === tab.key;
          return (
            <button key={tab.key} role="tab" aria-selected={on} onClick={() => setActiveTab(tab.key)}
              className={`relative whitespace-nowrap px-3 pb-3 pt-1 text-sm font-medium transition-colors ${on ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>
              {tab.label}
              <span className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-colors ${on ? 'bg-emerald-600' : 'bg-transparent'}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{t('carbon.loadError', 'Impossible de charger vos données {{year}}. Ce que vous voyez peut être incomplet.', { year })}</span>
          <button onClick={() => setReloadKey(k => k + 1)} className="font-semibold underline">{t('carbon.retry', 'Réessayer')}</button>
        </div>
      )}

      {/* ══ Vue d'ensemble ══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Total et répartition par scope */}
          <section className={`${card} p-6`} aria-label={t('carbon.kpiTotalLabel', 'Total GES')}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-600">{t('carbon.totalHeading', 'Émissions totales {{year}}', { year })}</h2>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-[44px] font-semibold leading-none tracking-tight tabular-nums text-gray-900">{fmt(grandTotal)}</span>
                  <span className="text-base text-gray-500">tCO₂e</span>
                </p>
              </div>
              {scope3Total > 0 && (
                <p className="text-[13px] text-gray-500">
                  {t('carbon.scope3Share', 'Le Scope 3 représente {{pct}} % de votre bilan saisi.', { pct: scope3Pct.toFixed(0) })}
                </p>
              )}
            </div>

            {grandTotal > 0 ? (
              <>
                <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-gray-100" role="img"
                  aria-label={donutParts.map(p => `${p.label} ${p.pct.toFixed(1)} %`).join(', ')}>
                  {donutParts.filter(p => p.value > 0).map(p => (
                    <span key={p.key} style={{ flexGrow: p.value, background: p.color }} className="border-r-2 border-white last:border-r-0 dark:border-gray-900" />
                  ))}
                </div>
                <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {donutParts.map(p => (
                    <div key={p.key} className="min-w-0">
                      <dt className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: p.color }} aria-hidden="true" />
                        {p.label}
                      </dt>
                      <dd className="mt-1.5">
                        <span className="text-2xl font-semibold tabular-nums text-gray-900">{fmt(p.value)}</span>
                        <span className="ml-1 text-xs text-gray-500">tCO₂e</span>
                        <span className="ml-2 text-[13px] tabular-nums text-gray-500">{p.pct.toFixed(1)} %</span>
                      </dd>
                      <dd className="mt-0.5 text-xs text-gray-500">{p.sub}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-500">{t('carbon.emissionsChartEmpty', 'Saisissez des données pour voir le graphique')}</p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Saisie Scope 1 & 2 */}
            <section className={`${card} p-6`}>
              <h2 className={sectionTitle}>{t('carbon.scope12DirectEntry', 'Scope 1 & 2 — Saisie directe')}</h2>
              <p className={sectionHint}>{t('carbon.scope12Desc', 'Renseignez vos émissions directes et énergie achetée pour compléter le bilan total.')}</p>
              <div className="mt-5 space-y-4">
                {[
                  { id: 'scope1-input', label: t('carbon.scope1FullLabel', 'Scope 1 — Émissions directes'), desc: t('carbon.scope1Desc', 'Combustion de combustibles, procédés industriels, fuites réfrigérants'), value: scope1, setter: setScope1, color: SCOPE_COLORS.s1 },
                  { id: 'scope2-input', label: t('carbon.scope2FullLabel', 'Scope 2 — Énergie achetée'), desc: t('carbon.scope2Desc', 'Électricité, chaleur, vapeur et froid achetés à des tiers'), value: scope2, setter: setScope2, color: SCOPE_COLORS.s2 },
                ].map(field => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: field.color }} aria-hidden="true" />
                      {field.label}
                    </label>
                    <p id={`${field.id}-desc`} className="mt-0.5 text-xs text-gray-500">{field.desc}</p>
                    <div className="relative mt-2">
                      <input id={field.id} aria-describedby={`${field.id}-desc`} type="number" min="0" inputMode="decimal"
                        value={field.value || ''} onChange={e => field.setter(parseFloat(e.target.value) || 0)}
                        placeholder="0" className={`${input} pr-16`} />
                      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-gray-500">tCO₂e</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Button fullWidth loading={savingS12} disabled={savingS12} icon={<CheckCircle className="h-4 w-4" />} onClick={saveScope12}>
                  {t('carbon.saveScope12', 'Enregistrer Scope 1 & 2')}
                </Button>
              </div>
            </section>

            {/* Repère de réduction 1,5 °C */}
            <section className={`${card} p-6`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`${sectionTitle} flex items-start gap-2`}>
                    <Target className="mt-0.5 h-4 w-4 flex-none text-gray-400" aria-hidden="true" />
                    {t('carbon.sbtiTitle', 'Repère de réduction — trajectoire 1,5 °C')}
                  </h2>
                  <p className={sectionHint}>{t('carbon.sbtiHint', 'Scopes 1 et 2, de l’exercice choisi à 2030')}</p>
                </div>
                <Badge tone="neutral">{t('carbon.sbtiIndicative', 'Indicatif')}</Badge>
              </div>
              {scope12 > 0 ? (
                <>
                  <dl className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: t('carbon.sbtiCurrent', 'Scopes 1+2 {{year}}', { year }), value: scope12, strong: false },
                      { label: t('carbon.sbtiTarget', 'Repère 2030 (Scopes 1+2)'), value: sbtiTarget2030, strong: true },
                      { label: t('carbon.sbtiReduction', 'Réduction correspondante'), value: requiredReduction, strong: false },
                    ].map(c => (
                      <div key={c.label} className="min-w-0">
                        <dt className="min-h-[32px] text-xs text-gray-500">{c.label}</dt>
                        <dd className={`mt-1 text-xl font-semibold tabular-nums ${c.strong ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900'}`}>{fmt(c.value)}</dd>
                        <dd className="text-xs text-gray-500">tCO₂e/an</dd>
                      </div>
                    ))}
                  </dl>
                  {/* Comparaison visuelle : aujourd'hui vs repère 2030 */}
                  <div className="mt-5 space-y-2">
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 text-xs text-gray-500">
                      <span className="tabular-nums">{year}</span>
                      <Meter pct={100} color="#9ca3af" label={`${year} : ${fmt(scope12)} tCO₂e`} />
                    </div>
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 text-xs text-gray-500">
                      <span className="tabular-nums">2030</span>
                      <Meter pct={pctOf(sbtiTarget2030, scope12)} color="#047857" label={`2030 : ${fmt(sbtiTarget2030)} tCO₂e`} />
                    </div>
                  </div>
                  <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    {t('carbon.sbtiNote', "Calcul linéaire à −4,2 %/an sur les Scopes 1+2, repère de la trajectoire 1,5 °C de la SBTi. Ce n'est pas un objectif validé : définissez le vôtre dans le module SBTi.")}
                  </p>
                </>
              ) : (
                <p className="mt-5 text-sm text-gray-500">{t('carbon.sbtiEmpty', 'Renseignez vos Scopes 1 et 2 pour afficher le repère.')}</p>
              )}
            </section>
          </div>

          {/* Principales catégories Scope 3 */}
          {scope3Total > 0 && (
            <section className={`${card} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={sectionTitle}>{t('carbon.topCatsTitle', 'Top catégories Scope 3')}</h2>
                  <p className={sectionHint}>{t('carbon.topCatsCount', '{{n}} sur 15 renseignées', { n: completedCount })}</p>
                </div>
                <button type="button" onClick={() => setActiveTab('decomposition')} className={link}>
                  {t('carbon.decompositionMorePlain', 'Voir la décomposition')} <ChevronDown className="h-3.5 w-3.5 -rotate-90" aria-hidden="true" />
                </button>
              </div>
              <ul className="mt-5 space-y-3">
                {[...categories]
                  .filter(c => c.value !== null && c.value > 0)
                  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                  .slice(0, 8)
                  .map(c => {
                    const pct = pctOf(c.value ?? 0, scope3Total);
                    return (
                      <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_72px_52px] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)_72px_52px]">
                        <span className="min-w-0 text-[13px] text-gray-800 sm:truncate"><span className="font-semibold">{c.num}</span> <span className="text-gray-600">{c.name}</span></span>
                        <span className="order-last col-span-3 sm:order-none sm:col-span-1"><Meter pct={pct} color={c.hex} label={`${c.num} : ${pct.toFixed(1)} %`} /></span>
                        <span className="text-right text-[13px] font-semibold tabular-nums text-gray-900">{fmt(c.value ?? 0)} t</span>
                        <span className="text-right text-[13px] tabular-nums text-gray-500">{pct.toFixed(1)} %</span>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          {grandTotal === 0 && (
            <div className={card}>
              <EmptyState icon={Leaf}
                title={t('carbon.noDataTitle', 'Aucune donnée pour {{year}}', { year })}
                description={t('carbon.noDataDescPlain', 'Renseignez vos Scopes 1 et 2 ci-dessus, importez un FEC ou saisissez les 15 catégories du Scope 3.')}
                action={<Button onClick={() => setActiveTab('scope3')}>{t('carbon.noDataCtaPlain', 'Saisir le Scope 3')}</Button>} />
            </div>
          )}
        </div>
      )}

      {/* ══ Décomposition Scope 3 ══ */}
      {activeTab === 'decomposition' && (() => {
        const upstreamCats = categories.filter(c => c.upstream);
        const downstreamCats = categories.filter(c => !c.upstream);
        const upstreamTotal = upstreamCats.reduce((s2, c) => s2 + (c.value ?? 0), 0);
        const downstreamTotal = downstreamCats.reduce((s2, c) => s2 + (c.value ?? 0), 0);
        const shown = (decompFilter === 'up' ? upstreamCats : decompFilter === 'down' ? downstreamCats : categories)
          .slice().sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        const base = decompFilter === 'up' ? upstreamTotal : decompFilter === 'down' ? downstreamTotal : scope3Total;
        const maxVal = shown.length > 0 ? (shown[0].value ?? 0) : 0;

        if (scope3Total === 0) {
          return (
            <div className={card}>
              <EmptyState icon={BarChart3}
                title={t('carbon.decompEmptyTitle', 'Pas encore de Scope 3')}
                description={t('carbon.decompEmptyDesc', 'Saisissez des données Scope 3 pour voir la décomposition par catégorie.')}
                action={<Button onClick={() => setActiveTab('scope3')}>{t('carbon.decompEmptyCtaPlain', 'Saisir les catégories')}</Button>} />
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Amont / aval */}
            <section className={`${card} p-6`}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-gray-600">{t('carbon.decompTotalKpi', 'Total Scope 3')}</h2>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-[36px] font-semibold leading-none tracking-tight tabular-nums text-gray-900">{fmt(scope3Total)}</span>
                    <span className="text-sm text-gray-500">tCO₂e</span>
                  </p>
                </div>
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('carbon.decompFilledLabel', 'Catégories renseignées')}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{completedCount}/15</span>
                  </div>
                  <div className="mt-1.5"><Meter pct={completenessRate} color="#047857" label={`${completenessRate} %`} height="h-1.5" /></div>
                </div>
              </div>
              <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-gray-100" role="img"
                aria-label={`Amont ${pctOf(upstreamTotal, scope3Total).toFixed(1)} %, aval ${pctOf(downstreamTotal, scope3Total).toFixed(1)} %`}>
                {upstreamTotal > 0 && <span style={{ flexGrow: upstreamTotal, background: '#047857' }} />}
                {downstreamTotal > 0 && <span style={{ flexGrow: downstreamTotal, background: '#0284c7' }} className="border-l-2 border-white dark:border-gray-900" />}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: t('carbon.decompUpstreamKpi', 'Émissions amont (Cat. 1–8)'), value: upstreamTotal, color: '#047857', done: upstreamDone, of: 8 },
                  { label: t('carbon.decompDownstreamKpi', 'Émissions aval (Cat. 9–15)'), value: downstreamTotal, color: '#0284c7', done: downstreamDone, of: 7 },
                ].map(k => (
                  <div key={k.label}>
                    <dt className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: k.color }} aria-hidden="true" />{k.label}
                    </dt>
                    <dd className="mt-1">
                      <span className="text-xl font-semibold tabular-nums text-gray-900">{fmt(k.value)}</span>
                      <span className="ml-1 text-xs text-gray-500">tCO₂e</span>
                      <span className="ml-2 text-[13px] tabular-nums text-gray-500">{pctOf(k.value, scope3Total).toFixed(1)} %</span>
                    </dd>
                    <dd className="text-xs text-gray-500">{t('carbon.decompDoneOf', '{{done}}/{{of}} catégories renseignées', { done: k.done, of: k.of })}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Classement des catégories */}
            <section className={`${card} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={sectionTitle}>{t('carbon.decompChartTitle', 'Classement des 15 catégories GHG Protocol')}</h2>
                  <p className={sectionHint}>{t('carbon.decompChartSub', 'Triées par contribution décroissante')}</p>
                </div>
                <div role="radiogroup" aria-label={t('carbon.decompFilterLabel', 'Filtrer')} className="inline-flex rounded-xl bg-gray-100 p-1">
                  {([
                    ['all', t('carbon.filterAll', 'Toutes')],
                    ['up', t('carbon.filterUp', 'Amont')],
                    ['down', t('carbon.filterDown', 'Aval')],
                  ] as const).map(([k, l]) => (
                    <button key={k} role="radio" aria-checked={decompFilter === k} onClick={() => setDecompFilter(k)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${decompFilter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <ol className="mt-5 divide-y divide-gray-100 dark:divide-gray-800">
                {shown.map((cat, idx) => {
                  const Icon = cat.icon;
                  const has = cat.value !== null;
                  const val = cat.value ?? 0;
                  const pct = pctOf(val, base);
                  return (
                    <li key={cat.id} className="grid grid-cols-[24px_minmax(0,1fr)_76px_56px] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[24px_minmax(0,260px)_minmax(0,1fr)_76px_56px]">
                      <span className="text-right text-xs tabular-nums text-gray-400">{idx + 1}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 flex-none" style={{ color: has ? cat.hex : '#9ca3af' }} aria-hidden="true" />
                        <span className={`min-w-0 truncate text-[13px] ${has ? 'text-gray-800' : 'text-gray-400'}`}>
                          <span className="font-semibold">{cat.num}</span> {cat.name}
                        </span>
                      </span>
                      <span className="order-last col-span-4 col-start-2 sm:order-none sm:col-span-1 sm:col-start-auto">
                        {has
                          ? <Meter pct={maxVal > 0 ? (val / maxVal) * 100 : 0} color={cat.hex} label={`${cat.num} : ${fmt(val)} tCO₂e`} />
                          : <span className="text-xs italic text-gray-400">{t('carbon.notEnteredPlain', 'Non renseignée')}</span>}
                      </span>
                      <span className={`text-right text-[13px] font-semibold tabular-nums ${has ? 'text-gray-900' : 'text-gray-300'}`}>{has ? `${fmt(val)} t` : '—'}</span>
                      <span className="text-right text-xs tabular-nums text-gray-500">{has ? `${pct.toFixed(1)} %` : '—'}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-xs text-gray-500">
                {decompFilter === 'all'
                  ? t('carbon.decompPctOfScope3', 'Pourcentages exprimés sur le total Scope 3.')
                  : t('carbon.decompPctOfGroup', 'Pourcentages exprimés sur le total du groupe.')}
              </p>
            </section>
          </div>
        );
      })()}

      {/* ══ Saisie des 15 catégories ══ */}
      {activeTab === 'scope3' && (
        <div className="space-y-5 pb-24">
          <section className={`${card} p-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="font-medium text-gray-700">{t('carbon.scope3CompletenessLabel', 'Complétude Scope 3')}</span>
                  <span className="tabular-nums text-gray-600">{t('carbon.scope3Progress', '{{n}} / 15 catégories — {{pct}}%', { n: completedCount, pct: completenessRate })}</span>
                </div>
                <div className="mt-2"><Meter pct={completenessRate} color="#047857" label={`${completenessRate} %`} /></div>
              </div>
              <div role="radiogroup" aria-label={t('carbon.scope3ToggleLabel', 'Catégories affichées')} className="flex w-full flex-none rounded-xl bg-gray-100 p-1 sm:inline-flex sm:w-auto">
                {[
                  { val: true,  label: t('carbon.filterUpLong', 'Amont · Cat. 1–8'),  count: upstreamDone, total: 8 },
                  { val: false, label: t('carbon.filterDownLong', 'Aval · Cat. 9–15'), count: downstreamDone, total: 7 },
                ].map(opt => (
                  <button key={String(opt.val)} role="radio" aria-checked={showUpstream === opt.val} onClick={() => setShowUpstream(opt.val)}
                    className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:text-[13px] ${showUpstream === opt.val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                    {opt.label}
                    <span className="tabular-nums text-xs text-gray-500">{opt.count}/{opt.total}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <ul className={`${card} divide-y divide-gray-100 overflow-hidden dark:divide-gray-800`}>
            {filteredCategories.map(cat => {
              const Icon = cat.icon;
              const isExpanded = expandedId === cat.id;
              const pct = scope3Total > 0 && cat.value !== null ? pctOf(cat.value, scope3Total) : 0;
              const panelId = `cat-panel-${cat.id}`;
              return (
                <li key={cat.id}>
                  <button type="button" aria-expanded={isExpanded} aria-controls={panelId}
                    onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gray-100">
                      <Icon className="h-4 w-4" style={{ color: cat.hex }} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="whitespace-nowrap text-xs font-semibold text-gray-500">{cat.num}</span>
                        <span className="text-sm font-medium text-gray-900 sm:truncate">{cat.name}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {cat.value !== null
                          ? (scope3Total > 0 ? t('carbon.catShare', '{{pct}} % du Scope 3', { pct: pct.toFixed(1) }) : t('carbon.catFilledShort', 'Renseignée'))
                          : t('carbon.notEnteredPlain', 'Non renseignée')}
                      </span>
                    </span>
                    <span className="flex-none text-right">
                      {cat.value !== null ? (
                        <>
                          <span className="text-base font-semibold tabular-nums text-gray-900">{fmt(cat.value)}</span>
                          <span className="ml-1 text-xs text-gray-500">tCO₂e</span>
                        </>
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title={t('carbon.notEnteredPlain', 'Non renseignée')} aria-hidden="true" />
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 flex-none text-gray-400 motion-safe:transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {isExpanded && (
                    <div id={panelId} className="grid grid-cols-1 gap-5 bg-gray-50 px-5 py-5 md:grid-cols-2">
                      <div>
                        <p className="text-sm leading-relaxed text-gray-600">{cat.description}</p>
                        <label htmlFor={`cat-input-${cat.id}`} className="mt-4 block text-sm font-medium text-gray-800">
                          {t('carbon.measuredValue', 'Valeur mesurée')}
                        </label>
                        <div className="relative mt-2">
                          <input id={`cat-input-${cat.id}`} type="number" min="0" inputMode="decimal"
                            placeholder={cat.placeholder} value={cat.value ?? ''}
                            onChange={e => updateValue(cat.id, e.target.value)}
                            className={`${input} pr-16`} />
                          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-gray-500">tCO₂e</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium text-gray-500">{t('carbon.calcUnitLabelPlain', 'Unité de calcul usuelle')}</p>
                        <p className="mt-1 text-[15px] font-semibold text-gray-900">{cat.ademe_unit}</p>
                        <p className="mt-2 text-xs leading-relaxed text-gray-500">{t('carbon.calcUnitHint', "Multipliez votre donnée d'activité par le facteur de la Base Empreinte ADEME correspondant, puis saisissez le résultat en tCO₂e.")}</p>
                        <p className="mt-2 text-xs leading-relaxed text-gray-500">{cat.tooltip}</p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Barre d'enregistrement, toujours visible pendant la saisie */}
          <div className="sticky bottom-4 z-10">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500">{t('carbon.footerScope3Total', 'Total Scope 3 saisi')}</p>
                <p className="text-xl font-semibold tabular-nums text-gray-900">
                  {fmt(scope3Total)} <span className="text-sm font-normal text-gray-500">tCO₂e</span>
                  <span className="ml-3 hidden text-[13px] font-normal text-gray-500 sm:inline">{t('carbon.footerCatCount', '{{n}} catégories sur 15 complétées', { n: completedCount })}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCSV}>CSV</Button>
                <Button loading={saving} disabled={saving} icon={<CheckCircle className="h-4 w-4" />} onClick={saveScope3}>
                  {saving ? t('carbon.saving', 'Sauvegarde...') : t('carbon.saveScope3Plain', 'Enregistrer le Scope 3')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Flux ══ */}
      {activeTab === 'sankey' && (
        <section className={`${card} p-6`}>
          <h2 className={sectionTitle}>{t('carbon.sankeyTitlePlain', 'Flux du Scope 3 par catégorie')}</h2>
          <p className={sectionHint}>{t('carbon.sankeyHint', 'L’épaisseur de chaque flux est proportionnelle aux émissions. Vert : amont, bleu : aval.')}</p>
          {scope3Total > 0
            ? <div className="mt-5 overflow-x-auto"><div className="mx-auto min-w-[640px] max-w-[900px]"><SankeyScope3 categories={categories} total={scope3Total} /></div></div>
            : <EmptyState icon={BarChart3} title={t('carbon.sankeyEmpty', 'Aucune donnée Scope 3 saisie.')}
                action={<Button onClick={() => setActiveTab('scope3')}>{t('carbon.decompEmptyCtaPlain', 'Saisir les catégories')}</Button>} />}
        </section>
      )}
    </div>
  );
}
