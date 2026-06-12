/**
 * iXBRL / ESEF Tagging — CSRD Art. 8 + EFRAG ESRS Taxonomy
 * Permet de baliser un rapport CSRD en Inline XBRL (iXBRL) conformément
 * au Règlement délégué ESEF (UE) 2019/815 modifié pour CSRD 2025.
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { toast } from 'react-hot-toast';
import {
  FileCode2, Search, Tag, CheckCircle2, XCircle, AlertTriangle,
  Download, ChevronDown, ChevronRight, Info, Copy, RefreshCw,
  BookOpen, Layers, FileText, Zap, Check, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface XBRLConcept {
  id: string;
  label: string;
  labelFr: string;
  namespace: 'esrs' | 'esrs-e' | 'esrs-s' | 'esrs-g' | 'ifrs' | 'dei';
  dataType: 'string' | 'decimal' | 'boolean' | 'date' | 'textBlock' | 'integer';
  periodType: 'instant' | 'duration';
  standard: string;
  disclosure: string;
  required: boolean;
}

interface TaggedSegment {
  id: string;
  conceptId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  contextRef: string;
  unitRef?: string;
  value: string;
  decimals?: string;
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  conceptId?: string;
  rule?: string;
}

// ─── EFRAG ESRS XBRL Taxonomy (subset — éléments obligatoires) ────────────────

const getESRSConcepts = (t: TFunction): XBRLConcept[] => [
  // ── IRO & Gouvernance ──────────────────────────────────────────────────────
  { id: 'esrs:DescriptionOfRisksAndOpportunities', label: 'DescriptionOfRisksAndOpportunities', labelFr: t('compliance.ixbrl.concepts.DescriptionOfRisksAndOpportunities', 'Description des risques et opportunités matériels'), namespace: 'esrs', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS 1', disclosure: 'IRO-1', required: true },
  { id: 'esrs:DescriptionOfMaterialityAssessmentProcess', label: 'DescriptionOfMaterialityAssessmentProcess', labelFr: t('compliance.ixbrl.concepts.DescriptionOfMaterialityAssessmentProcess', "Processus d'évaluation de double matérialité"), namespace: 'esrs', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS 1', disclosure: 'SBM-3', required: true },
  { id: 'esrs:DescriptionOfValueChain', label: 'DescriptionOfValueChain', labelFr: t('compliance.ixbrl.concepts.DescriptionOfValueChain', 'Description de la chaîne de valeur'), namespace: 'esrs', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS 1', disclosure: 'SBM-1', required: true },
  { id: 'esrs:DescriptionOfBusinessModel', label: 'DescriptionOfBusinessModel', labelFr: t('compliance.ixbrl.concepts.DescriptionOfBusinessModel', "Description du modèle d'affaires"), namespace: 'esrs', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS 1', disclosure: 'SBM-1', required: true },
  { id: 'esrs:SustainabilityGovernanceStructureDescription', label: 'SustainabilityGovernanceStructureDescription', labelFr: t('compliance.ixbrl.concepts.SustainabilityGovernanceStructureDescription', 'Structure de gouvernance durabilité (rôles, responsabilités)'), namespace: 'esrs', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS 2', disclosure: 'GOV-1', required: true },
  { id: 'esrs:DescriptionOfProcessForEngagingWithStakeholders', label: 'DescriptionOfProcessForEngagingWithStakeholders', labelFr: t('compliance.ixbrl.concepts.DescriptionOfProcessForEngagingWithStakeholders', "Processus d'engagement avec les parties prenantes"), namespace: 'esrs', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS 2', disclosure: 'SBM-2', required: true },

  // ── Environnement E1 ───────────────────────────────────────────────────────
  { id: 'esrs-e:GrossScope1GHGEmissions', label: 'GrossScope1GHGEmissions', labelFr: t('compliance.ixbrl.concepts.GrossScope1GHGEmissions', 'Émissions GES brutes Scope 1 (tCO₂e)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-6', required: true },
  { id: 'esrs-e:GrossScope2GHGEmissionsLocationBased', label: 'GrossScope2GHGEmissionsLocationBased', labelFr: t('compliance.ixbrl.concepts.GrossScope2GHGEmissionsLocationBased', 'Émissions GES brutes Scope 2 — localisation (tCO₂e)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-6', required: true },
  { id: 'esrs-e:GrossScope2GHGEmissionsMarketBased', label: 'GrossScope2GHGEmissionsMarketBased', labelFr: t('compliance.ixbrl.concepts.GrossScope2GHGEmissionsMarketBased', 'Émissions GES brutes Scope 2 — marché (tCO₂e)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-6', required: false },
  { id: 'esrs-e:TotalGHGEmissionsScope3', label: 'TotalGHGEmissionsScope3', labelFr: t('compliance.ixbrl.concepts.TotalGHGEmissionsScope3', 'Émissions GES totales Scope 3 (tCO₂e)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-6', required: false },
  { id: 'esrs-e:TotalGHGEmissions', label: 'TotalGHGEmissions', labelFr: t('compliance.ixbrl.concepts.TotalGHGEmissions', 'Émissions GES totales (Scope 1+2+3) (tCO₂e)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-6', required: true },
  { id: 'esrs-e:GHGEmissionsIntensityPerNetRevenue', label: 'GHGEmissionsIntensityPerNetRevenue', labelFr: t('compliance.ixbrl.concepts.GHGEmissionsIntensityPerNetRevenue', "Intensité carbone par chiffre d'affaires net (tCO₂e/M€)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-6', required: true },
  { id: 'esrs-e:GHGEmissionReductionTargetYear', label: 'GHGEmissionReductionTargetYear', labelFr: t('compliance.ixbrl.concepts.GHGEmissionReductionTargetYear', 'Année cible de réduction GES'), namespace: 'esrs-e', dataType: 'integer', periodType: 'instant', standard: 'ESRS E1', disclosure: 'E1-4', required: true },
  { id: 'esrs-e:GHGEmissionReductionTargetPercentage', label: 'GHGEmissionReductionTargetPercentage', labelFr: t('compliance.ixbrl.concepts.GHGEmissionReductionTargetPercentage', 'Pourcentage de réduction GES cible (%)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'instant', standard: 'ESRS E1', disclosure: 'E1-4', required: true },
  { id: 'esrs-e:EnergyConsumptionFromFossilSources', label: 'EnergyConsumptionFromFossilSources', labelFr: t('compliance.ixbrl.concepts.EnergyConsumptionFromFossilSources', "Consommation d'énergie fossile (MWh)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-5', required: true },
  { id: 'esrs-e:EnergyConsumptionFromNuclearSources', label: 'EnergyConsumptionFromNuclearSources', labelFr: t('compliance.ixbrl.concepts.EnergyConsumptionFromNuclearSources', "Consommation d'énergie nucléaire (MWh)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-5', required: false },
  { id: 'esrs-e:EnergyConsumptionFromRenewableSources', label: 'EnergyConsumptionFromRenewableSources', labelFr: t('compliance.ixbrl.concepts.EnergyConsumptionFromRenewableSources', "Consommation d'énergie renouvelable (MWh)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-5', required: true },
  { id: 'esrs-e:TotalEnergyConsumption', label: 'TotalEnergyConsumption', labelFr: t('compliance.ixbrl.concepts.TotalEnergyConsumption', "Consommation totale d'énergie (MWh)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-5', required: true },
  { id: 'esrs-e:EnergyIntensityPerNetRevenue', label: 'EnergyIntensityPerNetRevenue', labelFr: t('compliance.ixbrl.concepts.EnergyIntensityPerNetRevenue', "Intensité énergétique par chiffre d'affaires (MWh/M€)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E1', disclosure: 'E1-5', required: true },
  { id: 'esrs-e:TotalWaterWithdrawal', label: 'TotalWaterWithdrawal', labelFr: t('compliance.ixbrl.concepts.TotalWaterWithdrawal', "Prélèvement total d'eau (m³)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E3', disclosure: 'E3-4', required: false },
  { id: 'esrs-e:TotalWaterDischarge', label: 'TotalWaterDischarge', labelFr: t('compliance.ixbrl.concepts.TotalWaterDischarge', "Rejets d'eau totaux (m³)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E3', disclosure: 'E3-4', required: false },
  { id: 'esrs-e:TotalWaterConsumption', label: 'TotalWaterConsumption', labelFr: t('compliance.ixbrl.concepts.TotalWaterConsumption', "Consommation nette d'eau (m³)"), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E3', disclosure: 'E3-4', required: false },
  { id: 'esrs-e:TotalWasteGenerated', label: 'TotalWasteGenerated', labelFr: t('compliance.ixbrl.concepts.TotalWasteGenerated', 'Déchets totaux générés (tonnes)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E5', disclosure: 'E5-5', required: false },
  { id: 'esrs-e:HazardousWasteGenerated', label: 'HazardousWasteGenerated', labelFr: t('compliance.ixbrl.concepts.HazardousWasteGenerated', 'Déchets dangereux générés (tonnes)'), namespace: 'esrs-e', dataType: 'decimal', periodType: 'duration', standard: 'ESRS E5', disclosure: 'E5-5', required: false },

  // ── Social S1 ──────────────────────────────────────────────────────────────
  { id: 'esrs-s:TotalNumberOfEmployees', label: 'TotalNumberOfEmployees', labelFr: t('compliance.ixbrl.concepts.TotalNumberOfEmployees', 'Nombre total de salariés (ETP)'), namespace: 'esrs-s', dataType: 'integer', periodType: 'instant', standard: 'ESRS S1', disclosure: 'S1-6', required: true },
  { id: 'esrs-s:NumberOfPermanentEmployees', label: 'NumberOfPermanentEmployees', labelFr: t('compliance.ixbrl.concepts.NumberOfPermanentEmployees', 'Salariés en CDI'), namespace: 'esrs-s', dataType: 'integer', periodType: 'instant', standard: 'ESRS S1', disclosure: 'S1-6', required: true },
  { id: 'esrs-s:NumberOfTemporaryEmployees', label: 'NumberOfTemporaryEmployees', labelFr: t('compliance.ixbrl.concepts.NumberOfTemporaryEmployees', 'Salariés en CDD / temporaires'), namespace: 'esrs-s', dataType: 'integer', periodType: 'instant', standard: 'ESRS S1', disclosure: 'S1-6', required: true },
  { id: 'esrs-s:NumberOfNonEmployeeWorkers', label: 'NumberOfNonEmployeeWorkers', labelFr: t('compliance.ixbrl.concepts.NumberOfNonEmployeeWorkers', 'Travailleurs non-salariés (intérimaires, sous-traitants)'), namespace: 'esrs-s', dataType: 'integer', periodType: 'instant', standard: 'ESRS S1', disclosure: 'S1-6', required: false },
  { id: 'esrs-s:PercentageOfFemaleEmployees', label: 'PercentageOfFemaleEmployees', labelFr: t('compliance.ixbrl.concepts.PercentageOfFemaleEmployees', 'Pourcentage de femmes dans les effectifs (%)'), namespace: 'esrs-s', dataType: 'decimal', periodType: 'instant', standard: 'ESRS S1', disclosure: 'S1-6', required: true },
  { id: 'esrs-s:GenderPayGap', label: 'GenderPayGap', labelFr: t('compliance.ixbrl.concepts.GenderPayGap', 'Écart de rémunération femmes/hommes (%)'), namespace: 'esrs-s', dataType: 'decimal', periodType: 'duration', standard: 'ESRS S1', disclosure: 'S1-16', required: true },
  { id: 'esrs-s:WorkRelatedInjuriesIncidentRate', label: 'WorkRelatedInjuriesIncidentRate', labelFr: t('compliance.ixbrl.concepts.WorkRelatedInjuriesIncidentRate', 'Taux de fréquence des accidents du travail'), namespace: 'esrs-s', dataType: 'decimal', periodType: 'duration', standard: 'ESRS S1', disclosure: 'S1-14', required: true },
  { id: 'esrs-s:NumberOfWorkRelatedFatalities', label: 'NumberOfWorkRelatedFatalities', labelFr: t('compliance.ixbrl.concepts.NumberOfWorkRelatedFatalities', 'Nombre de décès liés au travail'), namespace: 'esrs-s', dataType: 'integer', periodType: 'duration', standard: 'ESRS S1', disclosure: 'S1-14', required: true },
  { id: 'esrs-s:TrainingHoursPerEmployee', label: 'TrainingHoursPerEmployee', labelFr: t('compliance.ixbrl.concepts.TrainingHoursPerEmployee', 'Heures de formation par salarié'), namespace: 'esrs-s', dataType: 'decimal', periodType: 'duration', standard: 'ESRS S1', disclosure: 'S1-13', required: false },
  { id: 'esrs-s:PercentageEmployeesCoveredByCollectiveBargaining', label: 'PercentageEmployeesCoveredByCollectiveBargaining', labelFr: t('compliance.ixbrl.concepts.PercentageEmployeesCoveredByCollectiveBargaining', 'Salariés couverts par conventions collectives (%)'), namespace: 'esrs-s', dataType: 'decimal', periodType: 'instant', standard: 'ESRS S1', disclosure: 'S1-8', required: true },
  { id: 'esrs-s:CEOPayRatio', label: 'CEOPayRatio', labelFr: t('compliance.ixbrl.concepts.CEOPayRatio', 'Ratio rémunération PDG / médiane des salariés'), namespace: 'esrs-s', dataType: 'decimal', periodType: 'duration', standard: 'ESRS S1', disclosure: 'S1-16', required: true },

  // ── Gouvernance G1 ─────────────────────────────────────────────────────────
  { id: 'esrs-g:DescriptionOfAntiCorruptionPolicies', label: 'DescriptionOfAntiCorruptionPolicies', labelFr: t('compliance.ixbrl.concepts.DescriptionOfAntiCorruptionPolicies', 'Description des politiques anti-corruption'), namespace: 'esrs-g', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS G1', disclosure: 'G1-1', required: true },
  { id: 'esrs-g:NumberOfConvictionsForViolationsOfAntiCorruption', label: 'NumberOfConvictionsForViolationsOfAntiCorruption', labelFr: t('compliance.ixbrl.concepts.NumberOfConvictionsForViolationsOfAntiCorruption', 'Nombre de condamnations pour corruption'), namespace: 'esrs-g', dataType: 'integer', periodType: 'duration', standard: 'ESRS G1', disclosure: 'G1-4', required: true },
  { id: 'esrs-g:NumberOfAntiCorruptionTrainees', label: 'NumberOfAntiCorruptionTrainees', labelFr: t('compliance.ixbrl.concepts.NumberOfAntiCorruptionTrainees', "Nombre de personnes formées à l'anti-corruption"), namespace: 'esrs-g', dataType: 'integer', periodType: 'duration', standard: 'ESRS G1', disclosure: 'G1-4', required: false },
  { id: 'esrs-g:DescriptionOfPaymentPractices', label: 'DescriptionOfPaymentPractices', labelFr: t('compliance.ixbrl.concepts.DescriptionOfPaymentPractices', 'Description des pratiques de paiement (délais fournisseurs)'), namespace: 'esrs-g', dataType: 'textBlock', periodType: 'duration', standard: 'ESRS G1', disclosure: 'G1-6', required: true },
  { id: 'esrs-g:AverageDaysPayableOutstanding', label: 'AverageDaysPayableOutstanding', labelFr: t('compliance.ixbrl.concepts.AverageDaysPayableOutstanding', 'Délai de paiement moyen fournisseurs (jours)'), namespace: 'esrs-g', dataType: 'decimal', periodType: 'duration', standard: 'ESRS G1', disclosure: 'G1-6', required: true },
];

// ─── Colours per namespace ────────────────────────────────────────────────────

const NS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'esrs':   { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'ESRS 1&2' },
  'esrs-e': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'E1-E5' },
  'esrs-s': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'S1-S4' },
  'esrs-g': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'G1' },
};

const getTypeLabels = (t: TFunction): Record<string, string> => ({
  decimal: t('compliance.ixbrl.typeLabels.decimal', 'Nombre'),
  integer: t('compliance.ixbrl.typeLabels.integer', 'Entier'),
  string: t('compliance.ixbrl.typeLabels.string', 'Texte'),
  boolean: t('compliance.ixbrl.typeLabels.boolean', 'Booléen'),
  date: t('compliance.ixbrl.typeLabels.date', 'Date'),
  textBlock: t('compliance.ixbrl.typeLabels.textBlock', 'Bloc texte'),
});

// ─── DEMO report text ─────────────────────────────────────────────────────────

const getDemoText = (t: TFunction): string => t('compliance.ixbrl.demoText', `Notre organisation emploie 1 247 salariés en équivalent temps plein au 31 décembre 2024, dont 847 en contrat à durée indéterminée et 400 en contrat à durée déterminée ou temporaires. Les femmes représentent 48 % de nos effectifs.

Sur l'exercice 2024, nos émissions brutes de gaz à effet de serre Scope 1 s'élèvent à 12 450 tCO₂e et nos émissions Scope 2 (base localisation) à 3 820 tCO₂e. Le total Scope 1+2+3 atteint 87 300 tCO₂e, soit une intensité carbone de 43,6 tCO₂e par million d'euros de chiffre d'affaires net.

Nous consommons 124 500 MWh d'énergie au total, dont 68 % provenant de sources renouvelables (84 660 MWh) et 32 % de sources fossiles (39 840 MWh). L'intensité énergétique ressort à 62,2 MWh par million d'euros de revenus.

Notre objectif de réduction des émissions GES vise une baisse de 42 % d'ici 2030 par rapport à notre base 2019, aligné sur une trajectoire 1,5 °C validée par SBTi.

Le taux de fréquence des accidents du travail (TFAT) est de 2,3 pour un million d'heures travaillées. Aucun décès n'est à déplorer sur la période. Chaque salarié a bénéficié en moyenne de 18,5 heures de formation.

L'écart de rémunération femmes/hommes est de 7,2 % en faveur des hommes, en amélioration de 1,5 point par rapport à l'exercice précédent. Le ratio PDG / médiane des salaires est de 24:1. 98 % de nos salariés sont couverts par un accord ou une convention collective.

Nos délais de paiement moyens fournisseurs s'établissent à 38 jours. Aucune condamnation pour corruption n'a été prononcée à l'encontre de notre organisation au cours de l'exercice.`);

// ─── Utility ──────────────────────────────────────────────────────────────────

const LS_KEY = 'ixbrl_tagging_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(tags: TaggedSegment[], reportText: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ tags, reportText, savedAt: new Date().toISOString() }));
  } catch { /* ignore */ }
}

