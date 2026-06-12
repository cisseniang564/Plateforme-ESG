import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Building2,
  TrendingUp,
  Download,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowLeft,
  Search,
  MapPin,
  Users,
  Factory,
  ChevronRight,
  RefreshCw,
  Plus,
  Layers,
  Sparkles,
  X,
  Hash,
  FileSearch,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
}

interface Secteur {
  id: string;
  nom: string;
}

interface INSEECompany {
  siren?: string;
  siret?: string;
  denomination: string;
  activite_principale?: string;
  tranche_effectifs?: string;
  adresse?: {
    adresse_complete?: string;
    code_postal?: string;
    commune?: string;
  };
  etat_administratif?: string;
}

type SearchType = 'siren' | 'name' | 'siret';
type Mode = 'siren' | 'secteur';
type SirenStep = 'input' | 'preview' | 'confirm' | 'done';

const getEffectifsLabels = (t: TFunction): Record<string, string> => ({
  NN: t('enrich.effectifs.NN', 'Non précisé'), '00': t('enrich.effectifs.00', '0 salarié'), '01': t('enrich.effectifs.01', '1–2 salariés'), '02': t('enrich.effectifs.02', '3–5 salariés'),
  '03': t('enrich.effectifs.03', '6–9 salariés'), '11': t('enrich.effectifs.11', '10–19 salariés'), '12': t('enrich.effectifs.12', '20–49 salariés'),
  '21': t('enrich.effectifs.21', '50–99 salariés'), '22': t('enrich.effectifs.22', '100–199 salariés'), '31': t('enrich.effectifs.31', '200–249 salariés'),
  '32': t('enrich.effectifs.32', '250–499 salariés'), '41': t('enrich.effectifs.41', '500–999 salariés'), '42': t('enrich.effectifs.42', '1 000–1 999 salariés'),
  '51': t('enrich.effectifs.51', '2 000–4 999 salariés'), '52': t('enrich.effectifs.52', '5 000–9 999 salariés'), '53': t('enrich.effectifs.53', '10 000+ salariés'),
});

const QUICK_EXAMPLES = [
  { label: 'EDF',        siren: '552081317' },
  { label: 'LVMH',       siren: '908836505' },
  { label: 'Doctolib',   siren: '794598813' },
  { label: 'SNCF',       siren: '552049447' },
  { label: 'BNP Paribas',siren: '662042449' },
];

