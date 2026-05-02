import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, Download, RefreshCw,
  ChevronDown, ChevronUp, Leaf, Users, Building2, Target,
  BookOpen, Search, Filter,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ── Types API ─────────────────────────────────────────────────────────────────
interface Disclosure {
  id: string;
  label: string;
  covered: boolean;
}

interface ESRSSection {
  code: string;
  label: string;
  short: string;
  pillar: 'environmental' | 'social' | 'governance';
  pillar_color: string;
  description: string;
  coverage_pct: number;
  status: 'ready' | 'partial' | 'missing';
  matching_entries: number;
  disclosures_total: number;
  disclosures_covered: number;
  disclosures_missing: number;
  disclosures: Disclosure[];
}

interface GapAnalysis {
  overall_coverage_pct: number;
  total_entries: number;
  total_sections: number;
  sections_ready: number;
  sections_partial: number;
  sections_missing: number;
  total_disclosures: number;
  covered_disclosures: number;
  pillar_counts: Record<string, number>;
  sections: ESRSSection[];
}

// ── ESRS Référentiel ──────────────────────────────────────────────────────────
type DisclosureReq = 'mandatory' | 'conditional' | 'voluntary';
type DisclosureTyp = 'quantitative' | 'qualitative' | 'narrative';

interface ESRSDatapoint {
  id: string;
  standard: string;
  label: string;
  requirement: DisclosureReq;
  types: DisclosureTyp[];
  pillar: 'cross-cutting' | 'environmental' | 'social' | 'governance';
}