async function saveStateToAPI(tags: TaggedSegment[], reportText: string) {
  saveState(tags, reportText);
  try {
    const { api } = await import('@/services/api');
    await api.post('/framework-data/ixbrl', { data: { tags, reportText } });
  } catch { /* silent — localStorage already saved */ }
}

// ─── Main Component ────────────────────────────────────────────────────────────

// Map backend ESRS standard codes → frontend visual namespace
function deriveNamespace(standard: string): XBRLConcept['namespace'] {
  const s = (standard || '').toUpperCase();
  if (s.startsWith('ESRS E')) return 'esrs-e';
  if (s.startsWith('ESRS S')) return 'esrs-s';
  if (s.startsWith('ESRS G')) return 'esrs-g';
  return 'esrs';
}

// Convert backend taxonomy concept → frontend XBRLConcept
function fromBackendConcept(c: any): XBRLConcept {
  return {
    id: c.concept_id,
    label: c.label_en || c.concept_id.split(':').pop() || c.concept_id,
    labelFr: c.label_fr || c.label_en,
    namespace: deriveNamespace(c.standard),
    dataType: (c.data_type === 'monetaryItemType' ? 'decimal' : c.data_type) as XBRLConcept['dataType'],
    periodType: c.period_type,
    standard: c.standard,
    disclosure: c.disclosure,
    required: !!c.required,
  };
}