// ── Step indicator ──────────────────────────────────────────────
const getSteps = (t: TFunction) => [t('enrich.steps.search', 'Recherche'), t('enrich.steps.preview', 'Aperçu INSEE'), t('enrich.steps.confirm', 'Confirmation'), t('enrich.steps.done', 'Terminé')];
function StepIndicator({ current }: { current: SirenStep }) {
  const { t } = useTranslation();
  const STEPS = getSteps(t);
  const idx = { input: 0, preview: 1, confirm: 2, done: 3 }[current];
  return (
    <div className="flex items-center gap-0 select-none">
      {STEPS.map((label, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              active ? 'bg-teal-600 text-white shadow-sm shadow-teal-200' :
              done   ? 'bg-teal-100 text-teal-700' :
                       'bg-gray-100 text-gray-400'
            }`}>
              {done
                ? <CheckCircle className="h-3.5 w-3.5" />
                : <span className="w-3.5 h-3.5 flex items-center justify-center font-bold">{i + 1}</span>}
              {label}
            </div>
            {i < 3 && (
              <div className={`w-6 h-0.5 mx-0.5 rounded-full transition-colors ${i < idx ? 'bg-teal-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Search type pill button ─────────────────────────────────────
const getSearchOptions = (t: TFunction): { id: SearchType; icon: React.FC<{ className?: string }>; label: string; sublabel: string }[] => [
  { id: 'siren',  icon: Hash,       label: t('enrich.searchType.siren.label', 'Par SIREN'),     sublabel: t('enrich.searchType.siren.sub', '9 chiffres') },
  { id: 'name',   icon: Search,     label: t('enrich.searchType.name.label', 'Par nom'),        sublabel: t('enrich.searchType.name.sub', 'Recherche textuelle') },
  { id: 'siret',  icon: FileSearch, label: t('enrich.searchType.siret.label', 'Par SIRET'),     sublabel: t('enrich.searchType.siret.sub', '14 chiffres') },
];

export default function DataEnrichment() {
  const { t } = useTranslation();
  const EFFECTIFS_LABELS = getEffectifsLabels(t);
  const SEARCH_OPTIONS = getSearchOptions(t);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<Mode>('siren');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);

  // ── Search state ──
  const [searchType, setSearchType] = useState<SearchType>('siren');
  const [query, setQuery] = useState('');           // raw input
  const [siren, setSiren] = useState('');            // resolved 9-digit SIREN for API
  const [sirenStep, setSirenStep] = useState<SirenStep>('input');
  const [searching, setSearching] = useState(false);
  const [company, setCompany] = useState<INSEECompany | null>(null);
  const [searchError, setSearchError] = useState('');

  // ── Name autocomplete ──
  const [suggestions, setSuggestions] = useState<INSEECompany[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  // ── Enrichment ──
  const [selectedOrg, setSelectedOrg] = useState('');
  const [orgMode, setOrgMode] = useState<'existing' | 'new'>('new');
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);

  // ── Secteur flow ──
  const [selectedSecteur, setSelectedSecteur] = useState('');
  const [departement, setDepartement] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowSuggest(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    try {
      const [orgsRes, secteursRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/insee/secteurs'),
      ]);
      setOrganizations(orgsRes.data.items || []);
      setSecteurs(secteursRes.data.secteurs || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // ── Validation ──
  const rawQuery = query.replace(/[\s\-]/g, '');
  const sirenValid = searchType === 'siren' && rawQuery.length === 9 && /^\d{9}$/.test(rawQuery);
  const siretValid = searchType === 'siret' && rawQuery.length === 14 && /^\d{14}$/.test(rawQuery);
  const canSearch = sirenValid || siretValid;

  // ── Format helpers ──
  const formatSiren = (s: string) => {
    const d = s.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
    return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,9)}`;
  };
  const formatSiret = (s: string) => {
    const d = s.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
    return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9,14)}`;
  };

  // ── Query change handler ──
  const handleQueryChange = (value: string) => {
    setSearchError('');
    if (searchType === 'siren') {
      setQuery(value.replace(/\D/g, '').slice(0, 9));
    } else if (searchType === 'siret') {
      setQuery(value.replace(/\D/g, '').slice(0, 14));
    } else {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim().length >= 2) {
        setSuggestLoading(true);
        setShowSuggest(true);
        debounceRef.current = setTimeout(() => fetchSuggestions(value.trim()), 400);
      } else {
        setSuggestions([]);
        setShowSuggest(false);
        setSuggestLoading(false);
      }
    }
  };

  const fetchSuggestions = async (q: string) => {
    try {
      const res = await api.get('/insee/rechercher', { params: { q, nombre: 8 } });
      setSuggestions(res.data.entreprises || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSelectSuggestion = (comp: INSEECompany) => {
    setCompany(comp);
    setSiren(comp.siren || '');
    setQuery(comp.denomination);
    setShowSuggest(false);
    setSuggestions([]);
    setSirenStep('preview');
  };

  // ── SIREN / SIRET search ──
  const handleSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    setSearchError('');
    setCompany(null);
    try {
      const res = await api.get('/insee/rechercher', { params: { q: rawQuery, nombre: 1 } });
      const found = (res.data.entreprises || [])[0];
      if (found) {
        setCompany(found);
        setSiren(found.siren || rawQuery.slice(0, 9));
        setSirenStep('preview');
      } else {
        setSearchError(t('enrich.error.notFoundFor', 'Aucune entreprise trouvée pour ce {{type}} dans la base INSEE.', { type: searchType === 'siren' ? 'SIREN' : 'SIRET' }));
      }
    } catch (error: any) {
      setSearchError(error.response?.data?.detail || t('enrich.error.searchError', 'Erreur lors de la recherche INSEE.'));
    } finally {
      setSearching(false);
    }
  };

  // ── Enrichment ──
  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const orgId = orgMode === 'existing' ? selectedOrg : undefined;
      const res = await api.post('/esg-enrichment/enrichir-organisation', {
        organization_id: orgId,
        siren,
        generer_donnees: true,
      });
      setEnrichResult({ success: true, data: res.data });
      setSirenStep('done');
      await loadData();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : typeof detail === 'string' ? detail : t('enrich.enrichFailed', "Échec de l'enrichissement");
      setEnrichResult({ success: false, error: msg });
      setSirenStep('done');
    } finally {
      setEnriching(false);
    }
  };

  const handleImportSecteur = async () => {
    if (!selectedSecteur) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.post('/esg-enrichment/importer-secteur', {
        secteur: selectedSecteur,
        departement: departement || undefined,
      });
      setImportResult({ success: true, data: res.data });
      await loadData();
    } catch (error: any) {
      setImportResult({ success: false, error: error.response?.data?.detail || t('enrich.importFailed', "Échec de l'import") });
    } finally {
      setImporting(false);
    }
  };

  const resetFlow = () => {
    setQuery(''); setSiren(''); setSirenStep('input'); setCompany(null);
    setSearchError(''); setEnrichResult(null); setSelectedOrg(''); setOrgMode('new');
    setSuggestions([]); setShowSuggest(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const switchSearchType = (type: SearchType) => {
    setSearchType(type);
    setQuery('');
    setSearchError('');
    setSuggestions([]);
    setShowSuggest(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const displayQuery = searchType === 'siren' ? formatSiren(query)
    : searchType === 'siret' ? formatSiret(query)
    : query;

  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA2IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-40" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <button
              onClick={() => navigate('/app/settings')}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('enrich.hero.settings', 'Paramètres')}
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">{t('enrich.hero.dataAi', 'Données & IA')}</span>
              <span className="px-2.5 py-1 bg-teal-400/20 border border-teal-300/30 rounded-full text-xs font-semibold text-teal-100">{t('enrich.sireneBase', 'Base Sirene INSEE')}</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">{t('enrich.hero.title', 'Enrichissement ESG')}</h1>
            <p className="text-teal-100 text-sm max-w-lg">
              {t('enrich.hero.desc', "Connectez vos organisations aux données officielles INSEE et générez automatiquement 12 mois d'indicateurs ESG")}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { icon: Building2, label: t('enrich.hero.statOrgs', 'Organisations'), value: organizations.length },
              { icon: Database, label: t('enrich.hero.statSectors', 'Secteurs'), value: secteurs.length },
              { icon: Sparkles, label: t('enrich.hero.statMonths', 'Mois auto'), value: '12' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3.5 border border-white/20 min-w-[88px]">
                <Icon className="h-5 w-5 text-teal-200 mb-1.5" />
                <span className="text-2xl font-bold leading-none">{value}</span>
                <span className="text-xs text-teal-200 mt-1">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MODE TABS ══════════════════════════════════════════════ */}
      <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200/50">
        {[
          { id: 'siren' as Mode, icon: Search, label: t('enrich.mode.siren', 'Enrichir par SIREN') },
          { id: 'secteur' as Mode, icon: Layers, label: t('enrich.mode.secteur', 'Importer un secteur') },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              mode === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          SIREN / ENRICHISSEMENT MODE
      ══════════════════════════════════════════════════════════ */}
      {mode === 'siren' && (
        <div className="space-y-5">

          {/* Step progress */}
          <StepIndicator current={sirenStep} />

          {/* ── STEP 1 : SEARCH INPUT ───────────────────────────── */}
          {sirenStep === 'input' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="max-w-2xl mx-auto py-2">

                {/* Search type selector */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex bg-gray-100 p-1.5 rounded-2xl gap-1 border border-gray-200/60">
                    {SEARCH_OPTIONS.map(({ id, icon: Icon, label, sublabel }) => (
                      <button
                        key={id}
                        onClick={() => switchSearchType(id)}
                        className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 ${
                          searchType === id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${searchType === id ? 'text-teal-600' : 'text-gray-400'}`} />
                        <div className="text-left">
                          <p className="text-sm font-semibold leading-none">{label}</p>
                          <p className={`text-xs mt-0.5 leading-none ${searchType === id ? 'text-gray-500' : 'text-gray-400'}`}>{sublabel}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon + title */}
                <div className="text-center mb-7">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-teal-100">
                    {searchType === 'siren' && <Hash className="h-8 w-8 text-teal-600" />}
                    {searchType === 'name' && <Search className="h-8 w-8 text-teal-600" />}
                    {searchType === 'siret' && <FileSearch className="h-8 w-8 text-teal-600" />}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1.5">
                    {searchType === 'siren' && t('enrich.step1.titleSiren', 'Rechercher par numéro SIREN')}
                    {searchType === 'name' && t('enrich.step1.titleName', "Rechercher par nom d'entreprise")}
                    {searchType === 'siret' && t('enrich.step1.titleSiret', 'Rechercher par numéro SIRET')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {searchType === 'siren' && t('enrich.step1.descSiren', 'Entrez le numéro SIREN à 9 chiffres pour récupérer les données officielles')}
                    {searchType === 'name' && t('enrich.step1.descName', "Tapez le nom commercial ou la raison sociale pour trouver l'entreprise")}
                    {searchType === 'siret' && t('enrich.step1.descSiret', 'Entrez le numéro SIRET à 14 chiffres (SIREN + NIC établissement)')}
                  </p>
                </div>

                {/* ── Search input ── */}
                <div className="relative" ref={dropdownRef}>
                  <div className={`relative flex items-center border-2 rounded-2xl overflow-hidden transition-all duration-200 ${
                    searchError ? 'border-red-300 bg-red-50/20' :
                    canSearch   ? 'border-teal-400 bg-teal-50/20' :
                    searchType === 'name' && query.length >= 2 ? 'border-teal-300 bg-white' :
                    'border-gray-200 bg-white focus-within:border-teal-400 focus-within:bg-teal-50/10'
                  }`}>
                    <div className="pl-4 text-gray-400 flex-shrink-0">
                      <Search className="h-5 w-5" />
                    </div>
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={displayQuery}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canSearch && handleSearch()}
                      onFocus={() => searchType === 'name' && suggestions.length > 0 && setShowSuggest(true)}
                      placeholder={
                        searchType === 'siren' ? t('enrich.step1.phSiren', 'Ex : 552 081 317') :
                        searchType === 'name'  ? t('enrich.step1.phName', 'Ex : EDF, LVMH, Renault, Doctolib…') :
                        t('enrich.step1.phSiret', 'Ex : 55208131700063')
                      }
                      className={`flex-1 px-3 py-4 bg-transparent focus:outline-none ${
                        searchType !== 'name'
                          ? 'text-2xl font-mono tracking-widest text-center text-gray-800'
                          : 'text-base text-gray-800'
                      }`}
                    />
                    <div className="pr-3 flex items-center gap-1">
                      {query.length > 0 && (
                        <button
                          onClick={() => { setQuery(''); setSuggestions([]); setSearchError(''); setShowSuggest(false); }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {canSearch && <CheckCircle className="h-5 w-5 text-teal-500" />}
                      {searchType !== 'name' && !canSearch && query.length > 0 && (
                        <span className="text-xs font-semibold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          {rawQuery.length}/{searchType === 'siren' ? '9' : '14'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Name search dropdown ── */}
                  {searchType === 'name' && showSuggest && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/80 z-50 overflow-hidden">
                      {suggestLoading ? (
                        <div className="flex items-center gap-3 px-5 py-4 text-sm text-gray-500">
                          <Spinner />
                          {t('enrich.search.searchingSirene', 'Recherche dans la base Sirene…')}
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Search className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">{t('enrich.search.noCompany', 'Aucune entreprise trouvée')}</p>
                          <p className="text-xs text-gray-400">{t('enrich.search.tryAnother', 'Essayez avec un autre terme de recherche')}</p>
                        </div>
                      ) : (
                        <>
                          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {t('enrich.search.resultsFound', '{{count}} résultat{{ps}} trouvé{{ps}}', { count: suggestions.length, ps: suggestions.length > 1 ? 's' : '' })}
                            </span>
                            <span className="text-xs text-gray-400">{t('enrich.sireneBase', 'Base Sirene INSEE')}</span>
                          </div>
                          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50/80">
                            {suggestions.map((comp, i) => (
                              <li key={comp.siren || i}>
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSelectSuggestion(comp)}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-teal-50/50 transition-colors text-left group"
                                >
                                  <div className="w-9 h-9 bg-teal-50 group-hover:bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                                    <Building2 className="h-4 w-4 text-teal-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{comp.denomination}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      {comp.siren && (
                                        <span className="text-xs text-gray-400 font-mono">{comp.siren}</span>
                                      )}
                                      {comp.activite_principale && (
                                        <span className="text-xs text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md font-medium border border-teal-100">
                                          {comp.activite_principale}
                                        </span>
                                      )}
                                      {comp.adresse?.commune && (
                                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                          <MapPin className="h-3 w-3" />
                                          {comp.adresse.commune}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {comp.etat_administratif === 'A' && (
                                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-semibold">{t('enrich.active', 'Actif')}</span>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Error */}
                {searchError && (
                  <div className="flex items-center gap-2 p-3.5 mt-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    {searchError}
                  </div>
                )}

                {/* Search button — SIREN / SIRET only */}
                {searchType !== 'name' && (
                  <button
                    onClick={handleSearch}
                    disabled={!canSearch || searching}
                    className="w-full mt-4 py-3 text-base"
                  >
                    {searching ? (
                      <><Spinner /><span className="ml-2">{t('enrich.step1.searching', 'Recherche en cours…')}</span></>
                    ) : (
                      <><Search className="h-5 w-5 mr-2" />{t('enrich.step1.searchBtn', 'Rechercher dans la base INSEE')}</>
                    )}
                  </button>
                )}

                {/* Name search helper */}
                {searchType === 'name' && query.trim().length < 2 && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    {t('enrich.step1.nameHelper', 'Commencez à taper pour voir les suggestions apparaître automatiquement')}
                  </p>
                )}

                {/* Quick examples */}
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-center text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">{t('enrich.step1.examples', 'Exemples rapides')}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_EXAMPLES.map(({ label, siren: s }) => (
                      <button
                        key={label}
                        onClick={() => {
                          // Toujours basculer en mode SIREN et lancer la recherche directement
                          setSearchType('siren');
                          setQuery(s);
                          setSearchError('');
                          setSuggestions([]);
                          setShowSuggest(false);
                          setCompany(null);
                          setSirenStep('input');
                          // Lancer la recherche après le prochain rendu
                          setTimeout(async () => {
                            setSearching(true);
                            try {
                              const res = await (await import('@/services/api')).default.get(
                                '/insee/rechercher', { params: { q: s, nombre: 1 } }
                              );
                              const found = (res.data.entreprises || [])[0];
                              if (found) {
                                setCompany(found);
                                setSiren(found.siren || s);
                                setSirenStep('preview');
                              } else {
                                setSearchError(t('enrich.error.notFoundFor', 'Aucune entreprise trouvée pour ce {{type}} dans la base INSEE.', { type: 'SIREN' }));
                              }
                            } catch (err: any) {
                              setSearchError(err.response?.data?.detail || t('enrich.error.searchError', 'Erreur lors de la recherche INSEE.'));
                            } finally {
                              setSearching(false);
                            }
                          }, 0);
                        }}
                        className="group flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 hover:bg-teal-50 text-gray-600 hover:text-teal-700 text-xs font-medium rounded-xl transition-colors border border-gray-200 hover:border-teal-200"
                      >
                        <Building2 className="h-3 w-3 text-gray-400 group-hover:text-teal-500" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    <Trans i18nKey="enrich.search.worksFor">Fonctionne pour <strong className="text-gray-500">toute entreprise française</strong> avec un SIREN valide</Trans>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 : INSEE PREVIEW ───────────────────────────── */}
          {sirenStep === 'preview' && company && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                    <Building2 className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{company.denomination}</h2>
                      {company.etat_administratif === 'A' && (
                        <span className="px-2.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-semibold border border-green-200">
                          ✓ {t('enrich.active', 'Actif')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-400 font-mono">{t('enrich.preview.sirenLabel', 'SIREN : {{siren}}', { siren })}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-xs text-gray-400">{t('enrich.preview.officialData', 'Données officielles INSEE Sirene')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetFlow}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Data grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {company.activite_principale && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <Factory className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{t('enrich.preview.apeCode', 'Code APE')}</p>
                      <p className="text-sm font-semibold text-gray-900">{company.activite_principale}</p>
                    </div>
                  </div>
                )}
                {company.tranche_effectifs && company.tranche_effectifs !== 'NN' && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <Users className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{t('enrich.preview.headcount', 'Effectifs')}</p>
                      <p className="text-sm font-semibold text-gray-900">{EFFECTIFS_LABELS[company.tranche_effectifs] || company.tranche_effectifs}</p>
                    </div>
                  </div>
                )}
                {company.adresse?.adresse_complete && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <MapPin className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{t('enrich.preview.address', 'Adresse')}</p>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{company.adresse.adresse_complete}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={resetFlow}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('enrich.preview.newSearch', 'Nouvelle recherche')}
                </button>
                <button onClick={() => setSirenStep('confirm')} className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  {t('enrich.preview.enrichThis', 'Enrichir cette organisation')}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : CONFIRMATION ────────────────────────────── */}
          {sirenStep === 'confirm' && company && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-gradient-to-br from-teal-50 to-emerald-100 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
                  <Zap className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t('enrich.confirm.title', "Confirmer l'enrichissement")}</h2>
                  <p className="text-sm text-gray-500">{company.denomination} · SIREN {siren}</p>
                </div>
              </div>

              {/* Org linking */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">{t('enrich.confirm.linkLabel', 'Lier à une organisation ESG Flow')}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setOrgMode('new')}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      orgMode === 'new' ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${orgMode === 'new' ? 'bg-teal-100' : 'bg-gray-100'}`}>
                      <Plus className={`h-5 w-5 ${orgMode === 'new' ? 'text-teal-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${orgMode === 'new' ? 'text-teal-700' : 'text-gray-700'}`}>{t('enrich.confirm.createAuto', 'Créer automatiquement')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t('enrich.confirm.createAutoSub', 'Nouvelle organisation depuis INSEE')}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setOrgMode('existing')}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      orgMode === 'existing' ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${orgMode === 'existing' ? 'bg-teal-100' : 'bg-gray-100'}`}>
                      <Building2 className={`h-5 w-5 ${orgMode === 'existing' ? 'text-teal-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${orgMode === 'existing' ? 'text-teal-700' : 'text-gray-700'}`}>{t('enrich.confirm.linkExisting', "Lier à l'existante")}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t('enrich.confirm.linkExistingSub', 'Choisir dans la liste')}</p>
                    </div>
                  </button>
                </div>

                {orgMode === 'existing' && (
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    aria-label={t('enrich.confirm.selectOrgAria', 'Sélectionner une organisation')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400 text-sm bg-white appearance-none"
                  >
                    <option value="">{t('enrich.confirm.selectOrgOption', '— Sélectionner une organisation —')}</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}{org.external_id ? ` (${org.external_id})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* What will happen */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/70 rounded-2xl p-4 mb-5">
                <p className="text-sm font-semibold text-teal-800 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  {t('enrich.confirm.whatHappens', 'Ce qui va se passer')}
                </p>
                <ul className="space-y-2">
                  {[
                    t('enrich.confirm.list1', 'Récupération des données officielles INSEE (secteur, taille, adresse)'),
                    t('enrich.confirm.list2', 'Génération automatique de 12 mois de données ESG réalistes'),
                    t('enrich.confirm.list3', "Calcul des indicateurs selon le secteur d'activité et la taille"),
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-teal-700">
                      <CheckCircle className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSirenStep('preview')}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  {t('enrich.confirm.back', 'Retour')}
                </button>
                <button
                  onClick={handleEnrich}
                  disabled={enriching || (orgMode === 'existing' && !selectedOrg)}
                  className="flex-1"
                >
                  {enriching ? (
                    <><Spinner /><span className="ml-2">{t('enrich.confirm.enriching', 'Enrichissement en cours…')}</span></>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />{t('enrich.confirm.launch', "Lancer l'enrichissement ESG")}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4 : DONE ───────────────────────────────────── */}
          {sirenStep === 'done' && enrichResult && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              {enrichResult.success ? (
                <div className="space-y-6">
                  {/* Success header */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl flex items-center justify-center border border-green-200 shadow-sm">
                      <CheckCircle className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl">{t('enrich.done.success', 'Enrichissement réussi !')}</h3>
                      {enrichResult.data?.enrichissement?.organisation_creee && (
                        <p className="text-sm text-emerald-600 font-medium mt-0.5">
                          {t('enrich.done.orgCreated', '✦ Nouvelle organisation créée : {{name}}', { name: enrichResult.data.enrichissement.nom })}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-0.5">
                        {company?.denomination ?? enrichResult.data?.enrichissement?.nom} · SIREN {siren}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  {enrichResult.data?.donnees_generees && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: enrichResult.data.donnees_generees.metrics_count ?? enrichResult.data.donnees_generees.indicators_count, label: t('enrich.done.metrics', 'Métriques ESG'), color: 'green' },
                        { value: enrichResult.data.donnees_generees.data_points_created, label: t('enrich.done.dataPoints', 'Points de données'), color: 'blue' },
                        { value: enrichResult.data.donnees_generees.months_generated, label: t('enrich.done.monthsGen', 'Mois générés'), color: 'purple' },
                        { value: enrichResult.data.donnees_generees.secteur, label: t('enrich.done.sector', 'Secteur'), color: 'teal', small: true },
                      ].map(({ value, label, color, small }) => (
                        <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-2xl p-4 text-center`}>
                          <p className={`${small ? 'text-sm' : 'text-3xl'} font-bold text-${color}-600 mb-1`}>{value ?? '—'}</p>
                          <p className={`text-xs text-${color}-600 font-medium`}>{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <button onClick={() => navigate('/app/organizations')}>
                      <Building2 className="h-4 w-4 mr-2" />
                      {t('enrich.viewOrgs', 'Voir les organisations')}
                    </button>
                    <button onClick={resetFlow}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('enrich.done.newEnrich', 'Nouvel enrichissement')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-red-100">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{t('enrich.enrichFailed', "Échec de l'enrichissement")}</h3>
                      <p className="text-sm text-red-600">{enrichResult.error}</p>
                    </div>
                  </div>
                  <button onClick={() => setSirenStep('confirm')}>
                    {t('enrich.done.retry', 'Réessayer')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTEUR MODE
      ══════════════════════════════════════════════════════════ */}
      {mode === 'secteur' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-violet-100 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                <Layers className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t('enrich.secteur.title', 'Importer un secteur complet')}</h2>
                <p className="text-sm text-gray-500">{t('enrich.secteur.subtitle', "Crée automatiquement des organisations pour toutes les entreprises d'un secteur")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('enrich.secteur.sectorLabel', "Secteur d'activité")}</label>
                <select
                  value={selectedSecteur}
                  onChange={(e) => setSelectedSecteur(e.target.value)}
                  aria-label={t('enrich.secteur.sectorLabel', "Secteur d'activité")}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-sm bg-white appearance-none"
                >
                  <option value="">{t('enrich.secteur.selectOption', '— Sélectionner un secteur —')}</option>
                  {secteurs.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('enrich.secteur.deptLabel', 'Département')} <span className="font-normal text-gray-400">{t('enrich.secteur.optional', '(optionnel)')}</span>
                </label>
                <input
                  type="text"
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder={t('enrich.secteur.deptPlaceholder', 'ex : 75, 93, 69…')}
                  maxLength={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-sm"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 mb-5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  {t('enrich.secteur.warning', 'Cette action crée automatiquement des organisations pour toutes les entreprises du secteur sélectionné. Les doublons sont ignorés.')}
                </p>
              </div>
            </div>

            <button
              onClick={handleImportSecteur}
              disabled={importing || !selectedSecteur}
              className="w-full py-3"
            >
              {importing ? (
                <><Spinner /><span className="ml-2">{t('enrich.secteur.importing', 'Import en cours…')}</span></>
              ) : (
                <><Download className="h-4 w-4 mr-2" />{t('enrich.secteur.importBtn', 'Importer les entreprises du secteur')}</>
              )}
            </button>
          </div>

          {importResult && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              {importResult.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{t('enrich.secteur.importSuccess', 'Import réussi !')}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">{importResult.data.created}</p>
                      <p className="text-xs text-green-600 font-medium mt-1">{t('enrich.secteur.created', 'Créées')}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                      <p className="text-3xl font-bold text-gray-500">{importResult.data.skipped}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">{t('enrich.secteur.skipped', 'Ignorées')}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">{importResult.data.total_entreprises}</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">Total</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/app/organizations')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    {t('enrich.viewOrgs', 'Voir les organisations')}
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('enrich.secteur.importError', "Erreur lors de l'import")}</p>
                    <p className="text-sm text-red-600">{importResult.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Building2, color: 'blue', title: t('enrich.how.step1Title', '1. Sélectionner'), desc: t('enrich.how.step1Desc', "Choisissez un secteur d'activité parmi les secteurs à fort impact ESG") },
              { icon: TrendingUp, color: 'indigo', title: t('enrich.how.step2Title', '2. Importer'), desc: t('enrich.how.step2Desc', 'Toutes les entreprises actives du secteur sont importées depuis Sirene') },
              { icon: Sparkles, color: 'purple', title: t('enrich.how.step3Title', '3. Enrichir'), desc: t('enrich.how.step3Desc', 'Enrichissez ensuite chaque organisation individuellement via son SIREN') },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className={`flex items-start gap-3 p-4 bg-${color}-50 border border-${color}-100 rounded-2xl`}>
                <div className={`w-9 h-9 bg-${color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold text-${color}-800`}>{title}</p>
                  <p className={`text-xs text-${color}-600 mt-0.5 leading-relaxed`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
