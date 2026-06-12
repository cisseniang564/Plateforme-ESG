/**
 * CommandPalette — ⌘K / Ctrl+K search palette
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ArrowRight,
  BarChart3, Flame, Target, FlameKindling, Brain, Truck, ShieldCheck,
  ClipboardList, Plug, Building2, Radio, BarChart2, CheckSquare,
  BookOpen, Layers, TrendingUp, AlertTriangle, FileText, GitMerge,
  Bell, Code2, Activity, Database, Upload, Settings, Users, CreditCard,
  Leaf, Calculator, FileSpreadsheet, Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface SearchItem {
  id: string; label: string; description: string; path: string;
  icon: any; category: 'module' | 'page' | 'settings' | 'action'; keywords: string[];
}

function getSearchItems(t: TFunction): SearchItem[] {
  return [
    { id: 'dashboard',     label: t('cmd.lab.dashboard',     'Dashboard Exécutif'),       description: t('cmd.dsc.dashboard',     'Tableau de bord ESG global'),              path: '/app',                      icon: BarChart3,     category: 'module',   keywords: ['accueil','home','kpi','score'] },
    { id: 'carbon',        label: t('cmd.lab.carbon',        'Bilan Carbone'),             description: t('cmd.dsc.carbon',        'Scope 1, 2 & 3 · GHG Protocol'),           path: '/app/carbon',               icon: Flame,         category: 'module',   keywords: ['carbone','scope','ghg','emission','co2','ademe'] },
    { id: 'scope3',        label: t('cmd.lab.scope3',        'Calculateur Scope 3'),       description: t('cmd.dsc.scope3',        '15 catégories · Import FEC'),              path: '/app/scope3',               icon: Calculator,    category: 'module',   keywords: ['scope 3','fec','comptable','indirect'] },
    { id: 'materiality',   label: t('cmd.lab.materiality',   'Matrice de Matérialité'),    description: t('cmd.dsc.materiality',   'Double matérialité CSRD'),                 path: '/app/materiality',          icon: Target,        category: 'module',   keywords: ['materialite','double','parties prenantes','enjeux'] },
    { id: 'decarb',        label: t('cmd.lab.decarb',        'Plan de Décarbonation'),     description: t('cmd.dsc.decarb',        'SBTi · Net Zero 2050'),                    path: '/app/decarbonation',        icon: FlameKindling, category: 'module',   keywords: ['decarbonation','sbti','net zero','trajectoire','reduction'] },
    { id: 'ai',            label: t('cmd.lab.ai',            'IA & Insights'),             description: t('cmd.dsc.ai',            'Chatbot ESG · Anomalies · Prédictions'),   path: '/app/ai-insights',         icon: Brain,         category: 'module',   keywords: ['ia','intelligence','chatbot','anomalie','prediction'] },
    { id: 'supply',        label: t('cmd.lab.supply',        'Supply Chain ESG'),          description: t('cmd.dsc.supply',        'Fournisseurs · Due diligence'),            path: '/app/supply-chain',        icon: Truck,         category: 'module',   keywords: ['fournisseur','supply','chain','vigilance','csddd'] },
    { id: 'compliance',    label: t('cmd.lab.compliance',    'Multi-Réglementaire'),       description: t('cmd.dsc.compliance',    '10 référentiels · Compliance'),            path: '/app/compliance',          icon: ShieldCheck,   category: 'module',   keywords: ['compliance','reglementaire','sapin','dpef'] },
    { id: 'audit',         label: t("cmd.lab.audit",         "Piste d'Audit"),             description: t('cmd.dsc.audit',         'Journal détaillé · SHA-256'),              path: '/app/audit-trail',         icon: ClipboardList, category: 'module',   keywords: ['audit','tracabilite','sha','journal'] },
    { id: 'scores',        label: t('cmd.lab.scores',        'Scores ESG'),                description: t('cmd.dsc.scores',        'Score /100 par pilier E/S/G'),             path: '/app/scores',              icon: BarChart2,     category: 'module',   keywords: ['score','notation','pilier','esg'] },
    { id: 'esrs',          label: t('cmd.lab.esrs',          'Analyse ESRS / DMA'),        description: t('cmd.dsc.esrs',          'Gap analysis · 82 exigences'),             path: '/app/esrs-gap',            icon: BookOpen,      category: 'module',   keywords: ['esrs','gap','analysis','dma','exigences'] },
    { id: 'taxonomy',      label: t('cmd.lab.taxonomy',      'Taxonomie UE'),              description: t('cmd.dsc.taxonomy',      "6 objectifs · Éligibilité · Alignement"),  path: '/app/taxonomy',            icon: Layers,        category: 'module',   keywords: ['taxonomie','eligibilite','alignement','dnsh'] },
    { id: 'risks',         label: t('cmd.lab.risks',         'Registre des Risques'),      description: t('cmd.dsc.risks',         'Matrice probabilité / impact'),            path: '/app/risks',               icon: AlertTriangle, category: 'module',   keywords: ['risque','matrice','probabilite','impact'] },
    { id: 'reports',       label: t('cmd.lab.reports',       'Rapports'),                  description: t('cmd.dsc.reports',       'CSRD Builder · PDF · Word · Excel'),       path: '/app/reports',             icon: FileText,      category: 'module',   keywords: ['rapport','report','csrd','builder','pdf','export'] },
    { id: 'csrd',          label: t('cmd.lab.csrd',          'CSRD Builder'),              description: t('cmd.dsc.csrd',          'Rapport CSRD section par section'),        path: '/app/reports/csrd-builder',icon: FileText,      category: 'module',   keywords: ['csrd','builder','rapport','durabilite'] },
    { id: 'multi',         label: t('cmd.lab.multi',         'Multi-Référentiels'),        description: t('cmd.dsc.multi',         'GRI · CDP · TCFD · SDG mapping'),          path: '/app/reports/multi-standards',icon: GitMerge,   category: 'module',   keywords: ['multi','gri','cdp','tcfd','sdg','referentiel'] },
    { id: 'validation',    label: t('cmd.lab.validation',    'Workflow Validation'),        description: t('cmd.dsc.validation',    'Brouillon → Approuvé'),                    path: '/app/validation',          icon: CheckSquare,   category: 'module',   keywords: ['validation','workflow','approbation','brouillon'] },
    { id: 'benchmarking',  label: t('cmd.lab.benchmarking',  'Benchmarking'),              description: t('cmd.dsc.benchmarking',  'Comparatif sectoriel'),                    path: '/app/benchmarking',        icon: TrendingUp,    category: 'module',   keywords: ['benchmark','comparaison','secteur','percentile'] },
    { id: 'connectors',    label: t('cmd.lab.connectors',    'Connecteurs Data'),          description: t('cmd.dsc.connectors',    'SAP · Oracle · Workday'),                  path: '/app/connectors',          icon: Plug,          category: 'module',   keywords: ['connecteur','sap','oracle','integration','api'] },
    { id: 'insee',         label: t('cmd.lab.insee',         'Enrichissement INSEE'),      description: t('cmd.dsc.insee',         '10M+ entreprises · SIREN'),                path: '/app/settings/insee',      icon: Building2,     category: 'module',   keywords: ['insee','siren','siret','entreprise'] },
    { id: 'dataquality',   label: t('cmd.lab.dataquality',   'Qualité des Données'),       description: t('cmd.dsc.dataquality',   'Score complétude · Anomalies'),            path: '/app/data-quality',        icon: Activity,      category: 'module',   keywords: ['qualite','completude','anomalie','donnee'] },
    { id: 'lca',           label: t('cmd.lab.lca',           'Analyse Cycle de Vie'),      description: t('cmd.dsc.lca',           'LCA / ACV produits'),                      path: '/app/lca',                 icon: Leaf,          category: 'module',   keywords: ['lca','cycle','vie','acv','produit'] },
    { id: 'climate',       label: t('cmd.lab.climate',       'Scénarios Climatiques'),     description: t('cmd.dsc.climate',       'Stress tests climat'),                     path: '/app/climate-scenarios',   icon: Globe,         category: 'module',   keywords: ['scenario','climatique','stress','test'] },
    { id: 'data-entry',    label: t('cmd.lab.dataEntry',     'Saisie de données'),         description: t('cmd.dsc.dataEntry',     'Formulaire de saisie manuelle'),           path: '/app/data-entry',          icon: Database,      category: 'page',     keywords: ['saisie','donnee','formulaire','manuelle'] },
    { id: 'import',        label: t('cmd.lab.import',        'Import CSV'),                description: t('cmd.dsc.import',        'Importer un fichier CSV/Excel'),           path: '/app/import-csv',          icon: Upload,        category: 'page',     keywords: ['import','csv','excel','fichier'] },
    { id: 'my-data',       label: t('cmd.lab.myData',        'Mes données'),               description: t('cmd.dsc.myData',        'Tableau de bord données'),                 path: '/app/my-data',             icon: FileSpreadsheet,category: 'page',    keywords: ['mes','donnees','tableau'] },
    { id: 'indicators',    label: t('cmd.lab.indicators',    'Indicateurs'),               description: t('cmd.dsc.indicators',    'Liste des indicateurs ESG'),               path: '/app/indicators',          icon: BarChart3,     category: 'page',     keywords: ['indicateur','kpi','metrique'] },
    { id: 'organizations', label: t('cmd.lab.organizations', 'Organisations'),             description: t('cmd.dsc.organizations', 'Liste des organisations'),                 path: '/app/organizations',       icon: Building2,     category: 'page',     keywords: ['organisation','entite','filiale'] },
    { id: 'notifications', label: t('cmd.lab.notifications', 'Notifications'),             description: t('cmd.dsc.notifications', 'Centre de notifications'),                 path: '/app/notifications',       icon: Bell,          category: 'page',     keywords: ['notification','alerte','message'] },
    { id: 'settings',      label: t('cmd.lab.settings',      'Paramètres'),                description: t('cmd.dsc.settings',      'Configuration générale'),                  path: '/app/settings',            icon: Settings,      category: 'settings', keywords: ['parametre','configuration','general'] },
    { id: 'users',         label: t('cmd.lab.users',         'Utilisateurs'),              description: t('cmd.dsc.users',         'Gestion des utilisateurs'),                path: '/app/settings/users',      icon: Users,         category: 'settings', keywords: ['utilisateur','equipe','role','permission'] },
    { id: 'billing',       label: t('cmd.lab.billing',       'Facturation'),               description: t('cmd.dsc.billing',       'Abonnement et factures'),                  path: '/app/billing',             icon: CreditCard,    category: 'settings', keywords: ['facturation','abonnement','plan','paiement'] },
    { id: 'webhooks',      label: t('cmd.lab.webhooks',      'Webhooks'),                  description: t('cmd.dsc.webhooks',      'Événements et intégrations'),              path: '/app/settings/webhooks',   icon: Radio,         category: 'settings', keywords: ['webhook','evenement','integration'] },
    { id: 'api',           label: t('cmd.lab.api',           'API & Documentation'),       description: t('cmd.dsc.api',           'Portail développeur'),                     path: '/app/api-docs',            icon: Code2,         category: 'settings', keywords: ['api','documentation','swagger','developpeur'] },
    { id: 'profile',       label: t('cmd.lab.profile',       'Mon profil'),                description: t('cmd.dsc.profile',       'Informations personnelles'),               path: '/app/profile',             icon: Users,         category: 'settings', keywords: ['profil','compte','personnel'] },
  ];
}

function getCategoryLabels(t: TFunction): Record<string, string> {
  return {
    module: 'Modules',
    page: 'Pages',
    settings: t('cmd.catSettings', 'Paramètres'),
    action: 'Actions',
  };
}

interface CommandPaletteProps { isOpen: boolean; onClose: () => void; }

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const SEARCH_ITEMS   = useMemo(() => getSearchItems(t), [t]);
  const CATEGORY_LABELS = useMemo(() => getCategoryLabels(t), [t]);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) { setQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return SEARCH_ITEMS;
    const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return SEARCH_ITEMS.filter(item => {
      const haystack = [item.label, item.description, ...item.keywords].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return q.split(/\s+/).every(word => haystack.includes(word));
    });
  }, [query, SEARCH_ITEMS]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of results) { const arr = map.get(item.category) || []; arr.push(item); map.set(item.category, arr); }
    return map;
  }, [results]);

  const flatResults = useMemo(() => { const arr: SearchItem[] = []; for (const [, items] of grouped) arr.push(...items); return arr; }, [grouped]);

  useEffect(() => { if (selectedIndex >= flatResults.length) setSelectedIndex(Math.max(0, flatResults.length - 1)); }, [flatResults.length, selectedIndex]);
  useEffect(() => { const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); }, [selectedIndex]);

  const handleSelect = useCallback((item: SearchItem) => { onClose(); navigate(item.path); }, [onClose, navigate]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)); break;
      case 'ArrowUp':   e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); break;
      case 'Enter':     e.preventDefault(); if (flatResults[selectedIndex]) handleSelect(flatResults[selectedIndex]); break;
    }
  }, [flatResults, selectedIndex, handleSelect]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input ref={inputRef} type="text" value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={t('cmd.placeholder', 'Rechercher un module, une page, un paramètre…')}
            className="flex-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-transparent outline-none"
            autoComplete="off" spellCheck={false} />
          <button onClick={onClose} className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 transition-colors cursor-pointer" aria-label={t('cmd.close','Fermer')}>ESC</button>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {flatResults.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Search className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{t('cmd.noResults','Aucun résultat pour « {{q}} »',{q:query})}</p>
              <p className="text-xs text-gray-300 mt-1">{t('cmd.noResultsHint',"Essayez avec d'autres mots-clés")}</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 pt-3 pb-1"><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{CATEGORY_LABELS[category] || category}</span></div>
                {items.map(item => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button key={item.id} data-index={idx} onClick={() => handleSelect(item)} onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-emerald-100 dark:bg-emerald-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <item.icon className={`h-4 w-4 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'}`}>{item.label}</div>
                        <div className="text-xs text-gray-400 truncate">{item.description}</div>
                      </div>
                      {isSelected && <ArrowRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-[9px]">↑↓</kbd>{t('cmd.navigate','naviguer')}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-[9px]">↵</kbd>{t('cmd.open','ouvrir')}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-[9px]">esc</kbd>{t('cmd.closeKbd','fermer')}</span>
          </div>
          <span>{t('cmd.resultCount','{{n}} résultat{{s}}',{n:flatResults.length,s:flatResults.length>1?'s':''})}</span>
        </div>
      </div>
    </div>
  );
}
