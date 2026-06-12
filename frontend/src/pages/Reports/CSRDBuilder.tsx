/**
 * CSRD Builder — Constructeur de rapport CSRD/ESRS pas-à-pas.
 * Guide l'utilisateur à travers les 4 étapes de structuration
 * d'une déclaration de durabilité conforme ESRS.
 */
import { useState, useMemo, useEffect } from 'react';
import api from '@/services/api';
import {
  FileText, CheckCircle2, AlertCircle, XCircle, Download,
  ChevronRight, ChevronDown, ChevronUp, Building2,
  Leaf, Users, Shield, Globe, Calendar, Zap, BookOpen,
  Settings, Eye, Lock, ArrowRight, Sparkles, Copy, Check,
  X, FileSpreadsheet, FileJson, FileType,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import Spinner from '@/components/common/Spinner';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionStatus = 'included' | 'excluded' | 'mandatory';
type DataStatus = 'complete' | 'partial' | 'missing';

interface ESRSSection {
  code: string;
  label: string;
  shortLabel: string;
  pillar: 'cross' | 'E' | 'S' | 'G';
  mandatory: boolean;          // ESRS 2 = always mandatory
  defaultIncluded: boolean;
  disclosureCount: number;
  dataStatus: DataStatus;
  completionPct: number;
  description: string;
  keyTopics: string[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const getEsrsSections = (t: TFunction): ESRSSection[] => [
  {
    code: 'ESRS 2', label: t('csrd.sec.esrs2.label', 'Informations générales'), shortLabel: 'ESRS 2 Général',
    pillar: 'cross', mandatory: true, defaultIncluded: true,
    disclosureCount: 10, dataStatus: 'partial', completionPct: 65,
    description: t('csrd.sec.esrs2.desc', 'Gouvernance, stratégie, gestion des IRO et DMA. Requis pour toutes les entreprises CSRD.'),
    keyTopics: [t('csrd.kt.gov15', 'GOV-1 à GOV-5'), t('csrd.kt.sbm13', 'SBM-1 à SBM-3'), 'IRO-1 & IRO-2'],
  },
  {
    code: 'E1', label: t('csrd.sec.e1.label', 'Changement climatique'), shortLabel: 'E1 Climat',
    pillar: 'E', mandatory: false, defaultIncluded: true,
    disclosureCount: 9, dataStatus: 'partial', completionPct: 72,
    description: t('csrd.sec.e1.desc', 'Émissions GES Scope 1/2/3, plan de transition climatique, risques physiques et de transition.'),
    keyTopics: ['Scope 1, 2, 3', t('csrd.kt.transitionPlan', 'Plan de transition'), t('csrd.kt.sbtiTargets', 'Objectifs SBTi')],
  },
  {
    code: 'E2', label: t('csrd.sec.e2.label', 'Pollution'), shortLabel: 'E2 Pollution',
    pillar: 'E', mandatory: false, defaultIncluded: false,
    disclosureCount: 6, dataStatus: 'missing', completionPct: 15,
    description: t('csrd.sec.e2.desc', "Émissions polluantes dans l'air, l'eau et les sols. Substances préoccupantes (REACH)."),
    keyTopics: [t('csrd.kt.airPollutants', 'Polluants atmosphériques'), t('csrd.kt.reachSubstances', 'Substances REACH'), t('csrd.kt.soilWater', 'Sols et eaux')],
  },
  {
    code: 'E3', label: t('csrd.sec.e3.label', 'Eau et ressources marines'), shortLabel: 'E3 Eau',
    pillar: 'E', mandatory: false, defaultIncluded: true,
    disclosureCount: 5, dataStatus: 'partial', completionPct: 55,
    description: t('csrd.sec.e3.desc', "Consommation d'eau, zones à stress hydrique, ressources marines."),
    keyTopics: [t('csrd.kt.waterConsumption', 'Consommation eau'), t('csrd.kt.waterStress', 'Stress hydrique'), t('csrd.kt.marineResources', 'Ressources marines')],
  },
  {
    code: 'E4', label: t('csrd.sec.e4.label', 'Biodiversité et écosystèmes'), shortLabel: 'E4 Biodiversité',
    pillar: 'E', mandatory: false, defaultIncluded: false,
    disclosureCount: 6, dataStatus: 'missing', completionPct: 5,
    description: t('csrd.sec.e4.desc', 'Impacts sur la biodiversité, sites Natura 2000, déforestation, espèces menacées.'),
    keyTopics: [t('csrd.kt.protectedSites', 'Sites protégés'), 'TNFD', t('csrd.kt.deforestation', 'Déforestation')],
  },
  {
    code: 'E5', label: t('csrd.sec.e5.label', 'Utilisation des ressources'), shortLabel: 'E5 Ressources',
    pillar: 'E', mandatory: false, defaultIncluded: false,
    disclosureCount: 6, dataStatus: 'missing', completionPct: 20,
    description: t('csrd.sec.e5.desc', 'Économie circulaire, flux de ressources entrants/sortants, déchets.'),
    keyTopics: [t('csrd.kt.circularEconomy', 'Économie circulaire'), t('csrd.kt.waste', 'Déchets'), t('csrd.kt.rawMaterials', 'Matières premières')],
  },
  {
    code: 'S1', label: t('csrd.sec.s1.label', 'Effectifs propres'), shortLabel: 'S1 Effectifs',
    pillar: 'S', mandatory: false, defaultIncluded: true,
    disclosureCount: 17, dataStatus: 'partial', completionPct: 68,
    description: t('csrd.sec.s1.desc', 'Caractéristiques des employés, diversité, santé & sécurité, rémunération, formation.'),
    keyTopics: [t('csrd.kt.diversityInclusion', 'Diversité & inclusion'), t('csrd.kt.healthSafety', 'Santé & sécurité'), t('csrd.kt.genderPayGap', 'Écart salarial H/F')],
  },
  {
    code: 'S2', label: t('csrd.sec.s2.label', 'Travailleurs chaîne de valeur'), shortLabel: 'S2 Chaîne valeur',
    pillar: 'S', mandatory: false, defaultIncluded: false,
    disclosureCount: 5, dataStatus: 'missing', completionPct: 10,
    description: t('csrd.sec.s2.desc', 'Conditions de travail et droits humains chez les fournisseurs et sous-traitants.'),
    keyTopics: [t('csrd.kt.humanRights', 'Droits humains'), t('csrd.kt.supplierAudit', 'Audit fournisseurs'), t('csrd.kt.dutyVigilance', 'Devoir de vigilance')],
  },
  {
    code: 'S3', label: t('csrd.sec.s3.label', 'Communautés affectées'), shortLabel: 'S3 Communautés',
    pillar: 'S', mandatory: false, defaultIncluded: false,
    disclosureCount: 5, dataStatus: 'missing', completionPct: 0,
    description: t('csrd.sec.s3.desc', "Impact sur les communautés locales, populations autochtones, accès à l'eau."),
    keyTopics: [t('csrd.kt.localCommunities', 'Communautés locales'), 'FPIC', t('csrd.kt.territorialImpacts', 'Impacts territoriaux')],
  },
  {
    code: 'S4', label: t('csrd.sec.s4.label', 'Consommateurs'), shortLabel: 'S4 Consommateurs',
    pillar: 'S', mandatory: false, defaultIncluded: false,
    disclosureCount: 5, dataStatus: 'missing', completionPct: 8,
    description: t('csrd.sec.s4.desc', 'Sécurité des produits, vie privée, accès équitable, pratiques marketing.'),
    keyTopics: [t('csrd.kt.productSafety', 'Sécurité produits'), t('csrd.kt.personalData', 'Données personnelles'), t('csrd.kt.responsibleMarketing', 'Marketing responsable')],
  },
  {
    code: 'G1', label: t('csrd.sec.g1.label', 'Conduite des affaires'), shortLabel: 'G1 Gouvernance',
    pillar: 'G', mandatory: false, defaultIncluded: true,
    disclosureCount: 6, dataStatus: 'complete', completionPct: 88,
    description: t('csrd.sec.g1.desc', 'Anti-corruption, lobbying, relations fournisseurs, délais de paiement.'),
    keyTopics: ['Anti-corruption Sapin II', 'Whistleblowing', t('csrd.kt.supplierPaymentTerms', 'Délais fournisseurs')],
  },
];

const PILLAR_STYLE: Record<string, { bg: string; border: string; badge: string; icon: any; label: string }> = {
  cross: { bg: 'bg-gray-50',    border: 'border-gray-200',    badge: 'bg-gray-200 text-gray-700',    icon: Globe,     label: 'Transversal' },
  E:     { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: Leaf,   label: 'Environnement' },
  S:     { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',    icon: Users,     label: 'Social' },
  G:     { bg: 'bg-purple-50',  border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700', icon: Building2, label: 'Gouvernance' },
};

const getDataStatusCfg = (t: TFunction): Record<DataStatus, { label: string; cls: string; icon: any }> => ({
  complete: { label: t('csrd.ds.complete', 'Complet'),  cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  partial:  { label: t('csrd.ds.partial', 'Partiel'),  cls: 'bg-amber-100 text-amber-700',  icon: AlertCircle },
  missing:  { label: t('csrd.ds.missing', 'Manquant'), cls: 'bg-red-100 text-red-700',      icon: XCircle },
});

const getSteps = (t: TFunction) => [
  { id: 1, label: t('csrd.step.config', 'Configuration'),   icon: Settings },
  { id: 2, label: t('csrd.step.sections', 'Sections ESRS'),   icon: BookOpen },
  { id: 3, label: t('csrd.step.review', 'Revue des données'), icon: Eye },
  { id: 4, label: t('csrd.step.generation', 'Génération'),      icon: Download },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CSRDBuilder() {
  const { t } = useTranslation();
  const ESRS_SECTIONS = getEsrsSections(t);
  const DATA_STATUS_CFG = getDataStatusCfg(t);
  const STEPS = getSteps(t);
  const [step, setStep]                   = useState(1);
  const [reportYear, setReportYear]       = useState(2025);
  const [entityName, setEntityName]       = useState('');
  const [reportingScope, setReportingScope] = useState<'consolidated' | 'individual'>('consolidated');
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, SectionStatus>>(
    Object.fromEntries(ESRS_SECTIONS.map(s => [s.code, s.mandatory ? 'mandatory' : (s.defaultIncluded ? 'included' : 'excluded')]))
  );
  // Dynamic sections — start with static data, overwrite with real gap-analysis if available
  const [sections, setSections] = useState<ESRSSection[]>(ESRS_SECTIONS);

  useEffect(() => {
    api.get('/esrs/gap-analysis').then(res => {
      const items: any[] = res.data?.items ?? res.data ?? [];
      if (!items.length) return;
      // Build a lookup map by ESRS code
      const byCode: Record<string, any> = {};
      for (const item of items) {
        const code: string = item.esrs_code ?? item.code ?? '';
        if (code) byCode[code] = item;
      }
      setSections(prev => prev.map(sec => {
        const gap = byCode[sec.code];
        if (!gap) return sec;
        // Derive completionPct from API fields
        let completionPct = sec.completionPct;
        if (typeof gap.completion_pct === 'number') {
          completionPct = Math.round(gap.completion_pct);
        } else if (typeof gap.data_count === 'number' && typeof gap.required_count === 'number' && gap.required_count > 0) {
          completionPct = Math.min(100, Math.round((gap.data_count / gap.required_count) * 100));
        }
        // Derive dataStatus from completionPct
        const dataStatus: DataStatus = completionPct >= 80 ? 'complete' : completionPct > 0 ? 'partial' : 'missing';
        return { ...sec, completionPct, dataStatus };
      }));
    }).catch(() => {
      // Silently keep static fallback data
    });
  }, []);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [generating, setGenerating]       = useState(false);
  const [generated, setGenerated]         = useState(false);

  // ── AI narrative state ─────────────────────────────────────────────────────
  const [narrativeLoadingFor, setNarrativeLoadingFor] = useState<string | null>(null);
  const [narrativeOpen, setNarrativeOpen]   = useState<{ code: string; title: string; text: string; metricsUsed: number; totalAvailable: number } | null>(null);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [narrativeCopied, setNarrativeCopied] = useState(false);

  // Sections that the backend supports today (templates list in reports.py)
  const NARRATIVE_SUPPORTED = new Set(['ESRS 2', 'E1', 'E2', 'E3', 'E4', 'E5', 'S1', 'S2', 'S3', 'S4', 'G1']);

  const generateNarrative = async (sec: ESRSSection) => {
    setNarrativeError(null);
    setNarrativeLoadingFor(sec.code);
    try {
      const res = await api.post('/reports/generate-narrative', {
        esrs_section: sec.code,
        year: reportYear,
        organization_name: entityName || undefined,
        language: 'fr',
      });
      setNarrativeOpen({
        code: sec.code,
        title: res.data?.title ?? `${sec.code} — ${sec.label}`,
        text: res.data?.narrative ?? '',
        metricsUsed: res.data?.metrics_used ?? 0,
        totalAvailable: res.data?.total_metrics_available ?? 0,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 402) {
        setNarrativeError(t('csrd.err.aiPro', "La génération IA nécessite le plan Pro. Passez à un plan supérieur pour l'activer."));
      } else if (status === 404) {
        setNarrativeError(t('csrd.err.noTemplate', 'Aucun template disponible pour {{code}} pour le moment.', { code: sec.code }));
      } else {
        setNarrativeError(t('csrd.err.genFailed', 'Échec de la génération. Réessayez ou contactez le support.'));
      }
    } finally {
      setNarrativeLoadingFor(null);
    }
  };

  const copyNarrative = () => {
    if (!narrativeOpen) return;
    navigator.clipboard.writeText(narrativeOpen.text);
    setNarrativeCopied(true);
    setTimeout(() => setNarrativeCopied(false), 1800);
  };

  // ── Real download (replaces the demo timeout) ──────────────────────────────
  const downloadCSRD = async (format: 'pdf' | 'excel' | 'json') => {
    setGenerating(true);
    setGenerated(false);
    try {
      const res = await api.post(
        '/reports/generate',
        {
          report_type: 'csrd',
          period: 'annual',
          year: reportYear,
          format,
        },
        { responseType: 'blob' },
      );
      const ext = format === 'excel' ? 'xlsx' : format === 'json' ? 'json' : 'pdf';
      const blob = new Blob([res.data], {
        type:
          format === 'pdf'   ? 'application/pdf' :
          format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                                'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_csrd_${reportYear}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setGenerated(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 402) {
        setNarrativeError(t('csrd.err.exportStarter', "L'export CSRD nécessite le plan Starter ou supérieur."));
      } else {
        setNarrativeError(t('csrd.err.reportFailed', 'Échec de la génération du rapport.'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const includedSections = useMemo(() =>
    sections.filter(s => sectionStatuses[s.code] !== 'excluded'),
  [sections, sectionStatuses]);

  const totalDisclosures = useMemo(() =>
    includedSections.reduce((s, sec) => s + sec.disclosureCount, 0),
  [includedSections]);

  const avgCompletion = useMemo(() => {
    if (!includedSections.length) return 0;
    return Math.round(includedSections.reduce((s, sec) => s + sec.completionPct, 0) / includedSections.length);
  }, [includedSections]);

  const readinessColor = avgCompletion >= 70 ? 'text-green-600' : avgCompletion >= 40 ? 'text-amber-600' : 'text-red-600';

  const toggleSection = (code: string) => {
    if (sectionStatuses[code] === 'mandatory') return;
    setSectionStatuses(prev => ({
      ...prev,
      [code]: prev[code] === 'excluded' ? 'included' : 'excluded',
    }));
  };


  const pillarGroups: { pillar: string; label: string }[] = [
    { pillar: 'cross', label: t('csrd.group.cross', '⚙️ Exigences générales') },
    { pillar: 'E',     label: t('csrd.group.E', '🌿 Environnement') },
    { pillar: 'S',     label: t('csrd.group.S', '👥 Social') },
    { pillar: 'G',     label: t('csrd.group.G', '🏛️ Gouvernance') },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <BackButton />

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-emerald-600 to-teal-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="csrd" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20h40M20 0v40" stroke="white" strokeWidth="0.5" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#csrd)"/></svg>
        </div>
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CSRD Builder</h1>
              <p className="text-sm text-green-100 mt-0.5">{t('csrd.hdr.subtitle', 'Construisez votre déclaration de durabilité conforme ESRS')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-green-100">
            <span className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
              <Calendar className="h-4 w-4" /> {t('csrd.hdr.report', 'Rapport {{year}}', { year: reportYear })}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
              <Zap className="h-4 w-4" /> {t('csrd.hdr.stats', '{{sections}} sections · {{disclosures}} exigences', { sections: includedSections.length, disclosures: totalDisclosures })}
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="relative mt-6 flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => { if (s.id < step || s.id === step + 1) setStep(s.id); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    active ? 'bg-white text-green-700 shadow-md' :
                    done   ? 'text-green-100 hover:bg-white/10' :
                              'text-white/50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    done ? 'bg-green-400 text-white' :
                    active ? 'bg-green-600 text-white' :
                              'bg-white/20 text-white/50'
                  }`}>
                    {done ? '✓' : s.id}
                  </div>
                  <Icon className="h-4 w-4 hidden sm:block" />
                  <span className="hidden md:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-white/30 mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ════ STEP 1 — Configuration ════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-5">{t('csrd.s1.params', 'Paramètres du rapport')}</h2>
              <div className="space-y-4">
                {/* Entity name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('csrd.s1.entityName', "Nom de l'entité déclarante")}
                  </label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={e => setEntityName(e.target.value)}
                    placeholder={t('csrd.s1.entityPh', 'Ex : GreenConnect SA')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Reporting year */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('csrd.s1.year', 'Exercice de référence')}
                  </label>
                  <div className="flex gap-3">
                    {[2024, 2025, 2026].map(y => (
                      <button
                        key={y}
                        onClick={() => setReportYear(y)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                          reportYear === y
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reporting scope */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('csrd.s1.scope', 'Périmètre de reporting')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'consolidated', label: t('csrd.s1.consolidated', 'Consolidé'), desc: t('csrd.s1.consolidatedDesc', 'Groupe + filiales (>50% contrôle)'), icon: Building2 },
                      { key: 'individual',   label: t('csrd.s1.individual', 'Individuel'), desc: t('csrd.s1.individualDesc', 'Entité légale seule'), icon: Shield },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setReportingScope(opt.key as any)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            reportingScope === opt.key
                              ? 'border-green-400 bg-green-50 shadow-sm'
                              : 'border-gray-200 hover:border-green-200'
                          }`}
                        >
                          <Icon className={`h-5 w-5 mb-2 ${reportingScope === opt.key ? 'text-green-600' : 'text-gray-400'}`} />
                          <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* CSRD calendar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">{t('csrd.s1.calendar', "Calendrier d'entrée en vigueur CSRD")}</h2>
              <div className="space-y-2">
                {[
                  { year: '2025', label: t('csrd.cal.2025', 'Grandes entreprises (>500 salariés)'), active: true,  badge: 'bg-green-100 text-green-700' },
                  { year: '2026', label: t('csrd.cal.2026', 'Grandes entreprises (>250 salariés ou >40M€ CA)'),  active: false, badge: 'bg-blue-100 text-blue-700' },
                  { year: '2027', label: t('csrd.cal.2027', 'PME cotées (avec allègements)'),        active: false, badge: 'bg-gray-100 text-gray-600' },
                  { year: '2029', label: t('csrd.cal.2029', 'Entreprises pays tiers (>150M€ UE)'),   active: false, badge: 'bg-gray-100 text-gray-600' },
                ].map(r => (
                  <div key={r.year} className={`flex items-center gap-3 p-3 rounded-xl ${r.active ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${r.badge}`}>{r.year}</span>
                    <span className={`text-sm ${r.active ? 'font-semibold text-green-800' : 'text-gray-500'}`}>{r.label}</span>
                    {r.active && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <h3 className="font-bold text-green-900 mb-3">{t('csrd.s1.createTitle', '📋 Ce que vous allez créer')}</h3>
              <div className="space-y-2 text-sm text-green-800">
                {[
                  t('csrd.s1.create1', 'Déclaration de durabilité conforme ESRS'),
                  t('csrd.s1.create2', 'Double analyse de matérialité (DMA)'),
                  t('csrd.s1.create3', 'Données vérifiées par section ESRS'),
                  t('csrd.s1.create4', 'Export PDF + annexes tabulaires'),
                  t('csrd.s1.create5', "Prêt pour l'auditeur tiers (assurance limitée)"),
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-3">{t('csrd.s1.legalTitle', 'ℹ️ Références légales')}</h3>
              <div className="space-y-2 text-xs text-gray-500">
                <p>{t('csrd.s1.legal1', '• Directive CSRD (2022/2464/UE)')}</p>
                <p>{t('csrd.s1.legal2', '• ESRS Set 1 — EFRAG (août 2023)')}</p>
                <p>{t('csrd.s1.legal3', '• Règlement délégué 2023/2772')}</p>
                <p>{t('csrd.s1.legal4', '• ISAE 3000 (assurance limitée)')}</p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-colors text-sm shadow-md"
            >
              {t('csrd.s1.next', 'Suivant — Sélectionner les sections ESRS')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 2 — Section selection ════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Tip */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{t('csrd.s2.tipBold', 'Basé sur votre DMA —')}</span> {t('csrd.s2.tipText', 'Activez uniquement les sections pour lesquelles vous avez conclu à une matérialité (double). ESRS 2 est toujours obligatoire.')}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{includedSections.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('csrd.s2.statIncluded', 'Sections incluses')}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{totalDisclosures}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('csrd.s2.statDisclosures', 'Exigences ESRS')}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${readinessColor}`}>{avgCompletion}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('csrd.s2.statComplete', 'Données complètes')}</p>
            </div>
          </div>

          {/* Section groups */}
          {pillarGroups.map(({ pillar, label }) => {
            const pillarSections = sections.filter(s => s.pillar === pillar);
            const ps = PILLAR_STYLE[pillar];
            const PillarIcon = ps.icon;
            return (
              <div key={pillar} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Group header */}
                <div className={`flex items-center gap-3 px-5 py-3 ${ps.bg} border-b ${ps.border}`}>
                  <PillarIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-bold text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {t('csrd.s2.sectionsEnabled', '{{enabled}}/{{total}} sections activées', { enabled: pillarSections.filter(s => sectionStatuses[s.code] !== 'excluded').length, total: pillarSections.length })}
                  </span>
                </div>

                {/* Section rows */}
                <div className="divide-y divide-gray-50">
                  {pillarSections.map(sec => {
                    const status = sectionStatuses[sec.code];
                    const included = status !== 'excluded';
                    const dsCfg = DATA_STATUS_CFG[sec.dataStatus];
                    const DsIcon = dsCfg.icon;
                    const isExpanded = expandedSection === sec.code;
                    return (
                      <div key={sec.code} className={`transition-colors ${included ? '' : 'opacity-50'}`}>
                        <div className="flex items-center gap-4 px-5 py-3.5">
                          {/* Toggle */}
                          {sec.mandatory ? (
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-200 flex-shrink-0" title={t('csrd.s2.mandatory', 'Obligatoire')}>
                              <Lock className="h-3 w-3 text-gray-500" />
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleSection(sec.code)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                included
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {included && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </button>
                          )}

                          {/* Code badge */}
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 ${ps.badge}`}>
                            {sec.code}
                          </span>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{sec.label}</p>
                            <p className="text-xs text-gray-400">{t('csrd.s2.disclosures', '{{count}} exigences', { count: sec.disclosureCount })}</p>
                          </div>

                          {/* Data status */}
                          {included && (
                            <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${dsCfg.cls}`}>
                              <DsIcon className="h-3 w-3" />{dsCfg.label}
                            </span>
                          )}

                          {/* Expand */}
                          <button
                            onClick={() => setExpandedSection(isExpanded ? null : sec.code)}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className={`px-12 pb-4 ${ps.bg}`}>
                            <p className="text-xs text-gray-600 mb-2">{sec.description}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {sec.keyTopics.map(kt => (
                                <span key={kt} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ps.badge}`}>{kt}</span>
                              ))}
                            </div>
                            {included && (
                              <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>{t('csrd.s2.dataFilled', 'Données renseignées')}</span>
                                  <span className="font-semibold">{sec.completionPct}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full ${sec.completionPct >= 70 ? 'bg-green-500' : sec.completionPct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${sec.completionPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Nav buttons */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              {t('csrd.btn.back', '← Retour')}
            </button>
            <button onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-sm">
              {t('csrd.btn.dataReview', 'Revue des données')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 3 — Data review ══════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: t('csrd.s3.cardComplete', 'Sections complètes'),  val: includedSections.filter(s => s.dataStatus === 'complete').length,  cls: 'text-green-700', bg: 'bg-green-50 border-green-200' },
              { label: t('csrd.s3.cardPartial', 'Sections partielles'), val: includedSections.filter(s => s.dataStatus === 'partial').length,   cls: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
              { label: t('csrd.s3.cardMissing', 'Données manquantes'),  val: includedSections.filter(s => s.dataStatus === 'missing').length,   cls: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
            ].map(c => (
              <div key={c.label} className={`rounded-2xl border p-5 ${c.bg}`}>
                <p className={`text-3xl font-extrabold ${c.cls}`}>{c.val}</p>
                <p className="text-xs text-gray-600 mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Per-section review */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-800">{t('csrd.s3.detailTitle', 'Détail par section incluse')}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {includedSections.map(sec => {
                const ps = PILLAR_STYLE[sec.pillar];
                const dsCfg = DATA_STATUS_CFG[sec.dataStatus];
                const DsIcon = dsCfg.icon;
                const aiSupported = NARRATIVE_SUPPORTED.has(sec.code);
                const isLoadingAi = narrativeLoadingFor === sec.code;
                return (
                  <div key={sec.code} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 ${ps.badge}`}>{sec.code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{sec.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${sec.completionPct >= 70 ? 'bg-green-500' : sec.completionPct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${sec.completionPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{sec.completionPct}%</span>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${dsCfg.cls}`}>
                      <DsIcon className="h-3 w-3" />{dsCfg.label}
                    </span>
                    <span className="hidden sm:inline text-xs text-gray-400 flex-shrink-0">{t('csrd.s3.disclShort', '{{count}} exig.', { count: sec.disclosureCount })}</span>
                    {aiSupported && (
                      <button
                        type="button"
                        onClick={() => generateNarrative(sec)}
                        disabled={isLoadingAi}
                        title={t('csrd.s3.aiTitle', 'Générer la narration ESRS avec vos données')}
                        className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-semibold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors disabled:opacity-60 disabled:cursor-wait flex-shrink-0"
                      >
                        {isLoadingAi
                          ? <Spinner size="sm" />
                          : <Sparkles className="h-3.5 w-3.5" />}
                        <span className="hidden md:inline">{t('csrd.s3.aiNarrative', 'IA narrative')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advice */}
          {includedSections.some(s => s.dataStatus === 'missing') && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <span className="font-semibold">{t('csrd.s3.missingBold', 'Données manquantes détectées.')}</span> {t('csrd.s3.missingText1', 'Vous pouvez quand même générer le rapport — les sections incomplètes seront marquées')} <em>{t('csrd.s3.missingQuote', '"données non disponibles"')}</em> {t('csrd.s3.missingText2', "conformément à l'ESRS 1 §34.")}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              {t('csrd.btn.back', '← Retour')}
            </button>
            <button onClick={() => setStep(4)} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-sm">
              {t('csrd.btn.generate', 'Générer le rapport')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 4 — Generate ═════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-5">{t('csrd.s4.recapTitle', 'Récapitulatif du rapport CSRD')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: t('csrd.s4.entity', 'Entité'),          val: entityName || t('csrd.s4.notSpecified', 'Non renseignée') },
                { label: t('csrd.s4.exercise', 'Exercice'),         val: String(reportYear) },
                { label: t('csrd.s4.scope', 'Périmètre'),        val: reportingScope === 'consolidated' ? t('csrd.s1.consolidated', 'Consolidé') : t('csrd.s1.individual', 'Individuel') },
                { label: t('csrd.s4.avgCompletion', 'Complétude moy.'),  val: `${avgCompletion}%` },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{k.label}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{k.val}</p>
                </div>
              ))}
            </div>

            {/* Section list */}
            <div className="space-y-1.5">
              {includedSections.map((sec, i) => {
                const ps = PILLAR_STYLE[sec.pillar];
                return (
                  <div key={sec.code} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${ps.badge}`}>{sec.code}</span>
                    <span className="text-sm text-gray-700 flex-1">{sec.label}</span>
                    <span className={`text-xs font-medium ${sec.completionPct >= 70 ? 'text-green-600' : sec.completionPct >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
                      {sec.completionPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export options — vrais downloads via /reports/generate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => downloadCSRD('pdf')}
              disabled={generating}
              className="p-5 rounded-2xl border border-green-600 bg-green-600 hover:bg-green-700 text-white text-left transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              <FileType className="h-7 w-7 mb-2" />
              <div className="font-bold text-sm">{t('csrd.s4.genPdf', 'Générer PDF')}</div>
              <div className="text-xs mt-0.5 text-green-100">{t('csrd.s4.genPdfDesc', 'Rapport complet avec graphiques')}</div>
            </button>

            <button
              type="button"
              onClick={() => downloadCSRD('excel')}
              disabled={generating}
              className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 text-gray-700 text-left transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              <FileSpreadsheet className="h-7 w-7 mb-2 text-emerald-600" />
              <div className="font-bold text-sm">{t('csrd.s4.excel', 'Export Excel')}</div>
              <div className="text-xs mt-0.5 text-gray-400">{t('csrd.s4.excelDesc', 'Tableaux de données tabulaires (.xlsx)')}</div>
            </button>

            <button
              type="button"
              onClick={() => downloadCSRD('json')}
              disabled={generating}
              className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 text-gray-700 text-left transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              <FileJson className="h-7 w-7 mb-2 text-blue-600" />
              <div className="font-bold text-sm">{t('csrd.s4.json', 'Export JSON')}</div>
              <div className="text-xs mt-0.5 text-gray-400">{t('csrd.s4.jsonDesc', 'Structure machine pour intégration API')}</div>
            </button>

            <div className="relative p-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-left opacity-70 cursor-not-allowed">
              <FileText className="h-7 w-7 mb-2 text-gray-400" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-500">{t('csrd.s4.ixbrl', 'Export iXBRL')}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">{t('csrd.s4.soon', 'Bientôt')}</span>
              </div>
              <div className="text-xs mt-0.5 text-gray-400">{t('csrd.s4.ixbrlDesc', 'Format ESEF réglementaire')}</div>
            </div>
          </div>

          {/* Erreur unifiée (export OU narrative) */}
          {narrativeError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-red-700">{narrativeError}</div>
              <button onClick={() => setNarrativeError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Generation status */}
          {generating && (
            <div className="flex items-center gap-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">{t('csrd.s4.generating', 'Génération du rapport CSRD en cours…')}</p>
                <p className="text-xs text-blue-600 mt-0.5">{t('csrd.s4.generatingSteps', 'Compilation des sections ESRS · Mise en forme · Vérification de cohérence')}</p>
              </div>
            </div>
          )}

          {generated && !generating && (
            <div className="flex items-center gap-4 p-5 bg-green-50 border-2 border-green-300 rounded-2xl">
              <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-800">{t('csrd.s4.downloaded', 'Rapport CSRD téléchargé !')}</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {t('csrd.s4.downloadedDesc', 'Déclaration de durabilité {{year}} · {{sections}} sections · {{disclosures}} exigences ESRS — vérifiez votre dossier de téléchargement.', { year: reportYear, sections: includedSections.length, disclosures: totalDisclosures })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(3)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              {t('csrd.btn.back', '← Retour')}
            </button>
          </div>
        </div>
      )}

      {/* ════ AI Narrative modal ═══════════════════════════════════════════════ */}
      {narrativeOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setNarrativeOpen(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-5 border-b border-gray-100 bg-gradient-to-br from-violet-50 to-indigo-50">
              <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">{narrativeOpen.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('csrd.modal.fromData', 'Narration générée à partir de vos données ·')}{' '}
                  {narrativeOpen.metricsUsed > 0
                    ? t('csrd.modal.metricsUsed', '{{count}} indicateurs réels intégrés', { count: narrativeOpen.metricsUsed })
                    : (narrativeOpen.totalAvailable === 0
                        ? t('csrd.modal.noData', 'aucune donnée trouvée — texte basé uniquement sur le template ESRS')
                        : t('csrd.modal.stdTemplate', 'template ESRS standard'))}
                </p>
              </div>
              <button
                onClick={() => setNarrativeOpen(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0"
                aria-label={t('csrd.btn.close', 'Fermer')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — markdown-like rendering */}
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">{narrativeOpen.text}</pre>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                {t('csrd.modal.adapt', 'Adaptez ce texte à votre style éditorial avant publication.')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNarrativeOpen(null)}
                  className="px-4 h-9 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t('csrd.btn.close', 'Fermer')}
                </button>
                <button
                  onClick={copyNarrative}
                  className="inline-flex items-center gap-1.5 px-4 h-9 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                >
                  {narrativeCopied
                    ? <><Check className="h-4 w-4" />{t('csrd.btn.copied', 'Copié !')}</>
                    : <><Copy className="h-4 w-4" />{t('csrd.btn.copyText', 'Copier le texte')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