const ESRS_REFERENTIEL: ESRSDatapoint[] = [
  // ── ESRS 2 — Exigences générales (toujours obligatoires) ──────────────────
  { id: 'GOV-1',  standard: 'ESRS 2', label: 'Rôles des organes de direction, gestion et supervision en matière de durabilité',  requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-2',  standard: 'ESRS 2', label: 'Informations communiquées aux organes de direction sur les sujets de durabilité', requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-3',  standard: 'ESRS 2', label: 'Intégration des performances durabilité dans les dispositifs d\'incitation',      requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-4',  standard: 'ESRS 2', label: 'Déclaration sur la diligence raisonnable',                                        requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-5',  standard: 'ESRS 2', label: 'Gestion des risques et contrôles internes sur le reporting de durabilité',        requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'SBM-1',  standard: 'ESRS 2', label: 'Stratégie, modèle d\'affaires et chaîne de valeur',                              requirement: 'mandatory',    types: ['narrative', 'qualitative'],    pillar: 'cross-cutting' },
  { id: 'SBM-2',  standard: 'ESRS 2', label: 'Intérêts et points de vue des parties prenantes',                                 requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'SBM-3',  standard: 'ESRS 2', label: 'Impacts, risques et opportunités matériels et leur interaction avec la stratégie',requirement: 'mandatory',    types: ['narrative', 'qualitative'],    pillar: 'cross-cutting' },
  { id: 'IRO-1',  standard: 'ESRS 2', label: 'Processus d\'identification et d\'évaluation des IRO matériels (DMA)',            requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'IRO-2',  standard: 'ESRS 2', label: 'Exigences de divulgation ESRS couvertes par la déclaration de durabilité',       requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },

  // ── E1 — Changement climatique ────────────────────────────────────────────
  { id: 'E1-1', standard: 'E1', label: 'Plan de transition vers l\'atténuation du changement climatique',                requirement: 'conditional', types: ['narrative', 'qualitative'],             pillar: 'environmental' },
  { id: 'E1-2', standard: 'E1', label: 'Politiques liées à l\'atténuation et à l\'adaptation climatique',                requirement: 'conditional', types: ['narrative'],                            pillar: 'environmental' },
  { id: 'E1-3', standard: 'E1', label: 'Actions et ressources en lien avec les politiques climatiques',                  requirement: 'conditional', types: ['narrative', 'qualitative'],             pillar: 'environmental' },
  { id: 'E1-4', standard: 'E1', label: 'Objectifs liés à l\'atténuation et à l\'adaptation au changement climatique',    requirement: 'conditional', types: ['narrative', 'quantitative'],            pillar: 'environmental' },
  { id: 'E1-5', standard: 'E1', label: 'Consommation et mix énergétique',                                                requirement: 'conditional', types: ['quantitative'],                         pillar: 'environmental' },
  { id: 'E1-6', standard: 'E1', label: 'Émissions GES brutes — Scope 1, 2, 3 et total',                                  requirement: 'conditional', types: ['quantitative'],                         pillar: 'environmental' },
  { id: 'E1-7', standard: 'E1', label: 'Séquestration GES et projets d\'atténuation financés par crédits carbone',       requirement: 'conditional', types: ['quantitative', 'qualitative'],          pillar: 'environmental' },
  { id: 'E1-8', standard: 'E1', label: 'Tarification interne du carbone',                                                requirement: 'conditional', types: ['quantitative', 'qualitative'],          pillar: 'environmental' },
  { id: 'E1-9', standard: 'E1', label: 'Effets financiers anticipés des risques climatiques physiques et de transition',  requirement: 'conditional', types: ['quantitative', 'narrative'],            pillar: 'environmental' },

  // ── E2 — Pollution ────────────────────────────────────────────────────────
  { id: 'E2-1', standard: 'E2', label: 'Politiques liées à la prévention et contrôle de la pollution',              requirement: 'conditional', types: ['narrative'],                          pillar: 'environmental' },
  { id: 'E2-2', standard: 'E2', label: 'Actions et ressources liées à la pollution',                                requirement: 'conditional', types: ['narrative', 'qualitative'],           pillar: 'environmental' },
  { id: 'E2-3', standard: 'E2', label: 'Objectifs liés à la prévention et contrôle de la pollution',                requirement: 'conditional', types: ['narrative', 'quantitative'],          pillar: 'environmental' },
  { id: 'E2-4', standard: 'E2', label: 'Pollution de l\'air, de l\'eau et des sols',                                requirement: 'conditional', types: ['quantitative'],                       pillar: 'environmental' },
  { id: 'E2-5', standard: 'E2', label: 'Substances préoccupantes et substances extrêmement préoccupantes',          requirement: 'conditional', types: ['quantitative', 'qualitative'],        pillar: 'environmental' },
  { id: 'E2-6', standard: 'E2', label: 'Effets financiers anticipés des risques et opportunités liés à la pollution',requirement: 'conditional', types: ['quantitative', 'narrative'],          pillar: 'environmental' },

  // ── E3 — Eau et ressources marines ───────────────────────────────────────
  { id: 'E3-1', standard: 'E3', label: 'Politiques liées à l\'eau et aux ressources marines',                              requirement: 'conditional', types: ['narrative'],                     pillar: 'environmental' },
  { id: 'E3-2', standard: 'E3', label: 'Actions et ressources liées à l\'eau et ressources marines',                       requirement: 'conditional', types: ['narrative', 'qualitative'],      pillar: 'environmental' },
  { id: 'E3-3', standard: 'E3', label: 'Objectifs liés à l\'eau et ressources marines',                                    requirement: 'conditional', types: ['narrative', 'quantitative'],     pillar: 'environmental' },
  { id: 'E3-4', standard: 'E3', label: 'Consommation d\'eau',                                                              requirement: 'conditional', types: ['quantitative'],                  pillar: 'environmental' },
  { id: 'E3-5', standard: 'E3', label: 'Effets financiers anticipés des risques liés à l\'eau et ressources marines',     requirement: 'conditional', types: ['quantitative', 'narrative'],      pillar: 'environmental' },

  // ── E4 — Biodiversité et écosystèmes ─────────────────────────────────────
  { id: 'E4-1', standard: 'E4', label: 'Plan de transition et prise en compte de la biodiversité dans la stratégie',   requirement: 'conditional', types: ['narrative', 'qualitative'],     pillar: 'environmental' },
  { id: 'E4-2', standard: 'E4', label: 'Politiques liées à la biodiversité et aux écosystèmes',                        requirement: 'conditional', types: ['narrative'],                     pillar: 'environmental' },
  { id: 'E4-3', standard: 'E4', label: 'Actions et ressources liées à la biodiversité et aux écosystèmes',             requirement: 'conditional', types: ['narrative', 'qualitative'],     pillar: 'environmental' },
  { id: 'E4-4', standard: 'E4', label: 'Objectifs liés à la biodiversité et aux écosystèmes',                          requirement: 'conditional', types: ['narrative', 'quantitative'],    pillar: 'environmental' },
  { id: 'E4-5', standard: 'E4', label: 'Métriques d\'impact sur la biodiversité et les changements écosystémiques',    requirement: 'conditional', types: ['quantitative', 'qualitative'],  pillar: 'environmental' },
  { id: 'E4-6', standard: 'E4', label: 'Effets financiers anticipés des risques liés à la biodiversité',              requirement: 'conditional', types: ['quantitative', 'narrative'],    pillar: 'environmental' },

  // ── E5 — Utilisation des ressources et économie circulaire ────────────────
  { id: 'E5-1', standard: 'E5', label: 'Politiques liées à l\'utilisation des ressources et à l\'économie circulaire',  requirement: 'conditional', types: ['narrative'],                    pillar: 'environmental' },
  { id: 'E5-2', standard: 'E5', label: 'Actions et ressources pour l\'économie circulaire',                             requirement: 'conditional', types: ['narrative', 'qualitative'],     pillar: 'environmental' },
  { id: 'E5-3', standard: 'E5', label: 'Objectifs liés à l\'utilisation des ressources et l\'économie circulaire',     requirement: 'conditional', types: ['narrative', 'quantitative'],    pillar: 'environmental' },
  { id: 'E5-4', standard: 'E5', label: 'Flux entrants de ressources (matières premières, recyclées, renouvelables)',    requirement: 'conditional', types: ['quantitative'],                  pillar: 'environmental' },
  { id: 'E5-5', standard: 'E5', label: 'Flux sortants de ressources (produits, composants, déchets)',                  requirement: 'conditional', types: ['quantitative'],                  pillar: 'environmental' },
  { id: 'E5-6', standard: 'E5', label: 'Effets financiers anticipés des risques liés à l\'utilisation des ressources', requirement: 'conditional', types: ['quantitative', 'narrative'],    pillar: 'environmental' },

  // ── S1 — Effectifs propres ────────────────────────────────────────────────
  { id: 'S1-1',  standard: 'S1', label: 'Politiques liées aux effectifs propres',                                                   requirement: 'conditional', types: ['narrative'],                   pillar: 'social' },
  { id: 'S1-2',  standard: 'S1', label: 'Processus d\'engagement avec les travailleurs et leurs représentants',                     requirement: 'conditional', types: ['narrative'],                   pillar: 'social' },
  { id: 'S1-3',  standard: 'S1', label: 'Processus de remédiation et canaux de signalement pour les effectifs',                     requirement: 'conditional', types: ['narrative'],                   pillar: 'social' },
  { id: 'S1-4',  standard: 'S1', label: 'Actions pour gérer les impacts négatifs sur les effectifs propres',                        requirement: 'conditional', types: ['narrative', 'qualitative'],    pillar: 'social' },
  { id: 'S1-5',  standard: 'S1', label: 'Objectifs pour la gestion des impacts sur les effectifs propres',                          requirement: 'conditional', types: ['narrative', 'quantitative'],   pillar: 'social' },
  { id: 'S1-6',  standard: 'S1', label: 'Caractéristiques des employés (effectifs, type de contrat, temps de travail)',             requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-7',  standard: 'S1', label: 'Caractéristiques des travailleurs non-salariés dans les effectifs propres',               requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-8',  standard: 'S1', label: 'Couverture de la négociation collective et dialogue social',                               requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-9',  standard: 'S1', label: 'Indicateurs de diversité (genre, âge, nationalité)',                                       requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-10', standard: 'S1', label: 'Salaires adéquats — proportion de salariés au-dessus du salaire décent',                   requirement: 'conditional', types: ['quantitative', 'qualitative'], pillar: 'social' },
  { id: 'S1-11', standard: 'S1', label: 'Protection sociale (maladie, chômage, retraite, etc.)',                                    requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-12', standard: 'S1', label: 'Personnes handicapées dans les effectifs propres',                                         requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-13', standard: 'S1', label: 'Indicateurs de formation et développement des compétences',                                requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-14', standard: 'S1', label: 'Indicateurs de santé et sécurité au travail',                                             requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-15', standard: 'S1', label: 'Indicateurs d\'équilibre vie professionnelle / personnelle',                               requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-16', standard: 'S1', label: 'Indicateurs de rémunération — écart de salaire et rémunération totale',                   requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-17', standard: 'S1', label: 'Incidents, plaintes et violations graves des droits humains',                             requirement: 'conditional', types: ['quantitative', 'qualitative'], pillar: 'social' },

  // ── S2 — Travailleurs dans la chaîne de valeur ────────────────────────────
  { id: 'S2-1', standard: 'S2', label: 'Politiques liées aux travailleurs de la chaîne de valeur',                                   requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S2-2', standard: 'S2', label: 'Processus d\'engagement avec les travailleurs de la chaîne de valeur',                       requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S2-3', standard: 'S2', label: 'Processus de remédiation pour les travailleurs de la chaîne de valeur',                      requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S2-4', standard: 'S2', label: 'Actions sur les impacts matériels liés aux travailleurs de la chaîne de valeur',             requirement: 'conditional', types: ['narrative', 'qualitative'],   pillar: 'social' },
  { id: 'S2-5', standard: 'S2', label: 'Objectifs liés aux travailleurs de la chaîne de valeur',                                    requirement: 'conditional', types: ['narrative', 'quantitative'],  pillar: 'social' },

  // ── S3 — Communautés affectées ────────────────────────────────────────────
  { id: 'S3-1', standard: 'S3', label: 'Politiques liées aux communautés affectées',                                 requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S3-2', standard: 'S3', label: 'Processus d\'engagement avec les communautés affectées',                    requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S3-3', standard: 'S3', label: 'Processus de remédiation pour les communautés affectées',                   requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S3-4', standard: 'S3', label: 'Actions sur les impacts matériels liés aux communautés affectées',          requirement: 'conditional', types: ['narrative', 'qualitative'],   pillar: 'social' },
  { id: 'S3-5', standard: 'S3', label: 'Objectifs liés aux communautés affectées',                                  requirement: 'conditional', types: ['narrative', 'quantitative'],  pillar: 'social' },

  // ── S4 — Consommateurs et utilisateurs finaux ─────────────────────────────
  { id: 'S4-1', standard: 'S4', label: 'Politiques liées aux consommateurs et utilisateurs finaux',                                   requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S4-2', standard: 'S4', label: 'Processus d\'engagement avec les consommateurs',                                              requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S4-3', standard: 'S4', label: 'Processus de remédiation pour les consommateurs',                                             requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S4-4', standard: 'S4', label: 'Actions sur les impacts matériels liés aux consommateurs',                                   requirement: 'conditional', types: ['narrative', 'qualitative'],   pillar: 'social' },
  { id: 'S4-5', standard: 'S4', label: 'Objectifs liés aux consommateurs et utilisateurs finaux',                                    requirement: 'conditional', types: ['narrative', 'quantitative'],  pillar: 'social' },

  // ── G1 — Conduite des affaires ────────────────────────────────────────────
  { id: 'G1-1', standard: 'G1', label: 'Politiques de conduite des affaires et culture d\'entreprise',                    requirement: 'conditional', types: ['narrative'],                      pillar: 'governance' },
  { id: 'G1-2', standard: 'G1', label: 'Gestion des relations avec les fournisseurs',                                     requirement: 'conditional', types: ['narrative', 'qualitative'],       pillar: 'governance' },
  { id: 'G1-3', standard: 'G1', label: 'Prévention et détection de la corruption et des pots-de-vin',                    requirement: 'conditional', types: ['narrative', 'qualitative'],       pillar: 'governance' },
  { id: 'G1-4', standard: 'G1', label: 'Incidents de corruption ou pots-de-vin confirmés',                               requirement: 'conditional', types: ['quantitative', 'qualitative'],   pillar: 'governance' },
  { id: 'G1-5', standard: 'G1', label: 'Influence politique et activités de lobbying',                                   requirement: 'conditional', types: ['narrative', 'qualitative'],       pillar: 'governance' },
  { id: 'G1-6', standard: 'G1', label: 'Pratiques de paiement (délais fournisseurs)',                                    requirement: 'conditional', types: ['quantitative'],                   pillar: 'governance' },
];

