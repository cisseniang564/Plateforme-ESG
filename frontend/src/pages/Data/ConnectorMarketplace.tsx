/**
 * ConnectorMarketplace — Catalog page listing every available / coming-soon
 * data connector. Filters by category + search. CTA "Suggérer un connecteur"
 * for absent integrations.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plug, Search, CheckCircle2, Clock, Sparkles, Plus, X, Send,
  Zap, BarChart3, Building2, ChevronRight, Activity, Book, Settings, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import api from '@/services/api';
import Spinner from '@/components/common/Spinner';

interface Connector {
  id: string;
  name: string;
  category: string;
  description: string;
  data_provided: string[];
  status: 'available' | 'beta' | 'coming_soon';
  logo_emoji: string;
  color: string;
  country?: string;
  auth_type?: string;
  setup_url?: string;
  plan_required?: string;
  is_connected: boolean;
}

interface CatalogResponse {
  items: Connector[];
  counts: Record<string, number>;
  total: number;
}

const getCategoryLabels = (t: TFunction): Record<string, { label: string; icon: any }> => ({
  all:        { label: t('conn.catAll', 'Tous'),                       icon: Plug },
  energy:     { label: t('conn.catEnergy', 'Énergie'),                 icon: Zap },
  accounting: { label: t('conn.catAccounting', 'Comptabilité · FEC'), icon: BarChart3 },
  erp:        { label: t('conn.catErp', 'ERP'),                        icon: Building2 },
  hr:         { label: t('conn.catHr', 'RH / SIRH'),                   icon: Building2 },
  scope3:     { label: t('conn.catScope3', 'Scope 3'),                 icon: Sparkles },
  banking:    { label: t('conn.catBanking', 'Banque & dépenses'),      icon: BarChart3 },
  other:      { label: t('conn.catOther', 'Autres'),                   icon: Plug },
});

const getStatusBadge = (t: TFunction): Record<string, { bg: string; text: string; label: string }> => ({
  available:   { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t('conn.stAvailable', 'Disponible') },
  beta:        { bg: 'bg-blue-100',    text: 'text-blue-700',    label: t('conn.stBeta', 'Beta') },
  coming_soon: { bg: 'bg-gray-100',    text: 'text-gray-600',    label: t('conn.stSoon', 'Bientôt') },
});

export default function ConnectorMarketplace() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const CATEGORY_LABELS = getCategoryLabels(t);
  const STATUS_BADGE = getStatusBadge(t);
  const [items, setItems]       = useState<Connector[]>([]);
  const [counts, setCounts]     = useState<Record<string, number>>({});
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'coming_soon'>('all');

  // Suggest a missing connector
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestCat, setSuggestCat]   = useState('other');
  const [suggestNote, setSuggestNote] = useState('');
  const [submittingSuggest, setSubmittingSuggest] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<CatalogResponse>('/connector-marketplace/catalog')
      .then(res => {
        setItems(res.data?.items ?? []);
        setCounts(res.data?.counts ?? {});
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(['all']);
    items.forEach(i => set.add(i.category));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(c => {
      if (category !== 'all' && c.category !== category) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.data_provided.some(d => d.toLowerCase().includes(q))
      );
    });
  }, [items, category, statusFilter, search]);

  const handleSuggest = async () => {
    if (!suggestName.trim()) return;
    setSubmittingSuggest(true);
    try {
      await api.post('/connector-marketplace/suggest', {
        name: suggestName.trim(),
        category: suggestCat,
        notes: suggestNote.trim() || undefined,
      });
      setSuggestDone(true);
    } catch {
      toast.error(t('conn.suggestError', "Échec de l'envoi de la suggestion."));
    } finally {
      setSubmittingSuggest(false);
    }
  };

  const closeSuggest = () => {
    setSuggestOpen(false);
    setSuggestName(''); setSuggestCat('other'); setSuggestNote('');
    setSuggestDone(false);
  };

  /** Download a pre-filled CSV template that matches the import dispatcher
   *  signature for the given workflow. The header columns mirror what the
   *  backend's ``_detect_file_intent`` looks for so the file is routed to
   *  the right table on import (materiality_issues / esg_risks / suppliers
   *  / data_entries). */
  const downloadTemplate = (kind: 'esrs' | 'materiality' | 'risks' | 'suppliers' | 'ghg') => {
    const T: Record<string, { filename: string; rows: string[] }> = {
      esrs: {
        filename: 'template-esrs-indicateurs.csv',
        rows: [
          'metric_name,value_numeric,unit,pillar,category,period_start,period_end,data_source',
          'Émissions GES Scope 1,,tCO2e,environmental,ghg_scope1,2025-01-01,2025-12-31,',
          'Émissions GES Scope 2,,tCO2e,environmental,ghg_scope2,2025-01-01,2025-12-31,',
          'Consommation énergétique,,MWh,environmental,energy,2025-01-01,2025-12-31,',
          'Effectif total ETP,,ETP,social,workforce,2025-01-01,2025-12-31,',
          'Part de femmes au CODIR,,%,social,diversity,2025-01-01,2025-12-31,',
          'Heures de formation par ETP,,h,social,training,2025-01-01,2025-12-31,',
          'Membres indépendants du conseil,,%,governance,board,2025-01-01,2025-12-31,',
        ],
      },
      materiality: {
        filename: 'template-materialite.csv',
        rows: [
          'name,category,financial_impact,esg_impact,is_material,priority,stakeholders,description',
          'Émissions GES et empreinte carbone,E1 Climat,78,92,oui,high,"salariés,clients,investisseurs",Émissions Scope 1+2+3',
          'Mix énergétique et énergies renouvelables,E1 Climat,65,80,oui,high,"investisseurs,clients",Part EnR du mix',
          'Gestion responsable des déchets,E5 Économie circ.,35,58,non,medium,"salariés",Recyclage et valorisation',
          'Attraction et rétention des talents,S1 Effectifs,88,75,oui,high,"salariés,RH",Turnover et engagement',
        ],
      },
      risks: {
        filename: 'template-risques-esg.csv',
        rows: [
          'title,category,probability,impact,risk_score,severity,mitigation_status,owner',
          'Hausse prix énergie (Scope 1+2),Transition risk,4,3,12,élevé,en cours,Direction Achats',
          'Pénurie talents tech (turnover),Operational,4,4,16,critique,planifié,DRH',
          'Cyberattaque / fuite données clients,Operational,3,5,15,critique,en cours,RSSI',
          'Non-conformité CSRD vague 2,Regulatory,3,4,12,élevé,en cours,Direction RSE',
        ],
      },
      suppliers: {
        filename: 'template-fournisseurs.csv',
        rows: [
          'name;country;sector;annual_spend_eur;risk_level;e_score;s_score;g_score;global_score;audit_status;audit_date',
          'AMAZON WEB SERVICES;US;Cloud / IT;52000;medium;78;70;85;77.7;self-declared;2025-06-30',
          'EDF;FR;Énergie;120000;low;82;78;88;82.7;ecovadis-gold;2025-04-15',
          'TRANSPORTEUR XYZ;FR;Logistique;38000;high;55;62;58;58.3;rapport-public;2025-03-01',
        ],
      },
      ghg: {
        filename: 'template-bilan-carbone-scopes.csv',
        rows: [
          'scope,category,source,tco2e,calculation_method,period',
          'scope1,1.1,Combustion gaz chauffage bureaux,26.5,average-data,2025',
          'scope1,1.2,Carburant flotte (5 véhicules diesel),21,average-data,2025',
          'scope2,2.1,Électricité achetée (location-based),18.3,location-based,2025',
          'scope3,3.4,Voyages d\'affaires (avion + train),12.7,distance-based,2025',
        ],
      },
    };
    const tpl = T[kind];
    const blob = new Blob(['﻿' + tpl.rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tpl.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t('conn.tplDownloaded', 'Template {{name}} téléchargé', { name: tpl.filename }));
  };

  const handleClick = (c: Connector) => {
    if (c.status !== 'available') return;
    // Explicit URL wins; otherwise fall back to the legacy connectors hub
    // with a focus query param so that page can scroll/highlight the right card.
    navigate(c.setup_url || `/app/data/connectors?focus=${encodeURIComponent(c.id)}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
              {t('conn.heroBadge', 'Marketplace · Intégrations')}
            </span>
            <h1 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-xl">
                <Plug className="h-5 w-5" />
              </span>
              {t('conn.heroTitle', 'Connecteurs de données')}
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl">
              {t('conn.heroDesc', 'Branchez vos systèmes existants en quelques clics : énergie, comptabilité, RH, ERP, banking. Vos données ESG se mettent à jour automatiquement.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className="inline-flex items-center gap-2 px-4 h-10 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('conn.suggest', 'Suggérer un connecteur')}
          </button>
        </div>
      </div>

      {/* ── Secondary nav: sections of the Connectors area ──────────────────
          The marketplace is the default landing — these tabs surface the
          other connector-related views (the legacy hub already implements
          them via the ?tab=<x> query param). */}
      <div className="bg-white border border-gray-200 rounded-2xl px-2 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { label: t('conn.catalog', 'Catalogue'),       icon: Plug,       to: null /* current */ },
            { label: t('conn.navOverview', "Vue d'ensemble"), icon: BarChart3,  to: '/app/data/connectors?tab=overview' },
            { label: 'Monitoring',     icon: Activity,   to: '/app/data/connectors?tab=monitoring' },
            { label: t('conn.navFecImport', 'Import FEC'), icon: FileText,   to: '/app/import-csv?type=fec' },
            { label: 'Configuration',  icon: Settings,   to: '/app/data/connectors?tab=configuration' },
            { label: 'Documentation',  icon: Book,       to: '/app/data/connectors?tab=docs' },
          ].map(({ label, icon: Icon, to }) => {
            const active = to === null;
            return (
              <button
                key={label}
                type="button"
                onClick={() => { if (to) navigate(to); }}
                className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-card-green p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="stat-label">{t('conn.availables', 'Disponibles')}</p>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </span>
          </div>
          <p className="stat-value">{counts.available ?? 0}</p>
        </div>
        <div className="kpi-card kpi-card-blue p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="stat-label">{t('conn.connecteds', 'Connectés')}</p>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </span>
          </div>
          <p className="stat-value">{counts.installed ?? 0}</p>
        </div>
        <div className="kpi-card kpi-card-amber p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="stat-label">{t('conn.soon', 'Bientôt')}</p>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </span>
          </div>
          <p className="stat-value">{counts.coming_soon ?? 0}</p>
        </div>
        <div className="kpi-card kpi-card-purple p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="stat-label">Total catalog</p>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100">
              <Plug className="h-4 w-4 text-purple-600" />
            </span>
          </div>
          <p className="stat-value">{items.length}</p>
        </div>
      </div>

      {/* ── Imports rapides ─────────────────────────────────────────────────
          Quick-access tiles for the most common direct-upload flows. Without
          this strip users could only find these via the "Comptabilité · FEC"
          tab below — easy to miss. */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {t('conn.quickImports', 'Imports rapides')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('conn.quickImportsDesc', 'Téléchargez directement un fichier — pas besoin de connecter un système externe')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/import-csv?type=fec')}
            className="group flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">📄</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-bold text-gray-900">{t('conn.fecFile', 'Fichier FEC')}</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-800">FR</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('conn.fecDesc', 'Sage, Cegid, Pennylane… Calcul Scope 3 ADEME automatique')}
              </p>
              <p className="text-[11px] text-amber-700 font-semibold mt-1.5 flex items-center gap-1">
                {t('conn.fecCta', 'Importer un FEC')} <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/import-csv')}
            className="group flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">📊</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-bold text-gray-900">CSV / Excel</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('conn.csvDesc', 'Indicateurs ESG, matérialité, risques, fournisseurs — détection auto des colonnes')}
              </p>
              <p className="text-[11px] text-blue-700 font-semibold mt-1.5 flex items-center gap-1">
                {t('conn.csvCta', 'Importer un CSV/Excel')} <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/data/hr-import')}
            className="group flex items-start gap-3 p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">👥</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-bold text-gray-900">{t('conn.hrFile', 'Effectifs (RH)')}</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('conn.hrDesc', 'ETP, formation, accidents du travail, diversité — Pilier Social S1')}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                {t('conn.hrCta', 'Importer des données RH')} <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/connectors/enedis')}
            className="group flex items-start gap-3 p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 hover:border-purple-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">⚡</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-bold text-gray-900">{t('conn.enedis', 'Énergie Enedis')}</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-200 text-purple-800">API</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('conn.enedisDesc', 'Sync auto consommation électrique → Scope 2 ADEME en temps réel')}
              </p>
              <p className="text-[11px] text-purple-700 font-semibold mt-1.5 flex items-center gap-1">
                {t('conn.enedisCta', 'Connecter Enedis')} <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/connectors/pennylane')}
            className="group flex items-start gap-3 p-4 rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 hover:border-cyan-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">🔷</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-bold text-gray-900">Pennylane</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-200 text-cyan-800">OAuth</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('conn.pennylaneDesc', 'Sync auto factures fournisseurs → Scope 3 spend-based')}
              </p>
              <p className="text-[11px] text-cyan-700 font-semibold mt-1.5 flex items-center gap-1">
                {t('conn.pennylaneCta', 'Connecter Pennylane')} <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Templates téléchargeables ─────────────────────────────────────
          Pre-filled CSVs that exactly match the import dispatcher's column
          conventions. Saves the user from guessing the right header names. */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {t('conn.tplTitle', 'Templates téléchargeables')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('conn.tplSubtitle', 'Modèles CSV pré-formatés — colonnes prêtes pour la détection automatique')}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{t('conn.tplSeparatorsPre', 'UTF-8 · séparateurs ')}<code>,</code>{t('conn.tplSeparatorsAnd', ' et ')}<code>;</code></span>
        </div>
        {/* Excel multi-onglet — un seul fichier, 5 onglets pré-formatés */}
        <div className="rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 mb-3">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-2xl shrink-0">📚</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="text-sm font-bold text-gray-900">{t('conn.tplExcelTitle', 'Template Excel tout-en-un')}</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">{t('conn.tplExcelBadge', 'XLSX · 5 onglets')}</span>
              </div>
              <p className="text-xs text-gray-600">
                {t('conn.tplExcelDesc', "Un seul fichier .xlsx avec 5 feuilles + mode d'emploi. Choisis ton secteur pour pré-remplir les KPI typiques.")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {([
              { code: '',             label: t('conn.secGeneric', 'Générique'),  emoji: '📋' },
              { code: 'banking',      label: t('conn.secBanking', 'Banque'),     emoji: '🏦' },
              { code: 'industry',     label: t('conn.secIndustry', 'Industrie'), emoji: '🏭' },
              { code: 'retail',       label: 'Retail',            emoji: '🛒' },
              { code: 'services',     label: 'Services / IT',     emoji: '💻' },
              { code: 'energy',       label: t('conn.secEnergy', 'Énergie'),     emoji: '⚡' },
              { code: 'construction', label: t('conn.secConstruction', 'BTP'),   emoji: '🏗' },
            ] as const).map(s => {
              const url = s.code
                ? `/api/v1/import-templates/all-in-one.xlsx?sector=${s.code}`
                : '/api/v1/import-templates/all-in-one.xlsx';
              return (
                <a
                  key={s.code || 'generic'}
                  href={url}
                  className="group flex flex-col items-center gap-1 p-2 rounded-md bg-white/70 hover:bg-white border border-emerald-200 hover:border-emerald-500 hover:shadow-sm transition-all text-center"
                  title={t('conn.secDownloadTitle', 'Télécharger le template {{label}}', { label: s.label })}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{s.emoji}</span>
                  <span className="text-[11px] font-semibold text-gray-700 leading-tight">{s.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-gray-500 mb-2 font-semibold uppercase tracking-wide">{t('conn.tplOneType', 'Ou un seul type à la fois (CSV) :')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {([
            { kind: 'esrs',         emoji: '📋', label: t('conn.tplEsrs', 'Indicateurs ESRS'), sub: t('conn.tplEsrsSub', 'Scope 1/2, ETP, diversité, gouvernance'), color: 'slate' },
            { kind: 'ghg',          emoji: '🔥', label: t('conn.tplGhg', 'Bilan Carbone'),     sub: t('conn.tplGhgSub', 'Scopes 1/2/3 facteurs ADEME'),           color: 'orange' },
            { kind: 'materiality',  emoji: '🎯', label: t('conn.tplMat', 'Matérialité'),       sub: t('conn.tplMatSub', 'Double matérialité (impact × ESG)'),     color: 'pink' },
            { kind: 'risks',        emoji: '⚠️', label: t('conn.tplRisks', 'Risques ESG'),     sub: t('conn.tplRisksSub', 'Registre proba × impact'),             color: 'red' },
            { kind: 'suppliers',    emoji: '🏭', label: t('conn.tplSuppliers', 'Fournisseurs'), sub: t('conn.tplSuppliersSub', 'Scores E/S/G + montants achats'),  color: 'cyan' },
          ] as const).map(tpl => {
            const colors: Record<string, string> = {
              slate:  'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-700',
              orange: 'border-orange-200 hover:border-orange-400 bg-orange-50 hover:bg-white text-orange-700',
              pink:   'border-pink-200 hover:border-pink-400 bg-pink-50 hover:bg-white text-pink-700',
              red:    'border-red-200 hover:border-red-400 bg-red-50 hover:bg-white text-red-700',
              cyan:   'border-cyan-200 hover:border-cyan-400 bg-cyan-50 hover:bg-white text-cyan-700',
            };
            return (
              <button
                key={tpl.kind}
                type="button"
                onClick={() => downloadTemplate(tpl.kind as any)}
                className={`group flex flex-col items-start gap-1 p-3 rounded-lg border transition-all text-left ${colors[tpl.color]}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xl">{tpl.emoji}</span>
                  <span className="text-xs font-bold flex-1 truncate">{tpl.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] leading-snug opacity-80">{tpl.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── État des connecteurs (mini-monitoring inline) ─────────────────
          Compact health summary; for the full view, the user can switch to
          the dedicated Monitoring tab via the nav strip above. */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              {t('conn.statusTitle', 'État des connecteurs')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('conn.statusSubtitle', "Vue d'ensemble en temps réel")}</p>
          </div>
          <button
            onClick={() => navigate('/app/data/connectors?tab=monitoring')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {t('conn.fullMonitoring', 'Monitoring complet')} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">{t('conn.connecteds', 'Connectés')}</span>
              <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-emerald-300">{counts.installed ?? 0}</p>
            <p className="text-[10px] text-slate-400">{t('conn.activeSources', 'sources actives')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{t('conn.availables', 'Disponibles')}</span>
            <p className="text-2xl font-bold text-white mt-1">{counts.available ?? 0}</p>
            <p className="text-[10px] text-slate-400">{t('conn.readyToConnect', 'prêts à brancher')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{t('conn.catalog', 'Catalogue')}</span>
            <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
            <p className="text-[10px] text-slate-400">{t('conn.integrations', 'intégrations')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">{t('conn.soon', 'Bientôt')}</span>
              <Clock className="h-3 w-3 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-300">{counts.coming_soon ?? 0}</p>
            <p className="text-[10px] text-slate-400">{t('conn.inRoadmap', 'en roadmap')}</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('conn.searchPlaceholder', 'Rechercher (nom, donnée, scope…)')}
              className="w-full pl-10 pr-3 h-10 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['all', 'available', 'coming_soon'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {s === 'all' ? t('conn.all', 'Tous') : s === 'available' ? t('conn.availables', 'Disponibles') : t('conn.soon', 'Bientôt')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {categories.map(cat => {
            const meta = CATEGORY_LABELS[cat];
            if (!meta) return null;
            const Icon = meta.icon;
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg transition-colors ${
                  active
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Plug className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">{t('conn.noMatch', 'Aucun connecteur ne correspond')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('conn.noMatchDesc', 'Modifiez la recherche ou suggérez-nous un connecteur manquant.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const badge = STATUS_BADGE[c.status];
            const clickable = c.status === 'available';
            return (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-5 transition-all duration-200 ${
                  clickable
                    ? 'border-gray-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-px cursor-pointer'
                    : 'border-gray-100 opacity-90'
                }`}
                onClick={() => handleClick(c)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: c.color + '15' }}
                  >
                    {c.logo_emoji}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.is_connected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        <Sparkles className="h-2.5 w-2.5" />
                        {t('conn.connected', 'Connecté')}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mb-1">{c.name}</h3>
                {c.country && c.country !== 'INTL' && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 mb-2">
                    🇫🇷 {c.country}
                  </span>
                )}
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3">{c.description}</p>

                {c.data_provided.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.data_provided.slice(0, 3).map(d => (
                      <span key={d} className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 text-[10px] font-mono border border-gray-100">
                        {d}
                      </span>
                    ))}
                    {c.data_provided.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{c.data_provided.length - 3}</span>
                    )}
                  </div>
                )}

                {c.plan_required && (
                  <p className="text-[10px] text-violet-700 font-bold uppercase tracking-wide mb-2">
                    {t('conn.planRequired', 'Plan {{plan}} requis', { plan: c.plan_required })}
                  </p>
                )}

                {clickable ? (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-emerald-700 font-semibold">{t('conn.configure', 'Configurer')}</span>
                    <ChevronRight className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{t('conn.comingSoon', 'Bientôt disponible')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Suggest modal */}
      {suggestOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => !submittingSuggest && closeSuggest()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-emerald-100 rounded-xl flex-shrink-0">
                {suggestDone ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Plus className="h-5 w-5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900">
                  {suggestDone ? t('conn.thanks', 'Merci !') : t('conn.suggest', 'Suggérer un connecteur')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {suggestDone
                    ? t('conn.suggestThanksDesc', "Votre suggestion a été transmise à notre équipe produit. Les connecteurs les plus demandés sont priorisés.")
                    : t('conn.suggestDesc', "Quel outil souhaitez-vous brancher à ESGflow ? Plus la demande est précise, mieux on peut l'intégrer.")}
                </p>
              </div>
            </div>

            {!suggestDone ? (
              <>
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('conn.toolLabel', 'Outil')} *</label>
                    <input
                      type="text"
                      value={suggestName}
                      onChange={e => setSuggestName(e.target.value)}
                      placeholder={t('conn.toolPlaceholder', 'Ex : SAP SuccessFactors, Workday…')}
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('conn.categoryLabel', 'Catégorie')}</label>
                    <select
                      value={suggestCat}
                      onChange={e => setSuggestCat(e.target.value)}
                      className="w-full px-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="energy">{t('conn.optEnergy', 'Énergie')}</option>
                      <option value="accounting">{t('conn.optAccounting', 'Comptabilité')}</option>
                      <option value="erp">{t('conn.optErp', 'ERP')}</option>
                      <option value="hr">{t('conn.optHr', 'RH / SIRH')}</option>
                      <option value="scope3">{t('conn.optScope3', 'Scope 3 / Mobilité')}</option>
                      <option value="banking">{t('conn.optBanking', 'Banque & dépenses')}</option>
                      <option value="other">{t('conn.optOther', 'Autre')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t('conn.notesLabel', 'Notes (optionnel)')}</label>
                    <textarea
                      value={suggestNote}
                      onChange={e => setSuggestNote(e.target.value)}
                      placeholder={t('conn.notesPlaceholder', 'Décrivez quelles données vous souhaiteriez importer, le volume, etc.')}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeSuggest}
                    disabled={submittingSuggest}
                    className="px-4 h-10 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t('conn.cancel', 'Annuler')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={submittingSuggest || !suggestName.trim()}
                    className="inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submittingSuggest ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                    {t('conn.send', 'Envoyer')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeSuggest}
                  className="px-4 h-10 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  {t('conn.close', 'Fermer')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
