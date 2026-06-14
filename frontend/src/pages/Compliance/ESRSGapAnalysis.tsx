import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  CheckCircle2, XCircle, AlertCircle, Download, RefreshCw,
  ChevronDown, ChevronUp, Leaf, Users, Building2, Target,
  BookOpen, Search, Filter, FileText,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ── Types API ─────────────────────────────────────────────────────────────────
type DisclosureDetection = 'covered' | 'missing' | 'manual';

interface Disclosure {
  id: string;
  label: string;
  covered: boolean;
  // 'covered'/'missing' = data-evidenceable; 'manual' = narrative, to document
  detection?: DisclosureDetection;
}

interface ESRSSection {
  code: string;
  label: string;
  short: string;
  pillar: 'environmental' | 'social' | 'governance';
  pillar_color: string;
  description: string;
  coverage_pct: number;
  status: 'ready' | 'partial' | 'missing' | 'manual';
  matching_entries: number;
  disclosures_total: number;
  disclosures_auto?: number;     // data-evidenceable disclosures
  disclosures_covered: number;
  disclosures_missing: number;
  disclosures_manual?: number;   // narrative disclosures to document
  disclosures: Disclosure[];
}

interface GapAnalysis {
  overall_coverage_pct: number;
  total_entries: number;
  total_sections: number;
  sections_ready: number;
  sections_partial: number;
  sections_missing: number;
  sections_manual?: number;
  total_disclosures: number;
  total_auto_disclosures?: number;
  covered_disclosures: number;
  manual_disclosures?: number;
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

const getEsrsReferentiel = (t: TFunction): ESRSDatapoint[] => [
  // ── ESRS 2 — Exigences générales (toujours obligatoires) ──────────────────
  { id: 'GOV-1',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.GOV-1.label", "Rôles des organes de direction, gestion et supervision en matière de durabilité"),  requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-2',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.GOV-2.label", "Informations communiquées aux organes de direction sur les sujets de durabilité"), requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-3',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.GOV-3.label", "Intégration des performances durabilité dans les dispositifs d'incitation"),      requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-4',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.GOV-4.label", "Déclaration sur la diligence raisonnable"),                                        requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'GOV-5',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.GOV-5.label", "Gestion des risques et contrôles internes sur le reporting de durabilité"),        requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'SBM-1',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.SBM-1.label", "Stratégie, modèle d'affaires et chaîne de valeur"),                              requirement: 'mandatory',    types: ['narrative', 'qualitative'],    pillar: 'cross-cutting' },
  { id: 'SBM-2',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.SBM-2.label", "Intérêts et points de vue des parties prenantes"),                                 requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'SBM-3',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.SBM-3.label", "Impacts, risques et opportunités matériels et leur interaction avec la stratégie"), requirement: 'mandatory',    types: ['narrative', 'qualitative'],    pillar: 'cross-cutting' },
  { id: 'IRO-1',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.IRO-1.label", "Processus d'identification et d'évaluation des IRO matériels (DMA)"),            requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },
  { id: 'IRO-2',  standard: 'ESRS 2', label: t("compliance.esrsGap.dp.IRO-2.label", "Exigences de divulgation ESRS couvertes par la déclaration de durabilité"),       requirement: 'mandatory',    types: ['narrative'],                   pillar: 'cross-cutting' },

  // ── E1 — Changement climatique ────────────────────────────────────────────
  { id: 'E1-1', standard: 'E1', label: t("compliance.esrsGap.dp.E1-1.label", "Plan de transition vers l'atténuation du changement climatique"),                requirement: 'conditional', types: ['narrative', 'qualitative'],             pillar: 'environmental' },
  { id: 'E1-2', standard: 'E1', label: t("compliance.esrsGap.dp.E1-2.label", "Politiques liées à l'atténuation et à l'adaptation climatique"),                requirement: 'conditional', types: ['narrative'],                            pillar: 'environmental' },
  { id: 'E1-3', standard: 'E1', label: t("compliance.esrsGap.dp.E1-3.label", "Actions et ressources en lien avec les politiques climatiques"),                  requirement: 'conditional', types: ['narrative', 'qualitative'],             pillar: 'environmental' },
  { id: 'E1-4', standard: 'E1', label: t("compliance.esrsGap.dp.E1-4.label", "Objectifs liés à l'atténuation et à l'adaptation au changement climatique"),    requirement: 'conditional', types: ['narrative', 'quantitative'],            pillar: 'environmental' },
  { id: 'E1-5', standard: 'E1', label: t("compliance.esrsGap.dp.E1-5.label", "Consommation et mix énergétique"),                                                requirement: 'conditional', types: ['quantitative'],                         pillar: 'environmental' },
  { id: 'E1-6', standard: 'E1', label: t("compliance.esrsGap.dp.E1-6.label", "Émissions GES brutes — Scope 1, 2, 3 et total"),                                  requirement: 'conditional', types: ['quantitative'],                         pillar: 'environmental' },
  { id: 'E1-7', standard: 'E1', label: t("compliance.esrsGap.dp.E1-7.label", "Séquestration GES et projets d'atténuation financés par crédits carbone"),       requirement: 'conditional', types: ['quantitative', 'qualitative'],          pillar: 'environmental' },
  { id: 'E1-8', standard: 'E1', label: t("compliance.esrsGap.dp.E1-8.label", "Tarification interne du carbone"),                                                requirement: 'conditional', types: ['quantitative', 'qualitative'],          pillar: 'environmental' },
  { id: 'E1-9', standard: 'E1', label: t("compliance.esrsGap.dp.E1-9.label", "Effets financiers anticipés des risques climatiques physiques et de transition"),  requirement: 'conditional', types: ['quantitative', 'narrative'],            pillar: 'environmental' },

  // ── E2 — Pollution ────────────────────────────────────────────────────────
  { id: 'E2-1', standard: 'E2', label: t("compliance.esrsGap.dp.E2-1.label", "Politiques liées à la prévention et contrôle de la pollution"),              requirement: 'conditional', types: ['narrative'],                          pillar: 'environmental' },
  { id: 'E2-2', standard: 'E2', label: t("compliance.esrsGap.dp.E2-2.label", "Actions et ressources liées à la pollution"),                                requirement: 'conditional', types: ['narrative', 'qualitative'],           pillar: 'environmental' },
  { id: 'E2-3', standard: 'E2', label: t("compliance.esrsGap.dp.E2-3.label", "Objectifs liés à la prévention et contrôle de la pollution"),                requirement: 'conditional', types: ['narrative', 'quantitative'],          pillar: 'environmental' },
  { id: 'E2-4', standard: 'E2', label: t("compliance.esrsGap.dp.E2-4.label", "Pollution de l'air, de l'eau et des sols"),                                requirement: 'conditional', types: ['quantitative'],                       pillar: 'environmental' },
  { id: 'E2-5', standard: 'E2', label: t("compliance.esrsGap.dp.E2-5.label", "Substances préoccupantes et substances extrêmement préoccupantes"),          requirement: 'conditional', types: ['quantitative', 'qualitative'],        pillar: 'environmental' },
  { id: 'E2-6', standard: 'E2', label: t("compliance.esrsGap.dp.E2-6.label", "Effets financiers anticipés des risques et opportunités liés à la pollution"), requirement: 'conditional', types: ['quantitative', 'narrative'],          pillar: 'environmental' },

  // ── E3 — Eau et ressources marines ───────────────────────────────────────
  { id: 'E3-1', standard: 'E3', label: t("compliance.esrsGap.dp.E3-1.label", "Politiques liées à l'eau et aux ressources marines"),                              requirement: 'conditional', types: ['narrative'],                     pillar: 'environmental' },
  { id: 'E3-2', standard: 'E3', label: t("compliance.esrsGap.dp.E3-2.label", "Actions et ressources liées à l'eau et ressources marines"),                       requirement: 'conditional', types: ['narrative', 'qualitative'],      pillar: 'environmental' },
  { id: 'E3-3', standard: 'E3', label: t("compliance.esrsGap.dp.E3-3.label", "Objectifs liés à l'eau et ressources marines"),                                    requirement: 'conditional', types: ['narrative', 'quantitative'],     pillar: 'environmental' },
  { id: 'E3-4', standard: 'E3', label: t("compliance.esrsGap.dp.E3-4.label", "Consommation d'eau"),                                                              requirement: 'conditional', types: ['quantitative'],                  pillar: 'environmental' },
  { id: 'E3-5', standard: 'E3', label: t("compliance.esrsGap.dp.E3-5.label", "Effets financiers anticipés des risques liés à l'eau et ressources marines"),     requirement: 'conditional', types: ['quantitative', 'narrative'],      pillar: 'environmental' },

  // ── E4 — Biodiversité et écosystèmes ─────────────────────────────────────
  { id: 'E4-1', standard: 'E4', label: t("compliance.esrsGap.dp.E4-1.label", "Plan de transition et prise en compte de la biodiversité dans la stratégie"),   requirement: 'conditional', types: ['narrative', 'qualitative'],     pillar: 'environmental' },
  { id: 'E4-2', standard: 'E4', label: t("compliance.esrsGap.dp.E4-2.label", "Politiques liées à la biodiversité et aux écosystèmes"),                        requirement: 'conditional', types: ['narrative'],                     pillar: 'environmental' },
  { id: 'E4-3', standard: 'E4', label: t("compliance.esrsGap.dp.E4-3.label", "Actions et ressources liées à la biodiversité et aux écosystèmes"),             requirement: 'conditional', types: ['narrative', 'qualitative'],     pillar: 'environmental' },
  { id: 'E4-4', standard: 'E4', label: t("compliance.esrsGap.dp.E4-4.label", "Objectifs liés à la biodiversité et aux écosystèmes"),                          requirement: 'conditional', types: ['narrative', 'quantitative'],    pillar: 'environmental' },
  { id: 'E4-5', standard: 'E4', label: t("compliance.esrsGap.dp.E4-5.label", "Métriques d'impact sur la biodiversité et les changements écosystémiques"),    requirement: 'conditional', types: ['quantitative', 'qualitative'],  pillar: 'environmental' },
  { id: 'E4-6', standard: 'E4', label: t("compliance.esrsGap.dp.E4-6.label", "Effets financiers anticipés des risques liés à la biodiversité"),              requirement: 'conditional', types: ['quantitative', 'narrative'],    pillar: 'environmental' },

  // ── E5 — Utilisation des ressources et économie circulaire ────────────────
  { id: 'E5-1', standard: 'E5', label: t("compliance.esrsGap.dp.E5-1.label", "Politiques liées à l'utilisation des ressources et à l'économie circulaire"),  requirement: 'conditional', types: ['narrative'],                    pillar: 'environmental' },
  { id: 'E5-2', standard: 'E5', label: t("compliance.esrsGap.dp.E5-2.label", "Actions et ressources pour l'économie circulaire"),                             requirement: 'conditional', types: ['narrative', 'qualitative'],     pillar: 'environmental' },
  { id: 'E5-3', standard: 'E5', label: t("compliance.esrsGap.dp.E5-3.label", "Objectifs liés à l'utilisation des ressources et l'économie circulaire"),     requirement: 'conditional', types: ['narrative', 'quantitative'],    pillar: 'environmental' },
  { id: 'E5-4', standard: 'E5', label: t("compliance.esrsGap.dp.E5-4.label", "Flux entrants de ressources (matières premières, recyclées, renouvelables)"),    requirement: 'conditional', types: ['quantitative'],                  pillar: 'environmental' },
  { id: 'E5-5', standard: 'E5', label: t("compliance.esrsGap.dp.E5-5.label", "Flux sortants de ressources (produits, composants, déchets)"),                  requirement: 'conditional', types: ['quantitative'],                  pillar: 'environmental' },
  { id: 'E5-6', standard: 'E5', label: t("compliance.esrsGap.dp.E5-6.label", "Effets financiers anticipés des risques liés à l'utilisation des ressources"), requirement: 'conditional', types: ['quantitative', 'narrative'],    pillar: 'environmental' },

  // ── S1 — Effectifs propres ────────────────────────────────────────────────
  { id: 'S1-1',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-1.label", "Politiques liées aux effectifs propres"),                                                   requirement: 'conditional', types: ['narrative'],                   pillar: 'social' },
  { id: 'S1-2',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-2.label", "Processus d'engagement avec les travailleurs et leurs représentants"),                     requirement: 'conditional', types: ['narrative'],                   pillar: 'social' },
  { id: 'S1-3',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-3.label", "Processus de remédiation et canaux de signalement pour les effectifs"),                     requirement: 'conditional', types: ['narrative'],                   pillar: 'social' },
  { id: 'S1-4',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-4.label", "Actions pour gérer les impacts négatifs sur les effectifs propres"),                        requirement: 'conditional', types: ['narrative', 'qualitative'],    pillar: 'social' },
  { id: 'S1-5',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-5.label", "Objectifs pour la gestion des impacts sur les effectifs propres"),                          requirement: 'conditional', types: ['narrative', 'quantitative'],   pillar: 'social' },
  { id: 'S1-6',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-6.label", "Caractéristiques des employés (effectifs, type de contrat, temps de travail)"),             requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-7',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-7.label", "Caractéristiques des travailleurs non-salariés dans les effectifs propres"),               requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-8',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-8.label", "Couverture de la négociation collective et dialogue social"),                               requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-9',  standard: 'S1', label: t("compliance.esrsGap.dp.S1-9.label", "Indicateurs de diversité (genre, âge, nationalité)"),                                       requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-10', standard: 'S1', label: t("compliance.esrsGap.dp.S1-10.label", "Salaires adéquats — proportion de salariés au-dessus du salaire décent"),                   requirement: 'conditional', types: ['quantitative', 'qualitative'], pillar: 'social' },
  { id: 'S1-11', standard: 'S1', label: t("compliance.esrsGap.dp.S1-11.label", "Protection sociale (maladie, chômage, retraite, etc.)"),                                    requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-12', standard: 'S1', label: t("compliance.esrsGap.dp.S1-12.label", "Personnes handicapées dans les effectifs propres"),                                         requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-13', standard: 'S1', label: t("compliance.esrsGap.dp.S1-13.label", "Indicateurs de formation et développement des compétences"),                                requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-14', standard: 'S1', label: t("compliance.esrsGap.dp.S1-14.label", "Indicateurs de santé et sécurité au travail"),                                             requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-15', standard: 'S1', label: t("compliance.esrsGap.dp.S1-15.label", "Indicateurs d'équilibre vie professionnelle / personnelle"),                               requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-16', standard: 'S1', label: t("compliance.esrsGap.dp.S1-16.label", "Indicateurs de rémunération — écart de salaire et rémunération totale"),                   requirement: 'conditional', types: ['quantitative'],                pillar: 'social' },
  { id: 'S1-17', standard: 'S1', label: t("compliance.esrsGap.dp.S1-17.label", "Incidents, plaintes et violations graves des droits humains"),                             requirement: 'conditional', types: ['quantitative', 'qualitative'], pillar: 'social' },

  // ── S2 — Travailleurs dans la chaîne de valeur ────────────────────────────
  { id: 'S2-1', standard: 'S2', label: t("compliance.esrsGap.dp.S2-1.label", "Politiques liées aux travailleurs de la chaîne de valeur"),                                   requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S2-2', standard: 'S2', label: t("compliance.esrsGap.dp.S2-2.label", "Processus d'engagement avec les travailleurs de la chaîne de valeur"),                       requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S2-3', standard: 'S2', label: t("compliance.esrsGap.dp.S2-3.label", "Processus de remédiation pour les travailleurs de la chaîne de valeur"),                      requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S2-4', standard: 'S2', label: t("compliance.esrsGap.dp.S2-4.label", "Actions sur les impacts matériels liés aux travailleurs de la chaîne de valeur"),             requirement: 'conditional', types: ['narrative', 'qualitative'],   pillar: 'social' },
  { id: 'S2-5', standard: 'S2', label: t("compliance.esrsGap.dp.S2-5.label", "Objectifs liés aux travailleurs de la chaîne de valeur"),                                    requirement: 'conditional', types: ['narrative', 'quantitative'],  pillar: 'social' },

  // ── S3 — Communautés affectées ────────────────────────────────────────────
  { id: 'S3-1', standard: 'S3', label: t("compliance.esrsGap.dp.S3-1.label", "Politiques liées aux communautés affectées"),                                 requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S3-2', standard: 'S3', label: t("compliance.esrsGap.dp.S3-2.label", "Processus d'engagement avec les communautés affectées"),                    requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S3-3', standard: 'S3', label: t("compliance.esrsGap.dp.S3-3.label", "Processus de remédiation pour les communautés affectées"),                   requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S3-4', standard: 'S3', label: t("compliance.esrsGap.dp.S3-4.label", "Actions sur les impacts matériels liés aux communautés affectées"),          requirement: 'conditional', types: ['narrative', 'qualitative'],   pillar: 'social' },
  { id: 'S3-5', standard: 'S3', label: t("compliance.esrsGap.dp.S3-5.label", "Objectifs liés aux communautés affectées"),                                  requirement: 'conditional', types: ['narrative', 'quantitative'],  pillar: 'social' },

  // ── S4 — Consommateurs et utilisateurs finaux ─────────────────────────────
  { id: 'S4-1', standard: 'S4', label: t("compliance.esrsGap.dp.S4-1.label", "Politiques liées aux consommateurs et utilisateurs finaux"),                                   requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S4-2', standard: 'S4', label: t("compliance.esrsGap.dp.S4-2.label", "Processus d'engagement avec les consommateurs"),                                              requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S4-3', standard: 'S4', label: t("compliance.esrsGap.dp.S4-3.label", "Processus de remédiation pour les consommateurs"),                                             requirement: 'conditional', types: ['narrative'],                  pillar: 'social' },
  { id: 'S4-4', standard: 'S4', label: t("compliance.esrsGap.dp.S4-4.label", "Actions sur les impacts matériels liés aux consommateurs"),                                   requirement: 'conditional', types: ['narrative', 'qualitative'],   pillar: 'social' },
  { id: 'S4-5', standard: 'S4', label: t("compliance.esrsGap.dp.S4-5.label", "Objectifs liés aux consommateurs et utilisateurs finaux"),                                    requirement: 'conditional', types: ['narrative', 'quantitative'],  pillar: 'social' },

  // ── G1 — Conduite des affaires ────────────────────────────────────────────
  { id: 'G1-1', standard: 'G1', label: t("compliance.esrsGap.dp.G1-1.label", "Politiques de conduite des affaires et culture d'entreprise"),                    requirement: 'conditional', types: ['narrative'],                      pillar: 'governance' },
  { id: 'G1-2', standard: 'G1', label: t("compliance.esrsGap.dp.G1-2.label", "Gestion des relations avec les fournisseurs"),                                     requirement: 'conditional', types: ['narrative', 'qualitative'],       pillar: 'governance' },
  { id: 'G1-3', standard: 'G1', label: t("compliance.esrsGap.dp.G1-3.label", "Prévention et détection de la corruption et des pots-de-vin"),                    requirement: 'conditional', types: ['narrative', 'qualitative'],       pillar: 'governance' },
  { id: 'G1-4', standard: 'G1', label: t("compliance.esrsGap.dp.G1-4.label", "Incidents de corruption ou pots-de-vin confirmés"),                               requirement: 'conditional', types: ['quantitative', 'qualitative'],   pillar: 'governance' },
  { id: 'G1-5', standard: 'G1', label: t("compliance.esrsGap.dp.G1-5.label", "Influence politique et activités de lobbying"),                                   requirement: 'conditional', types: ['narrative', 'qualitative'],       pillar: 'governance' },
  { id: 'G1-6', standard: 'G1', label: t("compliance.esrsGap.dp.G1-6.label", "Pratiques de paiement (délais fournisseurs)"),                                    requirement: 'conditional', types: ['quantitative'],                   pillar: 'governance' },
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
  ready:   { label: 'Prêt',         color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
  partial: { label: 'Partiel',      color: 'text-amber-600',   bg: 'bg-amber-100',   icon: AlertCircle },
  missing: { label: 'Manquant',     color: 'text-red-600',     bg: 'bg-red-100',     icon: XCircle },
  manual:  { label: 'À documenter', color: 'text-slate-600',   bg: 'bg-slate-100',   icon: FileText },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function PillarSummary({ pillar, sections, style }: { pillar: string; sections: ESRSSection[]; style: typeof PILLAR_STYLES['environmental'] }) {
  const { t } = useTranslation();
  const pillarSections = sections.filter(s => s.pillar === pillar);
  // Coverage is measured against data-evidenceable (auto) disclosures so the
  // ring isn't dragged down by narrative items that need manual documentation.
  const autoDisc    = pillarSections.reduce((a, s) => a + (s.disclosures_auto ?? s.disclosures_total), 0);
  const coveredDisc = pillarSections.reduce((a, s) => a + s.disclosures_covered, 0);
  const pct = autoDisc > 0 ? Math.round((coveredDisc / autoDisc) * 100) : 0;
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
      <p className="text-sm font-semibold text-gray-700">{t(`compliance.esrsGap.pillar.${pillar}`, style.label)}</p>
      <p className="text-xs text-gray-500">{t('compliance.esrsGap.disclosures', '{{covered}}/{{total}} disclosures', { covered: coveredDisc, total: autoDisc })}</p>
    </div>
  );
}

function SectionCard({ section, expanded, onToggle }: { section: ESRSSection; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
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
              <p className="text-xs text-gray-500 mt-0.5">
                {t('compliance.esrsGap.sectionCard.disclosuresCovered', '{{covered}}/{{total}} disclosures couverts', { covered: section.disclosures_covered, total: section.disclosures_auto ?? section.disclosures_total })}
                {(section.disclosures_manual ?? 0) > 0 && (
                  <span className="text-slate-400"> · {t('compliance.esrsGap.sectionCard.toDocument', '{{count}} à documenter', { count: section.disclosures_manual })}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="h-3 w-3" />{t(`compliance.esrsGap.status.${section.status}`, status.label)}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('compliance.esrsGap.sectionCard.coverage', 'Couverture')}</span>
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
            {section.disclosures.map(d => {
              const detection: DisclosureDetection = d.detection ?? (d.covered ? 'covered' : 'missing');
              return (
                <div key={d.id} className="flex items-start gap-2">
                  {detection === 'covered'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    : detection === 'manual'
                      ? <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div>
                    <span className="text-xs font-semibold text-gray-500 mr-2">{d.id}</span>
                    <span className="text-xs text-gray-700">{d.label}</span>
                    {detection === 'manual' && (
                      <span className="ml-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">{t('compliance.esrsGap.disclosure.manual', 'à documenter')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ESRSGapAnalysis() {
  const { t } = useTranslation();
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

  const esrsReferentiel = getEsrsReferentiel(t);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/esrs/gap-analysis');
      setData(res.data);
    } catch {
      toast.error(t('compliance.esrsGap.toast.loadError', "Erreur lors du chargement de l'analyse ESRS"));
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
      toast.success(t('compliance.esrsGap.toast.exported', 'Export CSV téléchargé'));
    } catch {
      toast.error(t('compliance.esrsGap.toast.exportError', "Erreur lors de l'export"));
    } finally {
      setExporting(false);
    }
  };

  // Referentiel filtered list
  const filteredRef = esrsReferentiel.filter(dp => {
    const q = refSearch.toLowerCase();
    const matchSearch = !q || dp.id.toLowerCase().includes(q) || dp.label.toLowerCase().includes(q) || dp.standard.toLowerCase().includes(q);
    const matchStd    = refStandard === 'all' || dp.standard === refStandard;
    const matchReq    = refRequirement === 'all' || dp.requirement === refRequirement;
    const matchPillar = refPillar === 'all' || dp.pillar === refPillar;
    return matchSearch && matchStd && matchReq && matchPillar;
  });

  const mandatoryCount    = esrsReferentiel.filter(d => d.requirement === 'mandatory').length;
  const conditionalCount  = esrsReferentiel.filter(d => d.requirement === 'conditional').length;

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
    <div
      className="rounded-2xl p-6 max-w-6xl mx-auto space-y-6 shadow-xl"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #4f46e5 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
        <div className="relative px-8 py-7 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
              CSRD · Directive 2022/2464
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">{t('compliance.esrsGap.title', 'Analyse de conformité ESRS')}</h1>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {t('compliance.esrsGap.subtitle', 'Couverture de vos données par rapport aux {{total}} exigences CSRD', { total: data.total_disclosures })}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {t('compliance.esrsGap.badge.totalReqs', '{{total}} exigences CSRD', { total: data.total_disclosures })}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: data.overall_coverage_pct >= 70 ? 'rgba(16,185,129,0.25)' : data.overall_coverage_pct >= 40 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.2)', color: data.overall_coverage_pct >= 70 ? '#6ee7b7' : data.overall_coverage_pct >= 40 ? '#fcd34d' : '#fca5a5' }}>
                {t('compliance.esrsGap.badge.covered', '{{pct}}% couvert', { pct: data.overall_coverage_pct })}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
                {t('compliance.esrsGap.badge.sections', '{{count}} sections ESRS', { count: data.sections.length })}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
              <RefreshCw className="h-4 w-4" /> {t('compliance.esrsGap.refresh', 'Actualiser')}
            </button>
            <button
              onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50"
              style={{ background: 'white', color: '#1d4ed8' }}
            >
              <Download className="h-4 w-4" />
              {exporting ? t('compliance.esrsGap.exporting', 'Export...') : t('compliance.esrsGap.exportCsv', 'Exporter CSV')}
            </button>
          </div>
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
          {t('compliance.esrsGap.view.analyse', 'Analyse de couverture')}
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
          {t('compliance.esrsGap.view.referentiel', 'Référentiel CSRD')}
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
            {esrsReferentiel.length}
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
                  <span className="text-xs text-gray-500">{t('compliance.esrsGap.overview.coverage', 'couverture')}</span>
                </div>
              </div>
              <div className="flex gap-3 text-center">
                <div><p className="text-lg font-bold text-emerald-600">{data.sections_ready}</p><p className="text-xs text-gray-500">{t('compliance.esrsGap.overview.ready', 'Prêts')}</p></div>
                <div className="w-px bg-gray-200" />
                <div><p className="text-lg font-bold text-amber-600">{data.sections_partial}</p><p className="text-xs text-gray-500">{t('compliance.esrsGap.overview.partial', 'Partiels')}</p></div>
                <div className="w-px bg-gray-200" />
                <div><p className="text-lg font-bold text-red-500">{data.sections_missing}</p><p className="text-xs text-gray-500">{t('compliance.esrsGap.overview.missing', 'Manquants')}</p></div>
                {(data.sections_manual ?? 0) > 0 && (
                  <>
                    <div className="w-px bg-gray-200" />
                    <div><p className="text-lg font-bold text-slate-500">{data.sections_manual}</p><p className="text-xs text-gray-500">{t('compliance.esrsGap.overview.manual', 'À documenter')}</p></div>
                  </>
                )}
              </div>
            </div>
            {(['environmental', 'social', 'governance'] as const).map(p => (
              <PillarSummary key={p} pillar={p} sections={data.sections} style={PILLAR_STYLES[p]} />
            ))}
          </div>

          {/* Pillar filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: t('compliance.esrsGap.filter.all', 'Tous') },
              { key: 'environmental', label: t('compliance.esrsGap.filter.environmental', '🌿 Environnement') },
              { key: 'social', label: t('compliance.esrsGap.filter.social', '👥 Social') },
              { key: 'governance', label: t('compliance.esrsGap.filter.governance', '🏛️ Gouvernance') },
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
                <p className="text-sm font-semibold text-amber-800">{t('compliance.esrsGap.tip.title', 'Comment améliorer votre score ?')}</p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('compliance.esrsGap.tip.body', "Ajoutez des données dans Saisie des données en sélectionnant le pilier correspondant à chaque standard manquant. Plus vous renseignez d'entrées avec des catégories précises, meilleure sera votre couverture ESRS.")}
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
              <p className="text-2xl font-bold text-gray-900">{esrsReferentiel.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('compliance.esrsGap.ref.totalReqs', 'Exigences totales')}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-700">{mandatoryCount}</p>
              <p className="text-xs text-red-600 mt-0.5">{t('compliance.esrsGap.ref.mandatory', 'Obligatoires (ESRS 2)')}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-700">{conditionalCount}</p>
              <p className="text-xs text-amber-600 mt-0.5">{t('compliance.esrsGap.ref.conditional', 'Conditionnelles (si matériel)')}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-700">{STANDARDS_LIST.length}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t('compliance.esrsGap.ref.standardsCovered', 'Standards ESRS couverts')}</p>
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
                  placeholder={t('compliance.esrsGap.search.placeholder', 'Rechercher par code, libellé ou standard…')}
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
                  <option value="all">{t('compliance.esrsGap.filter.allStandards', 'Tous les standards')}</option>
                  {STANDARDS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Requirement filter */}
              {(['all', 'mandatory', 'conditional'] as const).map(req => (
                <button
                  key={req}
                  onClick={() => setRefRequirement(req)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    refRequirement === req
                      ? 'bg-gray-800 text-white'
                      : req === 'mandatory'   ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : req === 'conditional' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {req === 'all' ? t('compliance.esrsGap.req.all', 'Toutes exigences') : req === 'mandatory' ? t('compliance.esrsGap.req.mandatory', '● Obligatoires') : t('compliance.esrsGap.req.conditional', '● Conditionnelles')}
                </button>
              ))}
              <div className="w-px bg-gray-200" />
              {/* Pillar filter */}
              {([
                { key: 'all', label: t('compliance.esrsGap.refPillar.all', 'Tous piliers') },
                { key: 'cross-cutting', label: t('compliance.esrsGap.refPillar.crossCutting', '⚙️ Transversal') },
                { key: 'environmental', label: t('compliance.esrsGap.refPillar.environmental', '🌿 Env.') },
                { key: 'social', label: t('compliance.esrsGap.refPillar.social', '👥 Social') },
                { key: 'governance', label: t('compliance.esrsGap.refPillar.governance', '🏛️ Gouv.') },
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
            <span>{t('compliance.esrsGap.resultsCount', '{{count}} exigence(s) affichée(s)', { count: filteredRef.length })}</span>
            {(refSearch || refStandard !== 'all' || refRequirement !== 'all' || refPillar !== 'all') && (
              <button
                onClick={() => { setRefSearch(''); setRefStandard('all'); setRefRequirement('all'); setRefPillar('all'); }}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                {t('compliance.esrsGap.resetFilters', 'Réinitialiser les filtres')}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[80px_90px_1fr_110px_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div>{t('compliance.esrsGap.table.code', 'Code')}</div>
              <div>{t('compliance.esrsGap.table.standard', 'Standard')}</div>
              <div>{t('compliance.esrsGap.table.label', 'Libellé')}</div>
              <div>{t('compliance.esrsGap.table.requirement', 'Exigence')}</div>
              <div>{t('compliance.esrsGap.table.type', 'Type')}</div>
            </div>

            {filteredRef.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                {t('compliance.esrsGap.table.empty', 'Aucune exigence ne correspond aux filtres sélectionnés.')}
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
                          {t(`compliance.esrsGap.reqLabel.${dp.requirement}`, req.label)}
                        </span>
                      </div>

                      {/* Types */}
                      <div className="flex flex-wrap gap-1">
                        {dp.types.map(typ => {
                          const tc = TYPE_CONFIG[typ];
                          return (
                            <span key={typ} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.text}`}>
                              {t(`compliance.esrsGap.typeLabel.${typ}`, tc.label)}
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
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">{t('compliance.esrsGap.legend.reqType', "Type d'exigence")}</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{t('compliance.esrsGap.legend.mandatory', 'Obligatoire')}</span>
                  <p className="text-xs text-gray-500">{t('compliance.esrsGap.legend.mandatoryDesc', "Requis pour toutes les entreprises soumises à la CSRD, indépendamment de l'évaluation de matérialité.")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{t('compliance.esrsGap.legend.conditional', 'Conditionnel')}</span>
                  <p className="text-xs text-gray-500">{t('compliance.esrsGap.legend.conditionalDesc', 'Requis uniquement si le thème est matériel selon votre Double Analyse de Matérialité (DMA).')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">{t('compliance.esrsGap.legend.discType', 'Type de divulgation')}</p>
              <div className="space-y-2">
                {(['quantitative', 'qualitative', 'narrative'] as DisclosureTyp[]).map(typ => {
                  const tc = TYPE_CONFIG[typ];
                  return (
                    <div key={typ} className="flex items-start gap-2">
                      <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.text}`}>{t(`compliance.esrsGap.typeLabel.${typ}`, tc.label)}</span>
                      <p className="text-xs text-gray-500">
                        {typ === 'quantitative' ? t('compliance.esrsGap.typeDesc.quantitative', 'Chiffres, métriques, KPIs mesurables avec unités.') :
                         typ === 'qualitative'  ? t('compliance.esrsGap.typeDesc.qualitative', 'Descriptions structurées de pratiques, politiques et résultats.') :
                                                  t('compliance.esrsGap.typeDesc.narrative', 'Texte explicatif sur la stratégie, le contexte et les engagements.')}
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