const STANDARDS_LIST = ['ESRS 2', 'E1', 'E2', 'E3', 'E4', 'E5', 'S1', 'S2', 'S3', 'S4', 'G1'];

const REQ_CONFIG: Record<DisclosureReq, { label: string; bg: string; text: string }> = {
  mandatory:    { label: 'Obligatoire',    bg: 'bg-red-100',    text: 'text-red-700' },
  conditional:  { label: 'Conditionnel',   bg: 'bg-amber-100',  text: 'text-amber-700' },
  voluntary:    { label: 'Volontaire',     bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const TYPE_CONFIG: Record<DisclosureTyp, { label: string; bg: string; text: string }> = {
  quantitative: { label: 'Quantitatif', bg: 'bg-blue-100',   text: 'text-blue-700' },
  qualitative:  { label: 'Qualitatif',  bg: 'bg-violet-100', text: 'text-violet-700' },
  narrative:    { label: 'Narratif',    bg: 'bg-emerald-100',text: 'text-emerald-700' },
};

const PILLAR_STYLES = {
  environmental: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', icon: Leaf,      label: 'Environnement' },
  social:        { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       bar: 'bg-blue-500',    icon: Users,     label: 'Social' },
  governance:    { bg: 'bg-purple-50',  border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700',   bar: 'bg-purple-500',  icon: Building2, label: 'Gouvernance' },
};

const STATUS_CONFIG = {
  ready:   { label: 'Prêt',     color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
  partial: { label: 'Partiel',  color: 'text-amber-600',   bg: 'bg-amber-100',   icon: AlertCircle },
  missing: { label: 'Manquant', color: 'text-red-600',     bg: 'bg-red-100',     icon: XCircle },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function PillarSummary({ pillar, sections, style }: { pillar: string; sections: ESRSSection[]; style: typeof PILLAR_STYLES['environmental'] }) {
  const pillarSections = sections.filter(s => s.pillar === pillar);
  const totalDisc   = pillarSections.reduce((a, s) => a + s.disclosures_total, 0);
  const coveredDisc = pillarSections.reduce((a, s) => a + s.disclosures_covered, 0);
  const pct = totalDisc > 0 ? Math.round((coveredDisc / totalDisc) * 100) : 0;
  const Icon = style.icon;
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const strokeColor = pillar === 'environmental' ? '#10b981' : pillar === 'social' ? '#3b82f6' : '#a855f7';

  return (
    <div className={`flex flex-col items-center p-4 rounded-xl ${style.bg} border ${style.border}`}>
      <div className="relative w-20 h-20 mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={strokeColor} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{pct}%</span>
        </div>
      </div>
      <div className={`p-1.5 rounded-lg ${style.badge} mb-1`}><Icon className="h-4 w-4" /></div>
      <p className="text-sm font-semibold text-gray-700">{style.label}</p>
      <p className="text-xs text-gray-500">{coveredDisc}/{totalDisc} disclosures</p>
    </div>
  );
}

function SectionCard({ section, expanded, onToggle }: { section: ESRSSection; expanded: boolean; onToggle: () => void }) {
  const style = PILLAR_STYLES[section.pillar];
  const status = STATUS_CONFIG[section.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden transition-all">
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-bold ${style.badge}`}>{section.code}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{section.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{section.disclosures_covered}/{section.disclosures_total} disclosures couverts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="h-3 w-3" />{status.label}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Couverture</span>
            <span className="font-medium">{section.coverage_pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${section.coverage_pct}%` }} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className={`border-t border-gray-100 ${style.bg} p-4`}>
          <p className="text-xs text-gray-600 mb-3 italic">{section.description}</p>
          <div className="space-y-2">
            {section.disclosures.map(d => (
              <div key={d.id} className="flex items-start gap-2">
                {d.covered
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <span className="text-xs font-semibold text-gray-500 mr-2">{d.id}</span>
                  <span className="text-xs text-gray-700">{d.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ESRSGapAnalysis() {
  const [data, setData]                   = useState<GapAnalysis | null>(null);
  const [loading, setLoading]             = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [exporting, setExporting]         = useState(false);
  const [filterPillar, setFilterPillar]   = useState<string>('all');

  // Referentiel view state
  const [activeView, setActiveView]       = useState<'analyse' | 'referentiel'>('analyse');
  const [refSearch, setRefSearch]         = useState('');
  const [refStandard, setRefStandard]     = useState('all');
  const [refRequirement, setRefRequirement] = useState<'all' | DisclosureReq>('all');
  const [refPillar, setRefPillar]         = useState<'all' | ESRSDatapoint['pillar']>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/esrs/gap-analysis');
      setData(res.data);
    } catch {
      toast.error('Erreur lors du chargement de l\'analyse ESRS');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.post('/esrs/gap-analysis/export', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'esrs_gap_analysis.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Referentiel filtered list
  const filteredRef = ESRS_REFERENTIEL.filter(dp => {
    const q = refSearch.toLowerCase();
    const matchSearch = !q || dp.id.toLowerCase().includes(q) || dp.label.toLowerCase().includes(q) || dp.standard.toLowerCase().includes(q);
    const matchStd    = refStandard === 'all' || dp.standard === refStandard;
    const matchReq    = refRequirement === 'all' || dp.requirement === refRequirement;
    const matchPillar = refPillar === 'all' || dp.pillar === refPillar;
    return matchSearch && matchStd && matchReq && matchPillar;
  });

  const mandatoryCount    = ESRS_REFERENTIEL.filter(d => d.requirement === 'mandatory').length;
  const conditionalCount  = ESRS_REFERENTIEL.filter(d => d.requirement === 'conditional').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const filteredSections = filterPillar === 'all'
    ? data.sections
    : data.sections.filter(s => s.pillar === filterPillar);

  const r    = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (data.overall_coverage_pct / 100) * circ;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse de conformité ESRS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Couverture de vos données par rapport aux {data.total_disclosures} exigences CSRD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Actualiser">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={handleExport} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Export...' : 'Exporter CSV'}
          </button>
        </div>
      </div>

      {/* ── View switcher ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveView('analyse')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'analyse'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target className="h-4 w-4" />
          Analyse de couverture
        </button>
        <button
          onClick={() => setActiveView('referentiel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'referentiel'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Référentiel CSRD
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
            {ESRS_REFERENTIEL.length}
          </span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW A — Analyse de couverture
      ════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'analyse' && (
        <>
          {/* Overview row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 mb-3">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r={r} fill="none"
                    stroke={data.overall_coverage_pct >= 70 ? '#10b981' : data.overall_coverage_pct >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{data.overall_coverage_pct}%</span>
                  <span className="text-xs text-gray-500">couverture</span>
                </div>
              </div>
              <div className="flex gap-3 text-center">
                <div><p className="text-lg font-bold text-emerald-600">{data.sections_ready}</p><p className="text-xs text-gray-500">Prêts</p></div>
                <div className="w-px bg-gray-200" />
                <div><p className="text-lg font-bold text-amber-600">{data.sections_partial}</p><p className="text-xs text-gray-500">Partiels</p></div>
                <div className="w-px bg-gray-200" />
                <div><p className="text-lg font-bold text-red-500">{data.sections_missing}</p><p className="text-xs text-gray-500">Manquants</p></div>
              </div>
            </div>
            {(['environmental', 'social', 'governance'] as const).map(p => (
              <PillarSummary key={p} pillar={p} sections={data.sections} style={PILLAR_STYLES[p]} />
            ))}
          </div>

          {/* Pillar filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'environmental', label: '🌿 Environnement' },
              { key: 'social', label: '👥 Social' },
              { key: 'governance', label: '🏛️ Gouvernance' },
            ].map(f => (
              <button
                key={f.key} onClick={() => setFilterPillar(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterPillar === f.key
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Standards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSections.map(section => (
              <SectionCard
                key={section.code} section={section}
                expanded={expandedSection === section.code}
                onToggle={() => setExpandedSection(expandedSection === section.code ? null : section.code)}
              />
            ))}
          </div>

          {/* Footer tip */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Target className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Comment améliorer votre score ?</p>
                <p className="text-sm text-amber-700 mt-1">
                  Ajoutez des données dans <strong>Saisie des données</strong> en sélectionnant le pilier correspondant à chaque standard manquant.
                  Plus vous renseignez d'entrées avec des catégories précises, meilleure sera votre couverture ESRS.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW B — Référentiel CSRD (80 exigences)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'referentiel' && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{ESRS_REFERENTIEL.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Exigences totales</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-700">{mandatoryCount}</p>
              <p className="text-xs text-red-600 mt-0.5">Obligatoires (ESRS 2)</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-700">{conditionalCount}</p>
              <p className="text-xs text-amber-600 mt-0.5">Conditionnelles (si matériel)</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-700">{STANDARDS_LIST.length}</p>
              <p className="text-xs text-blue-600 mt-0.5">Standards ESRS couverts</p>
            </div>
          </div>

          {/* Search & filters */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par code, libellé ou standard…"
                  value={refSearch}
                  onChange={e => setRefSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {/* Standard filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={refStandard}
                  onChange={e => setRefStandard(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="all">Tous les standards</option>
                  {STANDARDS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Requirement filter */}
              {(['all', 'mandatory', 'conditional'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRefRequirement(r)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    refRequirement === r
                      ? 'bg-gray-800 text-white'
                      : r === 'mandatory'   ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : r === 'conditional' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r === 'all' ? 'Toutes exigences' : r === 'mandatory' ? '● Obligatoires' : '● Conditionnelles'}
                </button>
              ))}
              <div className="w-px bg-gray-200" />
              {/* Pillar filter */}
              {([
                { key: 'all', label: 'Tous piliers' },
                { key: 'cross-cutting', label: '⚙️ Transversal' },
                { key: 'environmental', label: '🌿 Env.' },
                { key: 'social', label: '👥 Social' },
                { key: 'governance', label: '🏛️ Gouv.' },
              ] as { key: ESRSDatapoint['pillar'] | 'all'; label: string }[]).map(p => (
                <button
                  key={p.key}
                  onClick={() => setRefPillar(p.key as 'all' | ESRSDatapoint['pillar'])}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    refPillar === p.key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{filteredRef.length} exigence{filteredRef.length !== 1 ? 's' : ''} affichée{filteredRef.length !== 1 ? 's' : ''}</span>
            {(refSearch || refStandard !== 'all' || refRequirement !== 'all' || refPillar !== 'all') && (
              <button
                onClick={() => { setRefSearch(''); setRefStandard('all'); setRefRequirement('all'); setRefPillar('all'); }}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[80px_90px_1fr_110px_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div>Code</div>
              <div>Standard</div>
              <div>Libellé</div>
              <div>Exigence</div>
              <div>Type</div>
            </div>

            {filteredRef.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Aucune exigence ne correspond aux filtres sélectionnés.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredRef.map((dp, idx) => {
                  const req  = REQ_CONFIG[dp.requirement];
                  const pillarColor =
                    dp.pillar === 'environmental' ? 'text-emerald-600 bg-emerald-50' :
                    dp.pillar === 'social'        ? 'text-blue-600 bg-blue-50' :
                    dp.pillar === 'governance'    ? 'text-purple-600 bg-purple-50' :
                                                   'text-gray-600 bg-gray-50';
                  return (
                    <div
                      key={dp.id}
                      className={`grid grid-cols-[80px_90px_1fr_110px_auto] gap-3 px-4 py-3 items-start hover:bg-gray-50 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-gray-50/40'
                      }`}
                    >
                      {/* Code */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono ${pillarColor}`}>
                          {dp.id}
                        </span>
                      </div>

                      {/* Standard */}
                      <div className="text-xs font-semibold text-gray-600 pt-0.5">{dp.standard}</div>

                      {/* Label */}
                      <div className="text-xs text-gray-700 leading-relaxed">{dp.label}</div>

                      {/* Requirement */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${req.bg} ${req.text}`}>
                          {req.label}
                        </span>
                      </div>

                      {/* Types */}
                      <div className="flex flex-wrap gap-1">
                        {dp.types.map(t => {
                          const tc = TYPE_CONFIG[t];
                          return (
                            <span key={t} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.text}`}>
                              {tc.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Type d'exigence</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Obligatoire</span>
                  <p className="text-xs text-gray-500">Requis pour <strong>toutes les entreprises</strong> soumises à la CSRD, indépendamment de l'évaluation de matérialité.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Conditionnel</span>
                  <p className="text-xs text-gray-500">Requis <strong>uniquement si le thème est matériel</strong> selon votre Double Analyse de Matérialité (DMA).</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Type de divulgation</p>
              <div className="space-y-2">
                {(['quantitative', 'qualitative', 'narrative'] as DisclosureTyp[]).map(t => {
                  const tc = TYPE_CONFIG[t];
                  return (
                    <div key={t} className="flex items-start gap-2">
                      <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.text}`}>{tc.label}</span>
                      <p className="text-xs text-gray-500">
                        {t === 'quantitative' ? 'Chiffres, métriques, KPIs mesurables avec unités.' :
                         t === 'qualitative'  ? 'Descriptions structurées de pratiques, politiques et résultats.' :
                                               'Texte explicatif sur la stratégie, le contexte et les engagements.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