interface TaxonomyMeta {
  namespace: string;
  version: string;
  source: string;
}

export default function IXBRLTagging() {
  const { t } = useTranslation();
  const typeLabels = getTypeLabels(t);
  const ESRS_CONCEPTS = getESRSConcepts(t);
  const DEMO_TEXT = getDemoText(t);
  const saved = loadState();
  const [activeTab, setActiveTab] = useState<'overview' | 'taxonomy' | 'tagging' | 'validation'>('overview');
  const [search, setSearch] = useState('');
  const [nsFilter, setNsFilter] = useState<string>('all');
  const [reqFilter, setReqFilter] = useState<'all' | 'required' | 'optional'>('all');
  const [reportText, setReportText] = useState<string>(saved?.reportText ?? DEMO_TEXT);
  const [tags, setTags] = useState<TaggedSegment[]>(saved?.tags ?? []);
  const [selectedConcept, setSelectedConcept] = useState<XBRLConcept | null>(null);
  const [tagValue, setTagValue] = useState('');
  const [decimals, setDecimals] = useState('-3');
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; start: number; end: number } | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Server-side Arelle validation state ──────────────────────────────────
  const [serverValidating, setServerValidating] = useState(false);
  const [serverReport, setServerReport] = useState<{
    passed: boolean;
    layers_run: string[];
    arelle_available: boolean;
    arelle_version: string | null;
    summary: { errors: number; warnings: number; infos: number; total: number };
    issues: Array<{ severity: string; layer: string; message: string; concept?: string; rule?: string }>;
  } | null>(null);

  const runServerValidation = useCallback(async () => {
    setServerValidating(true);
    setServerReport(null);
    try {
      const { api } = await import('@/services/api');
      const res = await api.post('/reports/ixbrl/validate?run_arelle=true');
      setServerReport(res.data);
      if (res.data.passed) {
        toast.success('Validation serveur réussie — aucune erreur bloquante.');
      } else {
        toast.error(`${res.data.summary.errors} erreur(s) détectée(s).`);
      }
    } catch (err: any) {
      toast.error('Erreur lors de la validation serveur.');
    } finally {
      setServerValidating(false);
    }
  }, []);

  // ── Concept catalog (sourced from backend EFRAG taxonomy when available) ──
  const [concepts, setConcepts] = useState<XBRLConcept[]>(ESRS_CONCEPTS);
  const [taxonomyMeta, setTaxonomyMeta] = useState<TaxonomyMeta | null>(null);

  // Load from API on mount: tags + EFRAG catalog
  useEffect(() => {
    import('@/services/api').then(({ api }) => {
      // Fetch user's saved tagging state
      api.get('/framework-data/ixbrl').then(r => {
        const d = r.data?.data;
        if (d && d.tags) setTags(d.tags);
        if (d && d.reportText) setReportText(d.reportText);
      }).catch(() => { /* localStorage already loaded as initial state */ });
      // Fetch the authoritative ESRS concept catalog from the backend
      api.get('/reports/ixbrl/catalog').then(r => {
        if (r.data?.concepts && Array.isArray(r.data.concepts)) {
          setConcepts(r.data.concepts.map(fromBackendConcept));
        }
        if (r.data?.taxonomy) {
          setTaxonomyMeta({
            namespace: r.data.taxonomy.namespace,
            version: r.data.taxonomy.version,
            source: r.data.taxonomy.source,
          });
        }
      }).catch(() => { /* fall back to bundled ESRS_CONCEPTS */ });
    });
  }, []);

  // Persist — localStorage (immediate) + API (durable)
  const persist = useCallback((newTags: TaggedSegment[], text: string) => {
    saveStateToAPI(newTags, text);
  }, []);

  // Filtered taxonomy
  const filtered = useMemo(() => concepts.filter(c => {
    if (nsFilter !== 'all' && c.namespace !== nsFilter) return false;
    if (reqFilter === 'required' && !c.required) return false;
    if (reqFilter === 'optional' && c.required) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.label.toLowerCase().includes(q) || c.labelFr.toLowerCase().includes(q) || c.disclosure.toLowerCase().includes(q);
    }
    return true;
  }), [search, nsFilter, reqFilter, concepts]);

  // Coverage stats
  const requiredConcepts = useMemo(() => concepts.filter(c => c.required), [concepts]);
  const taggedRequiredIds = new Set(tags.filter(t => {
    const concept = concepts.find(c => c.id === t.conceptId);
    return concept?.required;
  }).map(t => t.conceptId));
  const coverage = requiredConcepts.length > 0 ? Math.round((taggedRequiredIds.size / requiredConcepts.length) * 100) : 0;

  // Validation
  const issues = useMemo((): ValidationIssue[] => {
    const result: ValidationIssue[] = [];
    const tagged = new Set(tags.map(t => t.conceptId));

    requiredConcepts.forEach(c => {
      if (!tagged.has(c.id)) {
        result.push({ severity: 'error', message: t('compliance.ixbrl.validation.requiredNotTagged', 'Élément obligatoire non balisé : {{label}}', { label: c.labelFr }), conceptId: c.id, rule: 'ESRS-MNDT-001' });
      }
    });

    tags.forEach(tg => {
      const c = concepts.find(x => x.id === tg.conceptId);
      if (!c) return;
      if (c.dataType === 'decimal' && isNaN(Number(tg.value))) {
        result.push({ severity: 'error', message: t('compliance.ixbrl.validation.nonNumericValue', 'Valeur non numérique pour {{label}} : "{{value}}"', { label: c.labelFr, value: tg.value }), conceptId: c.id, rule: 'XBRL-VAL-002' });
      }
      if (c.dataType === 'integer' && (!Number.isInteger(Number(tg.value)) || isNaN(Number(tg.value)))) {
        result.push({ severity: 'error', message: t('compliance.ixbrl.validation.nonIntegerValue', 'Valeur non entière pour {{label}} : "{{value}}"', { label: c.labelFr, value: tg.value }), conceptId: c.id, rule: 'XBRL-VAL-003' });
      }
    });

    if (tags.length > 0 && !reportText.trim()) {
      result.push({ severity: 'warning', message: t('compliance.ixbrl.validation.emptyReportText', 'Le texte du rapport est vide alors que des balises existent.'), rule: 'ESEF-WARN-001' });
    }

    result.push({ severity: 'info', message: t('compliance.ixbrl.validation.tagsApplied', '{{count}} balise(s) appliquée(s) sur {{total}} concepts disponibles.', { count: tags.length, total: concepts.length }), rule: 'INFO-001' });

    return result;
  }, [tags, reportText, concepts, requiredConcepts, t]);

  // Select text in textarea
  const handleTextSelection = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) { setSelectionInfo(null); return; }
    const text = ta.value.substring(start, end);
    setSelectionInfo({ text, start, end });
    setTagValue(text);
  };

  // Apply tag
  const applyTag = () => {
    if (!selectedConcept || !selectionInfo) {
      toast.error(t('compliance.ixbrl.toast.selectTextAndConcept', 'Sélectionnez un texte ET un concept XBRL.'));
      return;
    }
    if (!tagValue.trim()) {
      toast.error(t('compliance.ixbrl.toast.emptyTagValue', 'La valeur du tag ne peut pas être vide.'));
      return;
    }
    const newTag: TaggedSegment = {
      id: `tag-${Date.now()}`,
      conceptId: selectedConcept.id,
      text: selectionInfo.text,
      startOffset: selectionInfo.start,
      endOffset: selectionInfo.end,
      contextRef: `ctx-${new Date().getFullYear()}-FY`,
      unitRef: ['decimal', 'integer'].includes(selectedConcept.dataType) ? 'pure' : undefined,
      value: tagValue,
      decimals: selectedConcept.dataType === 'decimal' ? decimals : undefined,
    };
    const newTags = [...tags, newTag];
    setTags(newTags);
    persist(newTags, reportText);
    setSelectionInfo(null);
    setTagValue('');
    toast.success(t('compliance.ixbrl.toast.tagApplied', 'Balise « {{label}} » appliquée.', { label: selectedConcept.label.slice(0, 40) }));
  };

  const removeTag = (id: string) => {
    const newTags = tags.filter(t => t.id !== id);
    setTags(newTags);
    persist(newTags, reportText);
  };

  // Export iXBRL (simplified inline XBRL HTML)
  const exportIXBRL = () => {
    const contextYear = new Date().getFullYear();
    const taggedText = reportText.replace(
      /\n/g, '<br/>'
    );

    // Use the authoritative EFRAG namespace from the backend catalog when
    // available; fall back to the production 2024-12-31 namespace.
    const efragNs = taxonomyMeta?.namespace || 'https://xbrl.efrag.org/taxonomy/esrs/2024-12-31/esrs_cor';
    const efragVersion = taxonomyMeta?.version || '2024-12-31';
    const schemaRef = `${efragNs}.xsd`;

    const ixbrl = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"
  xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
  xmlns:ixt="http://www.xbrl.org/inlineXBRL/transformation/2020-02-12"
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:link="http://www.xbrl.org/2003/linkbase"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:iso4217="http://www.xbrl.org/2003/iso4217"
  xmlns:utr="http://www.xbrl.org/2009/utr"
  xmlns:esrs="${efragNs}"
  xml:lang="fr">
<head>
  <title>CSRD Sustainability Statement — iXBRL</title>
  <meta charset="utf-8"/>
  <meta name="esrs-taxonomy" content="${efragVersion}"/>
  <meta name="generator" content="ESGflow iXBRL Tagging UI"/>
  <!-- EFRAG ESRS Taxonomy ${efragVersion} | Generated by ESGflow -->
</head>
<body>

<ix:header>
  <ix:hidden>
    <ix:references>
      <link:schemaRef xlink:type="simple" xlink:href="${schemaRef}"/>
    </ix:references>
    <ix:resources>
      <xbrli:context id="ctx-${contextYear}-FY">
        <xbrli:entity><xbrli:identifier scheme="http://standards.iso.org/iso/17442">XXXXXXXXXXXXXXXXXXXX</xbrli:identifier></xbrli:entity>
        <xbrli:period><xbrli:startDate>${contextYear}-01-01</xbrli:startDate><xbrli:endDate>${contextYear}-12-31</xbrli:endDate></xbrli:period>
      </xbrli:context>
      <xbrli:context id="ctx-${contextYear}-instant">
        <xbrli:entity><xbrli:identifier scheme="http://standards.iso.org/iso/17442">XXXXXXXXXXXXXXXXXXXX</xbrli:identifier></xbrli:entity>
        <xbrli:period><xbrli:instant>${contextYear}-12-31</xbrli:instant></xbrli:period>
      </xbrli:context>
      <xbrli:unit id="pure"><xbrli:measure>xbrli:pure</xbrli:measure></xbrli:unit>
      <xbrli:unit id="tCO2e"><xbrli:measure>esrs:tCO2eq</xbrli:measure></xbrli:unit>
      <xbrli:unit id="MWh"><xbrli:measure>utr:MWh</xbrli:measure></xbrli:unit>
      <xbrli:unit id="m3"><xbrli:measure>utr:m3</xbrli:measure></xbrli:unit>
      <xbrli:unit id="EUR"><xbrli:measure>iso4217:EUR</xbrli:measure></xbrli:unit>
    </ix:resources>
  </ix:hidden>
</ix:header>

<div id="sustainability-statement">
${tags.map(t => {
  const c = concepts.find(x => x.id === t.conceptId);
  if (!c) return '';
  // EFRAG concepts all live in the esrs: namespace — the visual ns suffix is
  // purely for UI grouping. Always emit the canonical "esrs:" prefix.
  const localName = c.id.split(':').pop();
  const fullName = `esrs:${localName}`;
  const ctx = c.periodType === 'instant' ? `ctx-${contextYear}-instant` : `ctx-${contextYear}-FY`;
  if (c.dataType === 'textBlock' || c.dataType === 'string') {
    return `  <ix:nonNumeric name="${fullName}" contextRef="${ctx}">${t.value}</ix:nonNumeric>`;
  }
  return `  <ix:nonFraction name="${fullName}" contextRef="${ctx}" unitRef="${t.unitRef ?? 'pure'}" decimals="${t.decimals ?? '0'}" format="ixt:num-dot-decimal">${t.value}</ix:nonFraction>`;
}).join('\n')}
</div>

<div id="narrative">
${taggedText}
</div>

</body>
</html>`;

    const blob = new Blob([ixbrl], { type: 'application/xhtml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csrd-ixbrl-${contextYear}.xhtml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('compliance.ixbrl.toast.ixbrlExported', 'Fichier iXBRL exporté.'));
  };

  const TABS = [
    { id: 'overview', label: t('compliance.ixbrl.tabs.overview', "Vue d'ensemble"), icon: BookOpen },
    { id: 'taxonomy', label: t('compliance.ixbrl.tabs.taxonomy', 'Taxonomie ESRS'), icon: Layers },
    { id: 'tagging', label: t('compliance.ixbrl.tabs.tagging', 'Balisage'), icon: Tag },
    { id: 'validation', label: t('compliance.ixbrl.tabs.validation', 'Validation & Export'), icon: FileCode2 },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <FileCode2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">iXBRL / ESEF Tagging</h1>
              <p className="text-sm text-gray-500">
                {t('compliance.ixbrl.header.subtitle', 'Balisage CSRD conforme EFRAG ESRS Taxonomy {{version}} · Règl. (UE) 2019/815', { version: taxonomyMeta?.version || '2024-12-31' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* EFRAG taxonomy badge */}
            {taxonomyMeta && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                title={t('compliance.ixbrl.header.badgeTitle', 'Namespace : {{namespace}}\nSource : {{source}}', { namespace: taxonomyMeta.namespace, source: taxonomyMeta.source })}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                EFRAG {taxonomyMeta.version}
              </div>
            )}
            {/* Coverage pill */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              coverage >= 80 ? 'bg-emerald-50 text-emerald-700' :
              coverage >= 50 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              <span>{t('compliance.ixbrl.header.coverage', '{{coverage}}% obligatoires balisés', { coverage })}</span>
            </div>
            <button
              onClick={exportIXBRL}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#6366f1' }}
            >
              <Download className="h-4 w-4" />
              {t('compliance.ixbrl.header.exportIxbrl', 'Exporter iXBRL')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'validation' && issues.filter(i => i.severity === 'error').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {issues.filter(i => i.severity === 'error').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {/* ── TAB: Vue d'ensemble ──────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Regulation box */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-indigo-500" />
                {t('compliance.ixbrl.overview.whatIsTitle', "Qu'est-ce que l'iXBRL / ESEF pour CSRD ?")}
              </h2>
              <div className="prose prose-sm max-w-none text-gray-600 space-y-3">
                <p><Trans i18nKey="compliance.ixbrl.overview.para1">Le <strong>Règlement délégué (UE) 2019/815 (ESEF)</strong> impose aux entreprises soumises à la CSRD de publier leurs états de durabilité en <strong>Inline XBRL (iXBRL)</strong> — un format qui intègre des balises machine-lisibles directement dans le HTML du rapport annuel.</Trans></p>
                <p><Trans i18nKey="compliance.ixbrl.overview.para2" values={{ version: taxonomyMeta?.version || '2024-12-31' }}>La <strong>taxonomie EFRAG ESRS {'{{version}}'}</strong> définit les <em>concepts XBRL</em> (éléments de données) obligatoires ou volontaires à baliser : indicateurs quantitatifs (émissions GES, effectifs…) et blocs textuels (politiques, objectifs…).</Trans></p>
                <p><Trans i18nKey="compliance.ixbrl.overview.para3">À partir des exercices ouverts le <strong>1er janvier 2025</strong> (grandes entreprises d'intérêt public), le rapport CSRD doit être déposé en iXBRL auprès du registre national et de l'ESMA ESEF data hub.</Trans></p>
                {taxonomyMeta && (
                  <p className="text-xs bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono break-all">
                    <strong className="text-slate-700 not-italic">{t('compliance.ixbrl.overview.officialNamespace', 'Namespace officiel :')}</strong>{' '}
                    <span className="text-indigo-700">{taxonomyMeta.namespace}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Progress overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: t('compliance.ixbrl.overview.statRequiredConcepts', 'Concepts obligatoires'), total: requiredConcepts.length, done: taggedRequiredIds.size, color: '#6366f1' },
                { label: t('compliance.ixbrl.overview.statAllTagged', 'Tous concepts balisés'), total: concepts.length, done: new Set(tags.map(tg=>tg.conceptId)).size, color: '#10b981' },
                { label: t('compliance.ixbrl.overview.statErrors', 'Validation — erreurs'), total: issues.length, done: issues.filter(i=>i.severity!=='error').length, color: issues.filter(i=>i.severity==='error').length>0 ? '#ef4444' : '#10b981', isErrors: true },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                  {'isErrors' in stat ? (
                    <p className="text-3xl font-black" style={{ color: stat.color }}>
                      {issues.filter(i=>i.severity==='error').length}
                    </p>
                  ) : (
                    <>
                      <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.done}<span className="text-base text-gray-400 font-medium"> / {stat.total}</span></p>
                      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stat.total > 0 ? (stat.done/stat.total)*100 : 0}%`, background: stat.color }} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Steps */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">{t('compliance.ixbrl.overview.workflowTitle', 'Workflow de balisage')}</h2>
              <div className="space-y-3">
                {[
                  { step: 1, title: t('compliance.ixbrl.overview.step1Title', 'Parcourir la taxonomie ESRS'), desc: t('compliance.ixbrl.overview.step1Desc', 'Onglet « Taxonomie ESRS » — explorez les 35+ concepts obligatoires et optionnels.'), tab: 'taxonomy' },
                  { step: 2, title: t('compliance.ixbrl.overview.step2Title', 'Saisir ou coller votre rapport'), desc: t('compliance.ixbrl.overview.step2Desc', 'Onglet « Balisage » — collez le texte de votre déclaration de durabilité CSRD.'), tab: 'tagging' },
                  { step: 3, title: t('compliance.ixbrl.overview.step3Title', 'Sélectionner et baliser'), desc: t('compliance.ixbrl.overview.step3Desc', 'Sélectionnez un extrait de texte, choisissez le concept XBRL, saisissez la valeur.'), tab: 'tagging' },
                  { step: 4, title: t('compliance.ixbrl.overview.step4Title', 'Valider et exporter'), desc: t('compliance.ixbrl.overview.step4Desc', 'Onglet « Validation » — vérifiez les erreurs, puis exportez le fichier .xhtml iXBRL.'), tab: 'validation' },
                ].map(s => (
                  <button
                    key={s.step}
                    onClick={() => setActiveTab(s.tab as typeof activeTab)}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-black text-sm group-hover:bg-indigo-200 transition-colors">
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 ml-auto mt-0.5 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Taxonomie ESRS ──────────────────────────────────────────── */}
        {activeTab === 'taxonomy' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('compliance.ixbrl.taxonomy.searchPlaceholder', 'Rechercher un concept, une disclosure…')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <select
                value={nsFilter}
                onChange={e => setNsFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="all">{t('compliance.ixbrl.taxonomy.allStandards', 'Tous les standards')}</option>
                {Object.entries(NS_COLORS).map(([ns, cfg]) => (
                  <option key={ns} value={ns}>{cfg.label}</option>
                ))}
              </select>
              <select
                value={reqFilter}
                onChange={e => setReqFilter(e.target.value as typeof reqFilter)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="all">{t('compliance.ixbrl.taxonomy.filterAll', 'Obligatoire + optionnel')}</option>
                <option value="required">{t('compliance.ixbrl.taxonomy.filterRequired', 'Obligatoires uniquement')}</option>
                <option value="optional">{t('compliance.ixbrl.taxonomy.filterOptional', 'Optionnels uniquement')}</option>
              </select>
              <span className="text-xs text-gray-400">{t('compliance.ixbrl.taxonomy.conceptCount', '{{count}} concept(s)', { count: filtered.length })}</span>
            </div>

            {/* Concept list */}
            <div className="space-y-2">
              {filtered.map(concept => {
                const ns = NS_COLORS[concept.namespace] ?? NS_COLORS['esrs'];
                const isTagged = tags.some(tg => tg.conceptId === concept.id);
                const isExpanded = expandedConcept === concept.id;
                return (
                  <div key={concept.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`flex-shrink-0 h-2 w-2 rounded-full ${isTagged ? 'bg-emerald-400' : concept.required ? 'bg-red-300' : 'bg-gray-200'}`} title={isTagged ? t('compliance.ixbrl.taxonomy.statusTagged', 'Balisé') : concept.required ? t('compliance.ixbrl.taxonomy.statusRequiredUntagged', 'Obligatoire — non balisé') : t('compliance.ixbrl.taxonomy.statusOptional', 'Optionnel')} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${ns.bg} ${ns.text} ${ns.border}`}>{ns.label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{concept.labelFr}</p>
                        <p className="text-xs text-gray-400 truncate font-mono">{concept.id}</p>
                      </div>
                      <span className="text-xs text-gray-400 mr-2">{concept.disclosure}</span>
                      {concept.required && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 mr-1">MND</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500`}>{typeLabels[concept.dataType]}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div><span className="text-gray-400 font-medium">{t('compliance.ixbrl.taxonomy.standardLabel', 'Standard :')}</span> <span className="text-gray-700 ml-1">{concept.standard}</span></div>
                        <div><span className="text-gray-400 font-medium">{t('compliance.ixbrl.taxonomy.disclosureLabel', 'Disclosure :')}</span> <span className="text-gray-700 ml-1">{concept.disclosure}</span></div>
                        <div><span className="text-gray-400 font-medium">{t('compliance.ixbrl.taxonomy.typeLabel', 'Type :')}</span> <span className="text-gray-700 ml-1">{concept.dataType} ({concept.periodType})</span></div>
                        <div><span className="text-gray-400 font-medium">{t('compliance.ixbrl.taxonomy.statusLabel', 'Statut :')}</span> <span className={`ml-1 font-semibold ${concept.required ? 'text-red-600' : 'text-gray-500'}`}>{concept.required ? t('compliance.ixbrl.taxonomy.requiredMnd', 'Obligatoire (MND)') : t('compliance.ixbrl.taxonomy.statusOptional', 'Optionnel')}</span></div>
                        <div className="col-span-2 flex items-center gap-2 mt-1">
                          <span className="text-gray-400 font-medium font-mono text-[11px] truncate">{concept.id}</span>
                          <button onClick={() => { navigator.clipboard.writeText(concept.id); toast.success(t('compliance.ixbrl.toast.idCopied', 'ID copié')); }}><Copy className="h-3 w-3 text-gray-400 hover:text-gray-700" /></button>
                        </div>
                        <div className="col-span-2">
                          <button
                            onClick={() => { setSelectedConcept(concept); setActiveTab('tagging'); }}
                            className="mt-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                          >
                            {t('compliance.ixbrl.taxonomy.useForTagging', 'Utiliser pour baliser →')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center text-gray-400 py-12 text-sm">{t('compliance.ixbrl.taxonomy.noMatch', 'Aucun concept ne correspond à vos filtres.')}</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Balisage ───────────────────────────────────────────────── */}
        {activeTab === 'tagging' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left — editor */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    {t('compliance.ixbrl.tagging.reportTextTitle', 'Texte du rapport CSRD')}
                  </h3>
                  <button
                    onClick={() => { setReportText(DEMO_TEXT); persist(tags, DEMO_TEXT); toast.success(t('compliance.ixbrl.toast.demoLoaded', 'Texte démo chargé.')); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> {t('compliance.ixbrl.tagging.demo', 'Démo')}
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={reportText}
                  onChange={e => { setReportText(e.target.value); persist(tags, e.target.value); }}
                  onMouseUp={handleTextSelection}
                  onKeyUp={handleTextSelection}
                  rows={18}
                  placeholder={t('compliance.ixbrl.tagging.reportTextPlaceholder', 'Collez ici le texte de votre déclaration de durabilité CSRD…')}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono leading-relaxed"
                />
                {selectionInfo && (
                  <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-xs">
                    <p className="font-semibold text-indigo-800 mb-0.5">{t('compliance.ixbrl.tagging.selection', 'Sélection ({{count}} car.) :', { count: selectionInfo.end - selectionInfo.start })}</p>
                    <p className="text-indigo-600 italic line-clamp-2">« {selectionInfo.text} »</p>
                  </div>
                )}
              </div>

              {/* Applied tags list */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-500" />
                  {t('compliance.ixbrl.tagging.appliedTagsTitle', 'Balises appliquées ({{count}})', { count: tags.length })}
                </h3>
                {tags.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">{t('compliance.ixbrl.tagging.noTagsYet', "Aucune balise pour l'instant.")}<br/>{t('compliance.ixbrl.tagging.noTagsHint', 'Sélectionnez du texte et choisissez un concept.')}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tags.map(tg => {
                      const c = concepts.find(x => x.id === tg.conceptId);
                      if (!c) return null;
                      const ns = NS_COLORS[c.namespace] ?? NS_COLORS['esrs'];
                      return (
                        <div key={tg.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                          <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${ns.bg} ${ns.text}`}>{c.disclosure}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{c.labelFr}</p>
                            <p className="text-xs text-gray-500 truncate">{t('compliance.ixbrl.tagging.valueLabel', 'Valeur :')} <span className="font-mono font-medium text-gray-700">{tg.value}</span></p>
                          </div>
                          <button onClick={() => removeTag(tg.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right — tag configurator */}
            <div className="space-y-4">
              {/* Concept selector */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  {t('compliance.ixbrl.tagging.selectedConceptTitle', 'Concept XBRL sélectionné')}
                </h3>
                {selectedConcept ? (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${NS_COLORS[selectedConcept.namespace]?.bg ?? 'bg-gray-50'} border ${NS_COLORS[selectedConcept.namespace]?.border ?? 'border-gray-200'}`}>
                      <p className={`text-sm font-bold ${NS_COLORS[selectedConcept.namespace]?.text ?? 'text-gray-900'}`}>{selectedConcept.labelFr}</p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{selectedConcept.id}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-gray-600">{typeLabels[selectedConcept.dataType]}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-gray-600">{selectedConcept.periodType}</span>
                        {selectedConcept.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">MND</span>}
                      </div>
                    </div>
                    <button onClick={() => setSelectedConcept(null)} className="text-xs text-gray-400 hover:text-gray-600">{t('compliance.ixbrl.tagging.changeConcept', 'Changer de concept')}</button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">{t('compliance.ixbrl.tagging.noConceptSelected', 'Aucun concept sélectionné.')}<br/>
                    <button onClick={() => setActiveTab('taxonomy')} className="text-indigo-600 font-semibold hover:underline">{t('compliance.ixbrl.tagging.browseTaxonomy', 'Parcourir la taxonomie →')}</button>
                  </p>
                )}
              </div>

              {/* Quick concept search */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">{t('compliance.ixbrl.tagging.quickSearchTitle', 'Recherche rapide de concept')}</h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('compliance.ixbrl.tagging.quickSearchPlaceholder', 'Filtrer les concepts…')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {concepts.filter(c => !search || c.labelFr.toLowerCase().includes(search.toLowerCase()) || c.label.toLowerCase().includes(search.toLowerCase())).slice(0, 15).map(c => {
                    const ns = NS_COLORS[c.namespace] ?? NS_COLORS['esrs'];
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedConcept(c); setSearch(''); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${selectedConcept?.id === c.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'}`}
                      >
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${ns.bg} ${ns.text} flex-shrink-0`}>{c.disclosure}</span>
                        <span className="text-xs text-gray-700 truncate">{c.labelFr}</span>
                        {selectedConcept?.id === c.id && <Check className="h-3 w-3 text-indigo-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag form */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  {t('compliance.ixbrl.tagging.applyTagTitle', 'Appliquer la balise')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{t('compliance.ixbrl.tagging.xbrlValueLabel', 'Valeur XBRL')}</label>
                    <input
                      type="text"
                      value={tagValue}
                      onChange={e => setTagValue(e.target.value)}
                      placeholder={selectedConcept?.dataType === 'decimal' ? 'Ex: 12450.00' : selectedConcept?.dataType === 'textBlock' ? t('compliance.ixbrl.tagging.textBlockPlaceholder', 'Texte de la disclosure…') : t('compliance.ixbrl.tagging.valuePlaceholder', 'Valeur…')}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  {selectedConcept && selectedConcept.dataType === 'decimal' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">{t('compliance.ixbrl.tagging.decimalsLabel', 'Précision (decimals)')}</label>
                      <select
                        value={decimals}
                        onChange={e => setDecimals(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="INF">{t('compliance.ixbrl.tagging.decimalsInf', 'INF (exact)')}</option>
                        <option value="0">{t('compliance.ixbrl.tagging.decimals0', '0 (unité)')}</option>
                        <option value="-3">{t('compliance.ixbrl.tagging.decimalsM3', '-3 (milliers)')}</option>
                        <option value="-6">{t('compliance.ixbrl.tagging.decimalsM6', '-6 (millions)')}</option>
                      </select>
                    </div>
                  )}
                  <button
                    onClick={applyTag}
                    disabled={!selectedConcept || !selectionInfo || !tagValue.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: !selectedConcept || !selectionInfo || !tagValue.trim() ? '#9ca3af' : '#6366f1' }}
                  >
                    <Tag className="h-4 w-4" />
                    {!selectionInfo ? t('compliance.ixbrl.tagging.selectTextFirst', "Sélectionnez d'abord du texte") : !selectedConcept ? t('compliance.ixbrl.tagging.chooseConceptFirst', 'Choisissez un concept') : t('compliance.ixbrl.tagging.applyIxbrlTag', 'Appliquer la balise iXBRL')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Validation & Export ─────────────────────────────────────── */}
        {activeTab === 'validation' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('compliance.ixbrl.validation.errorsLabel', 'Erreurs'), count: issues.filter(i => i.severity === 'error').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                { label: t('compliance.ixbrl.validation.warningsLabel', 'Avertissements'), count: issues.filter(i => i.severity === 'warning').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                { label: t('compliance.ixbrl.validation.infoLabel', 'Informations'), count: issues.filter(i => i.severity === 'info').length, icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`flex items-center gap-3 p-4 rounded-xl border ${s.bg}`}>
                    <Icon className={`h-6 w-6 ${s.color}`} />
                    <div>
                      <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall status */}
            {issues.filter(i => i.severity === 'error').length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">{t('compliance.ixbrl.validation.compliantTitle', "Rapport conforme — prêt pour l'export")}</p>
                  <p className="text-xs text-emerald-600">{t('compliance.ixbrl.validation.compliantDesc', 'Aucune erreur de validation ESEF détectée. Le fichier iXBRL peut être généré.')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                <XCircle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-red-800">{t('compliance.ixbrl.validation.errorsToFix', '{{count}} erreur(s) à corriger', { count: issues.filter(i=>i.severity==='error').length })}</p>
                  <p className="text-xs text-red-600">{t('compliance.ixbrl.validation.resolveBeforeSubmit', 'Résolvez toutes les erreurs avant de soumettre le fichier iXBRL.')}</p>
                </div>
              </div>
            )}

            {/* Issues list */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-4">{t('compliance.ixbrl.validation.rulesDetail', 'Détail des règles de validation')}</h3>
              <div className="space-y-2">
                {issues.map((issue, i) => {
                  const Icon = issue.severity === 'error' ? XCircle : issue.severity === 'warning' ? AlertTriangle : Info;
                  const colors = { error: 'text-red-600 bg-red-50', warning: 'text-amber-600 bg-amber-50', info: 'text-blue-600 bg-blue-50' };
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${colors[issue.severity]}`}>
                      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{issue.message}</p>
                        {issue.rule && <p className="text-[10px] font-mono mt-0.5 opacity-70">{t('compliance.ixbrl.validation.rulePrefix', 'Règle :')} {issue.rule}</p>}
                        {issue.conceptId && (
                          <button
                            onClick={() => { setSelectedConcept(concepts.find(c=>c.id===issue.conceptId) ?? null); setActiveTab('tagging'); }}
                            className="text-[10px] font-semibold mt-1 underline underline-offset-2 hover:opacity-80"
                          >
                            {t('compliance.ixbrl.validation.goToTagging', 'Aller au balisage →')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Validation serveur (3 couches) ──────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Validation EFRAG — 3 couches</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Structurelle · Sémantique ESRS · Arelle XSD (si installé)</p>
                </div>
                <button
                  onClick={runServerValidation}
                  disabled={serverValidating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: serverValidating ? '#6b7280' : '#0f766e' }}
                >
                  {serverValidating
                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Validation…</>
                    : <><Zap className="h-4 w-4" /> Lancer la validation</>
                  }
                </button>
              </div>

              {!serverReport && !serverValidating && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  Cliquez sur "Lancer la validation" pour analyser votre rapport iXBRL contre la taxonomie EFRAG 2024-12-31.
                </div>
              )}

              {serverValidating && (
                <div className="px-5 py-8 text-center">
                  <RefreshCw className="h-8 w-8 text-green-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Validation en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">Couche 1 → Couche 2 → Arelle (peut prendre 10-30 s si première utilisation)</p>
                </div>
              )}

              {serverReport && (
                <div className="p-5 space-y-4">
                  {/* Status global */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${serverReport.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    {serverReport.passed
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    }
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${serverReport.passed ? 'text-emerald-800' : 'text-red-800'}`}>
                        {serverReport.passed ? '✅ Rapport valide — prêt pour dépôt ESEF' : `❌ ${serverReport.summary.errors} erreur(s) bloquante(s)`}
                      </p>
                      <p className={`text-xs mt-0.5 ${serverReport.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                        Couches exécutées : {serverReport.layers_run.join(' → ')}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-red-600 font-bold">{serverReport.summary.errors} err</span>
                      <span className="text-amber-600 font-bold">{serverReport.summary.warnings} warn</span>
                      <span className="text-blue-600 font-bold">{serverReport.summary.infos} info</span>
                    </div>
                  </div>

                  {/* Arelle status */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${serverReport.arelle_available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                    {serverReport.arelle_available
                      ? <><Check className="h-3.5 w-3.5" /> Arelle {serverReport.arelle_version} — validation XSD complète effectuée</>
                      : <><X className="h-3.5 w-3.5" /> Arelle non installé — validation structurelle + sémantique uniquement (pip install arelle-release)</>
                    }
                  </div>

                  {/* Issues par couche */}
                  {(['structural', 'semantic', 'arelle'] as const).map(layer => {
                    const layerIssues = serverReport.issues.filter(i => i.layer === layer);
                    if (!layerIssues.length) return null;
                    const layerLabel = { structural: '🔧 Couche 1 — Structurelle', semantic: '📐 Couche 2 — Sémantique ESRS', arelle: '✳️ Couche 3 — Arelle XSD' }[layer];
                    return (
                      <div key={layer}>
                        <p className="text-xs font-bold text-gray-600 mb-2">{layerLabel}</p>
                        <div className="space-y-1.5">
                          {layerIssues.map((issue, idx) => {
                            const colors = { error: 'bg-red-50 text-red-700 border-red-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', info: 'bg-blue-50 text-blue-600 border-blue-100' };
                            const IIcon = issue.severity === 'error' ? XCircle : issue.severity === 'warning' ? AlertTriangle : Info;
                            return (
                              <div key={idx} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${colors[issue.severity as keyof typeof colors]}`}>
                                <IIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span>{issue.message}</span>
                                  {issue.rule && <span className="font-mono ml-2 opacity-60">[{issue.rule}]</span>}
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
            </div>

            {/* Export */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">{t('compliance.ixbrl.export.title', 'Exporter le fichier iXBRL')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('compliance.ixbrl.export.desc', 'Génère un fichier .xhtml conforme ESEF avec les balises Inline XBRL intégrées. Soumettez ce fichier à votre AMTE / ORC ou au registre national.')}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportIXBRL}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: '#6366f1' }}
                >
                  <Download className="h-4 w-4" />
                  {t('compliance.ixbrl.export.downloadXhtml', 'Télécharger .xhtml iXBRL')}
                </button>
                <button
                  onClick={() => {
                    const json = JSON.stringify({ tags, reportText, exportedAt: new Date().toISOString() }, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'ixbrl-tags.json'; a.click();
                    URL.revokeObjectURL(url);
                    toast.success(t('compliance.ixbrl.toast.jsonExported', 'JSON exporté.'));
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('compliance.ixbrl.export.exportJsonTags', 'Exporter JSON (balises)')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
