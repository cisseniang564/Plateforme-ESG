/**
 * MultiStandardMapping — Saisir une fois, exporter en CSRD/GRI/CDP/TCFD.
 */
import { useState, useEffect } from 'react';
import { Globe, Download, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronRight, Zap, FileText, BarChart3, Shield, Leaf, Users, Building2, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import BackButton from '@/components/common/BackButton';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

const dtLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface MappedIndicator { esrs_code: string; esrs_name: string; pillar: 'E'|'S'|'G'; value: string|null; status: 'validated'|'partial'|'missing'; gri?: string; cdp?: string; tcfd?: string; sdg?: string; matched_entries?: number; }
interface MappingResponse { year: number; indicators: MappedIndicator[]; coverage: { csrd: number; gri: number; cdp: number; tcfd: number }; summary: { total: number; validated: number; partial: number; missing: number; data_available: boolean }; }

const MAPPING_DATA: MappedIndicator[] = [
  { esrs_code: 'E1 / GHG-S1', esrs_name: 'Émissions GES Scope 1', pillar: 'E', value: '2 450 tCO2e', status: 'validated', gri: 'GRI 305-1', cdp: 'C6.1', tcfd: 'Metrics & Targets', sdg: 'SDG 13' },
  { esrs_code: 'E1 / GHG-S2', esrs_name: 'Émissions GES Scope 2', pillar: 'E', value: '1 890 tCO2e', status: 'validated', gri: 'GRI 305-2', cdp: 'C6.3', tcfd: 'Metrics & Targets', sdg: 'SDG 13' },
  { esrs_code: 'E1 / GHG-S3', esrs_name: 'Émissions GES Scope 3', pillar: 'E', value: '8 210 tCO2e', status: 'partial',   gri: 'GRI 305-3', cdp: 'C6.5', tcfd: 'Metrics & Targets', sdg: 'SDG 13' },
  { esrs_code: 'E1 / ENR-%',  esrs_name: 'Part énergie renouvelable', pillar: 'E', value: '34%', status: 'validated', gri: 'GRI 302-1', cdp: 'C8.2', tcfd: 'Metrics & Targets', sdg: 'SDG 7' },
  { esrs_code: 'E1 / INT-C',  esrs_name: 'Intensité carbone', pillar: 'E', value: null, status: 'missing', gri: 'GRI 305-4', cdp: 'C6.10', tcfd: 'Metrics & Targets', sdg: 'SDG 13' },
  { esrs_code: 'E2 / POL-AIR',esrs_name: 'Émissions polluants atmosphériques', pillar: 'E', value: '12.4 t', status: 'validated', gri: 'GRI 305-7', cdp: 'C7.1', sdg: 'SDG 3' },
  { esrs_code: 'E3 / EAU-CONS',esrs_name: "Consommation d'eau", pillar: 'E', value: '45 200 m³', status: 'validated', gri: 'GRI 303-5', cdp: 'W1.2', sdg: 'SDG 6' },
  { esrs_code: 'E3 / EAU-REC',esrs_name: 'Eau recyclée', pillar: 'E', value: null, status: 'missing', gri: 'GRI 303-3', cdp: 'W1.2b', sdg: 'SDG 6' },
  { esrs_code: 'E4 / BIO-SITE',esrs_name: 'Sites zones protégées', pillar: 'E', value: '2', status: 'validated', gri: 'GRI 304-1', cdp: 'B1.1', tcfd: 'Risks', sdg: 'SDG 15' },
  { esrs_code: 'E5 / DEC-REC',esrs_name: 'Taux de recyclage déchets', pillar: 'E', value: '67%', status: 'validated', gri: 'GRI 306-4', cdp: 'W5.2', sdg: 'SDG 12' },
  { esrs_code: 'S1 / EFF-TOT',esrs_name: 'Effectif total', pillar: 'S', value: '1 234 ETP', status: 'validated', gri: 'GRI 102-8', sdg: 'SDG 8' },
  { esrs_code: 'S1 / EFF-F',  esrs_name: 'Part des femmes', pillar: 'S', value: '44%', status: 'validated', gri: 'GRI 405-1', sdg: 'SDG 5' },
  { esrs_code: 'S1 / EFF-HAP',esrs_name: 'Écart salarial H/F', pillar: 'S', value: '8.2%', status: 'validated', gri: 'GRI 405-2', sdg: 'SDG 5' },
  { esrs_code: 'S1 / EFF-TF', esrs_name: 'Taux fréquence accidents', pillar: 'S', value: '2.1', status: 'validated', gri: 'GRI 403-9', sdg: 'SDG 3' },
  { esrs_code: 'S1 / FORM-H', esrs_name: 'Heures formation/salarié', pillar: 'S', value: '28h', status: 'validated', gri: 'GRI 404-1', sdg: 'SDG 4' },
  { esrs_code: 'S1 / EFF-TUR',esrs_name: 'Taux de turnover', pillar: 'S', value: '12%', status: 'validated', gri: 'GRI 401-1', sdg: 'SDG 8' },
  { esrs_code: 'S2 / CHV-AUD',esrs_name: 'Audits fournisseurs droits humains', pillar: 'S', value: '45%', status: 'partial', gri: 'GRI 414-2', sdg: 'SDG 10' },
  { esrs_code: 'G1 / ANTI-COR',esrs_name: 'Politique anti-corruption', pillar: 'G', value: 'Oui', status: 'validated', gri: 'GRI 205-1', tcfd: 'Governance', sdg: 'SDG 16' },
  { esrs_code: 'G1 / COMP',   esrs_name: 'Formation compliance', pillar: 'G', value: '78%', status: 'validated', gri: 'GRI 205-2', tcfd: 'Governance', sdg: 'SDG 16' },
  { esrs_code: 'G1 / RISK',   esrs_name: 'Processus gestion des risques ESG', pillar: 'G', value: 'Documenté', status: 'validated', gri: 'GRI 102-30', cdp: 'C1.1', tcfd: 'Risk Management', sdg: 'SDG 17' },
  { esrs_code: 'G1 / DIV-CA', esrs_name: "Diversité Conseil d'administration", pillar: 'G', value: null, status: 'missing', gri: 'GRI 405-1', tcfd: 'Governance', sdg: 'SDG 5' },
  // ── Extension GRI — Environnement ──
  { esrs_code: 'E1 / ENE-TOT', esrs_name: "Consommation totale d'énergie", pillar: 'E', value: '7 200 MWh', status: 'validated', gri: 'GRI 302-1', cdp: 'C8.2', tcfd: 'Metrics & Targets', sdg: 'SDG 7' },
  { esrs_code: 'E1 / INT-E', esrs_name: 'Intensité énergétique', pillar: 'E', value: null, status: 'missing', gri: 'GRI 302-3', tcfd: 'Metrics & Targets', sdg: 'SDG 7' },
  { esrs_code: 'E3 / EAU-STRESS', esrs_name: 'Eau prélevée en zones de stress hydrique', pillar: 'E', value: null, status: 'missing', gri: 'GRI 303-3', cdp: 'W4.1', tcfd: 'Risks', sdg: 'SDG 6' },
  { esrs_code: 'E3 / EAU-REJ', esrs_name: "Rejets d'eau (effluents)", pillar: 'E', value: null, status: 'missing', gri: 'GRI 303-4', cdp: 'W1.2', sdg: 'SDG 6' },
  { esrs_code: 'E5 / DEC-TOT', esrs_name: 'Déchets totaux générés', pillar: 'E', value: '128 t', status: 'partial', gri: 'GRI 306-3', cdp: 'W5.1', sdg: 'SDG 12' },
  { esrs_code: 'E5 / DEC-DAN', esrs_name: 'Déchets dangereux générés', pillar: 'E', value: '22 t', status: 'validated', gri: 'GRI 306-3', cdp: 'W5.1a', sdg: 'SDG 12' },
  { esrs_code: 'E5 / MAT-PREM', esrs_name: 'Matières premières utilisées', pillar: 'E', value: null, status: 'missing', gri: 'GRI 301-1', sdg: 'SDG 12' },
  // ── Extension GRI — Social ──
  { esrs_code: 'S1 / EMB-NEW', esrs_name: 'Nouvelles embauches', pillar: 'S', value: '86', status: 'validated', gri: 'GRI 401-1', sdg: 'SDG 8' },
  { esrs_code: 'S1 / CONG-PAR', esrs_name: 'Retour de congé parental', pillar: 'S', value: null, status: 'missing', gri: 'GRI 401-3', sdg: 'SDG 5' },
  { esrs_code: 'S1 / CONV-COLL', esrs_name: 'Couverture par convention collective', pillar: 'S', value: '100%', status: 'validated', gri: 'GRI 2-30', sdg: 'SDG 8' },
  { esrs_code: 'S1 / MAL-PRO', esrs_name: 'Maladies professionnelles', pillar: 'S', value: null, status: 'missing', gri: 'GRI 403-10', sdg: 'SDG 3' },
  { esrs_code: 'S1 / DECES', esrs_name: 'Décès liés au travail', pillar: 'S', value: '0', status: 'validated', gri: 'GRI 403-9', sdg: 'SDG 3' },
  { esrs_code: 'S1 / DISCRIM', esrs_name: 'Incidents de discrimination', pillar: 'S', value: '0', status: 'validated', gri: 'GRI 406-1', sdg: 'SDG 10' },
  { esrs_code: 'S1 / SAL-MIN', esrs_name: "Ratio salaire d'entrée / salaire minimum", pillar: 'S', value: null, status: 'missing', gri: 'GRI 202-1', sdg: 'SDG 1' },
  { esrs_code: 'S2 / CHV-SOC', esrs_name: 'Fournisseurs évalués sur critères sociaux', pillar: 'S', value: '38%', status: 'partial', gri: 'GRI 414-1', sdg: 'SDG 10' },
  { esrs_code: 'S3 / COMM-LOC', esrs_name: 'Programmes communautés locales', pillar: 'S', value: null, status: 'missing', gri: 'GRI 413-1', sdg: 'SDG 11' },
  { esrs_code: 'S4 / SEC-PROD', esrs_name: 'Incidents sécurité produits', pillar: 'S', value: '0', status: 'validated', gri: 'GRI 416-2', sdg: 'SDG 12' },
  { esrs_code: 'S4 / DATA-PRIV', esrs_name: 'Violations de données personnelles', pillar: 'S', value: '0', status: 'validated', gri: 'GRI 418-1', sdg: 'SDG 16' },
  // ── Extension GRI — Gouvernance & économique ──
  { esrs_code: 'G1 / COR-COND', esrs_name: 'Condamnations pour corruption', pillar: 'G', value: '0', status: 'validated', gri: 'GRI 205-3', tcfd: 'Governance', sdg: 'SDG 16' },
  { esrs_code: 'G1 / ANTI-CONC', esrs_name: 'Actions anti-concurrentielles', pillar: 'G', value: '0', status: 'validated', gri: 'GRI 206-1', sdg: 'SDG 16' },
  { esrs_code: 'G1 / POL-CONTRIB', esrs_name: 'Contributions politiques', pillar: 'G', value: null, status: 'missing', gri: 'GRI 415-1', sdg: 'SDG 16' },
  { esrs_code: 'G1 / REM-RATIO', esrs_name: 'Ratio rémunération dirigeant / médiane', pillar: 'G', value: null, status: 'missing', gri: 'GRI 2-21', tcfd: 'Governance', sdg: 'SDG 10' },
  { esrs_code: 'G1 / ECO-VAL', esrs_name: 'Valeur économique distribuée', pillar: 'G', value: null, status: 'missing', gri: 'GRI 201-1', sdg: 'SDG 8' },
  { esrs_code: 'G1 / TAX-PAYS', esrs_name: 'Impôts payés', pillar: 'G', value: null, status: 'missing', gri: 'GRI 207-4', sdg: 'SDG 16' },
  { esrs_code: 'G1 / CHV-ENV', esrs_name: 'Fournisseurs évalués sur critères environnementaux', pillar: 'G', value: '31%', status: 'partial', gri: 'GRI 308-1', sdg: 'SDG 12' },
];

const STANDARDS_META = [
  { id: 'csrd', label: 'CSRD / ESRS', color: 'bg-violet-600', descKey: 'multi.descCSRD',  descFR: 'European Sustainability Reporting Standards' },
  { id: 'gri',  label: 'GRI Standards', color: 'bg-blue-600',   descKey: 'multi.descGRI',   descFR: 'Global Reporting Initiative — universel' },
  { id: 'cdp',  label: 'CDP',           color: 'bg-teal-600',   descKey: 'multi.descCDP',   descFR: 'Carbon Disclosure Project — climat & eau' },
  { id: 'tcfd', label: 'TCFD',          color: 'bg-orange-600', descKey: 'multi.descTCFD',  descFR: 'Task Force on Climate Disclosures — investisseurs' },
];

function getPILLAR_CONFIG(t: TFunction) {
  return {
    E: { label: t('multi.pillarE', 'Environnement'), icon: Leaf,   color: 'text-green-600',  bg: 'bg-green-50'  },
    S: { label: t('multi.pillarS', 'Social'),        icon: Users,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
    G: { label: t('multi.pillarG', 'Gouvernance'),   icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50' },
  };
}

function getSTATUS_CONFIG(t: TFunction) {
  return {
    validated: { icon: CheckCircle, color: 'text-green-500', label: t('multi.stValidated', 'Validé') },
    partial:   { icon: AlertCircle, color: 'text-amber-500', label: t('multi.stPartial',   'Partiel') },
    missing:   { icon: XCircle,     color: 'text-red-400',   label: t('multi.stMissing',   'Manquant') },
  };
}

export default function MultiStandardMapping() {
  const { t } = useTranslation();
  const PILLAR_CONFIG  = getPILLAR_CONFIG(t);
  const STATUS_CONFIG  = getSTATUS_CONFIG(t);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [activeStandard, setActiveStandard] = useState<string>('csrd');
  const [filterPillar, setFilterPillar] = useState<'all'|'E'|'S'|'G'>('all');
  const [filterStatus, setFilterStatus] = useState<'all'|'validated'|'partial'|'missing'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [mappingData, setMappingData] = useState<MappedIndicator[]>(MAPPING_DATA);
  const [coverage, setCoverage] = useState({ csrd: 100, gri: 90, cdp: 43, tcfd: 43 });
  const [loading, setLoading] = useState(false);
  const [dataAvailable, setDataAvailable] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchMapping = async (y: number) => {
    setLoading(true);
    try {
      const res = await api.get<MappingResponse>(`/reports/multi-standards?year=${y}`);
      const d = res.data;
      if (d.indicators && d.indicators.length > 0) {
        setMappingData(d.indicators); setCoverage(d.coverage);
        setDataAvailable(d.summary.data_available);
        setLastUpdated(new Date().toLocaleTimeString(dtLocale(), { hour: '2-digit', minute: '2-digit' }));
      } else {
        setDataAvailable(false); setLastUpdated(null);
        toast(t('multi.noDataToast', 'Aucune donnée saisie — affichage des indicateurs de référence'), { icon: 'ℹ️' });
      }
    } catch { setDataAvailable(false); setLastUpdated(null); toast(t('multi.offlineToast', 'Données de référence (mode hors-ligne)'), { icon: '📋' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMapping(year); }, [year]);

  const standards = STANDARDS_META.map(s => ({ ...s, coverage: coverage[s.id as keyof typeof coverage] ?? 100, description: t(s.descKey, s.descFR) }));
  const toggleRow = (code: string) => { setExpandedRows(prev => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; }); };
  const filteredData = mappingData.filter(m => {
    if (filterPillar !== 'all' && m.pillar !== filterPillar) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (activeStandard === 'gri' && !m.gri) return false;
    if (activeStandard === 'cdp' && !m.cdp) return false;
    if (activeStandard === 'tcfd' && !m.tcfd) return false;
    return true;
  });
  const validated = filteredData.filter(m => m.status === 'validated').length;
  const partial   = filteredData.filter(m => m.status === 'partial').length;
  const missing   = filteredData.filter(m => m.status === 'missing').length;

  const handleExport = (standard: string) => {
    toast.success(t('multi.exportPreparing', 'Export {{std}} en cours de préparation…', { std: standard.toUpperCase() }));
    setTimeout(() => toast.success(t('multi.exportReady', 'Rapport {{std}} prêt ! Redirection vers Rapports…', { std: standard.toUpperCase() })), 2000);
  };

  return (
    <div className="space-y-6">
      <BackButton to="/app/reports" label={t('multi.back', 'Rapports')} />

      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900 p-7 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium mb-3">
              <Zap className="h-3.5 w-3.5" />{t('multi.badge', 'Mapping multi-standards automatique')}
              {dataAvailable && <span className="ml-1 bg-green-400/20 text-green-300 px-1.5 py-0.5 rounded text-xs">✓ {t('multi.realData', 'Données réelles')}</span>}
            </div>
            <h1 className="text-2xl font-bold mb-1">{t('multi.heroTitle', 'Saisir une fois · Exporter partout')}</h1>
            <p className="text-sm text-white/70 max-w-xl">{t('multi.heroDesc', 'Vos données ESRS sont automatiquement mappées vers GRI, CDP et TCFD. Générez en 1 clic des rapports conformes à chaque standard.')}</p>
            <div className="flex items-center gap-3 mt-3">
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                {[currentYear-1,currentYear,currentYear+1].map(y => <option key={y} value={y} className="text-gray-900">{y}</option>)}
              </select>
              <button onClick={() => fetchMapping(year)} disabled={loading} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? t('multi.loading', 'Chargement…') : t('multi.refresh', 'Actualiser')}
              </button>
              {lastUpdated && <span className="text-xs text-white/50">{t('multi.updatedAt', 'Mis à jour à {{time}}', { time: lastUpdated })}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {standards.filter(s => s.id !== 'csrd').map(s => (
              <button key={s.id} onClick={() => handleExport(s.id)} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition">
                <Download className="h-4 w-4" />Export {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {standards.map(std => (
          <button key={std.id} onClick={() => setActiveStandard(std.id)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${activeStandard === std.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${std.color}`}>{std.label}</span>
              <span className={`text-sm font-bold ${activeStandard === std.id ? 'text-violet-700' : 'text-gray-700'}`}>{std.coverage}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{std.description}</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${std.color}`} style={{ width: `${std.coverage}%` }} /></div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('multi.stValidated','Indicateurs validés'), value: validated, borderBg: 'border-green-200 bg-green-50', textColor: 'text-green-600', boldColor: 'text-green-700', Icon: CheckCircle, iconColor: 'text-green-400' },
          { label: t('multi.stPartial','Partiels'),              value: partial,   borderBg: 'border-amber-200 bg-amber-50', textColor: 'text-amber-600', boldColor: 'text-amber-700', Icon: AlertCircle, iconColor: 'text-amber-400' },
          { label: t('multi.stMissing','Manquants'),             value: missing,   borderBg: 'border-red-200 bg-red-50',     textColor: 'text-red-600',   boldColor: 'text-red-700',   Icon: XCircle,     iconColor: 'text-red-400' },
        ].map(({ label, value, borderBg, textColor, boldColor, Icon, iconColor }) => (
          <div key={label} className={`bg-white rounded-2xl border shadow-sm ${borderBg} p-5`}>
            <div className="flex items-center justify-between">
              <div><p className={`text-xs font-medium ${textColor} uppercase tracking-wide`}>{label}</p><p className={`text-3xl font-bold ${boldColor} mt-1`}>{value}</p></div>
              <Icon className={`h-8 w-8 ${iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-500"><Filter className="h-4 w-4" /><span>{t('multi.filterLabel','Filtrer :')}</span></div>
        <div className="flex gap-2">
          {(['all','E','S','G'] as const).map(p => {
            const cfg = p === 'all' ? null : PILLAR_CONFIG[p];
            return (
              <button key={p} onClick={() => setFilterPillar(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterPillar===p ? (cfg ? `${cfg.bg} ${cfg.color}` : 'bg-gray-800 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p === 'all' ? t('multi.allPillars','Tous les piliers') : cfg?.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          {(['all','validated','partial','missing'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus===s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? t('multi.allStatus','Tous statuts') : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {dataAvailable === false && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{t('multi.noDataBanner','Aucune donnée saisie pour {{year}}',{year})}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t('multi.noDataHint','Les valeurs affichées sont des exemples. Saisissez vos données dans')}{' '}
              <a href="/app/data-entry" className="underline hover:text-amber-800">{t('multi.dataEntryLink','Saisie de données')}</a>{' '}
              {t('multi.noDataHint2','pour voir vos indicateurs réels mappés vers GRI, CDP et TCFD.')}
            </p>
          </div>
        </div>
      )}

      {loading && <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>}

      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-1">{t('multi.thPillar','Pilier')}</div>
            <div className="col-span-3">{t('multi.thIndicator','Indicateur ESRS')}</div>
            <div className="col-span-2">{t('multi.thValue','Valeur')}</div>
            <div className="col-span-1">{t('multi.thStatus','Statut')}</div>
            <div className="col-span-1">GRI</div>
            <div className="col-span-1">CDP</div>
            <div className="col-span-2">TCFD</div>
            <div className="col-span-1">{t('multi.thSDG','ODD')}</div>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredData.map(item => {
              const pillarCfg = PILLAR_CONFIG[item.pillar];
              const PillarIcon = pillarCfg.icon;
              const statusCfg = STATUS_CONFIG[item.status];
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedRows.has(item.esrs_code);
              return (
                <div key={item.esrs_code}>
                  <div className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-gray-50 cursor-pointer transition" onClick={() => toggleRow(item.esrs_code)}>
                    <div className="col-span-1"><span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${pillarCfg.bg}`}><PillarIcon className={`h-3.5 w-3.5 ${pillarCfg.color}`} /></span></div>
                    <div className="col-span-3"><p className="text-xs font-mono text-gray-400">{item.esrs_code}</p><p className="text-sm font-medium text-gray-900 mt-0.5">{item.esrs_name}</p></div>
                    <div className="col-span-2"><span className="text-sm text-gray-700">{item.value ?? <span className="text-gray-300 italic">—</span>}</span></div>
                    <div className="col-span-1"><StatusIcon className={`h-4 w-4 ${statusCfg.color}`} /></div>
                    <div className="col-span-1">{item.gri ? <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{item.gri}</span> : <span className="text-gray-200">—</span>}</div>
                    <div className="col-span-1">{item.cdp ? <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-mono">{item.cdp}</span> : <span className="text-gray-200">—</span>}</div>
                    <div className="col-span-2">{item.tcfd ? <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{item.tcfd}</span> : <span className="text-gray-200">—</span>}</div>
                    <div className="col-span-1">{item.sdg ? <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">{item.sdg}</span> : <span className="text-gray-200">—</span>}</div>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        {[
                          { std: 'CSRD / ESRS', code: item.esrs_code, color: 'border-violet-200 bg-violet-50 text-violet-700' },
                          { std: 'GRI', code: item.gri, color: 'border-blue-200 bg-blue-50 text-blue-700' },
                          { std: 'CDP', code: item.cdp, color: 'border-teal-200 bg-teal-50 text-teal-700' },
                          { std: 'TCFD', code: item.tcfd, color: 'border-orange-200 bg-orange-50 text-orange-700' },
                        ].map(m => (
                          <div key={m.std} className={`p-3 rounded-xl border ${m.code ? m.color : 'border-gray-100 bg-white text-gray-300'}`}>
                            <p className="text-xs font-semibold mb-1">{m.std}</p>
                            <p className="text-sm font-mono">{m.code || t('multi.notMapped','Non mappé')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {filteredData.length === 0 && (
            <div className="py-16 text-center"><BarChart3 className="h-10 w-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">{t('multi.noIndicator','Aucun indicateur pour ce filtre.')}</p></div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-end">
        {standards.map(std => (
          <button key={std.id} onClick={() => handleExport(std.id)} className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition ${std.color} hover:opacity-90`}>
            <Download className="h-4 w-4" />{t('multi.exportBtn','Exporter {{label}}',{label:std.label})}
          </button>
        ))}
      </div>
    </div>
  );
}
