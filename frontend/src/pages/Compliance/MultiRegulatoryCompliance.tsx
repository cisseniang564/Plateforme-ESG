import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
// ⚡ Export libs loaded lazily (dynamic import) to avoid bundle-init crashes
import {
  Shield, CheckCircle, XCircle, AlertTriangle, ChevronDown,
  ChevronRight, FileText, Download, ExternalLink, Info,
  Building2, Globe, Scale, Landmark, Banknote, Leaf,
  BarChart3, Users, TrendingUp, RefreshCw, ArrowRight, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'conforme' | 'partiel' | 'non_conforme' | 'na';

interface CheckItem {
  label: string;
  status: Status;
  note?: string;
}

interface Regulation {
  id: string;
  name: string;
  fullName: string;
  category: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  scope: string;
  deadline: string;
  authority: string;
  globalStatus: Status;
  score: number; // 0-100
  checks: CheckItem[];
  actions: string[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusConfig: Record<Status, { label: string; color: string; bg: string; icon: any }> = {
  conforme:      { label: 'Conforme',       color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  partiel:       { label: 'Partiel',        color: 'text-amber-700',  bg: 'bg-amber-100',  icon: AlertTriangle },
  non_conforme:  { label: 'Non conforme',   color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
  na:            { label: 'N/A',            color: 'text-gray-500',   bg: 'bg-gray-100',   icon: Info },
};

function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  const statusLabels: Record<Status, string> = {
    conforme: t('compliance.statusCompliant'),
    partiel: t('compliance.statusPartial'),
    non_conforme: t('compliance.statusNonCompliant'),
    na: t('compliance.statusNa'),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusLabels[status]}
    </span>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      <text x="24" y="24" dominantBaseline="middle" textAnchor="middle"
        className="fill-gray-900 text-[10px] font-bold" style={{ transform: 'rotate(90deg)', transformOrigin: '24px 24px', fontSize: 10 }}>
        {score}%
      </text>
    </svg>
  );
}

// ─── Regulations data ─────────────────────────────────────────────────────────
const getRegulations = (t: TFunction): Regulation[] => [
  {
    id: 'csrd',
    name: 'CSRD',
    fullName: t('compliance.multiReg.csrd.fullName', 'Corporate Sustainability Reporting Directive'),
    category: 'Reporting ESG',
    icon: FileText,
    color: '#16a34a',
    bgColor: 'bg-green-50',
    description: t('compliance.multiReg.csrd.description', "Directive européenne imposant un reporting de durabilité standardisé selon les ESRS pour les grandes entreprises."),
    scope: t('compliance.multiReg.csrd.scope', "Entreprises >250 salariés ou >40M€ CA"),
    deadline: 'Exercice 2024 (rapport 2025)',
    authority: t('compliance.multiReg.csrd.authority', 'Commission Européenne / EFRAG'),
    globalStatus: 'partiel',
    score: 72,
    checks: [
      { label: t('compliance.multiReg.csrd.check1', 'Collecte des données ESRS'), status: 'conforme' },
      { label: t('compliance.multiReg.csrd.check2', 'Double matérialité documentée'), status: 'conforme' },
      { label: t('compliance.multiReg.csrd.check3', 'Indicateurs E1 (Changement climatique)'), status: 'conforme' },
      { label: t('compliance.multiReg.csrd.check4', 'Indicateurs S1 (Effectifs propres)'), status: 'partiel', note: t('compliance.multiReg.csrd.note4', 'Données partielles Q3') },
      { label: t('compliance.multiReg.csrd.check5', 'Indicateurs G1 (Gouvernance)'), status: 'partiel', note: t('compliance.multiReg.csrd.note5', 'Politique anticorruption à formaliser') },
      { label: t('compliance.multiReg.csrd.check6', 'Audit / assurance limitée'), status: 'non_conforme', note: t('compliance.multiReg.csrd.note6', 'Commissaire aux comptes non mandaté') },
      { label: t('compliance.multiReg.csrd.check7', 'Publication dans rapport de gestion'), status: 'non_conforme' },
    ],
    actions: [
      t('compliance.multiReg.csrd.action1', "Mandater un commissaire aux comptes pour l'assurance limitée"),
      t('compliance.multiReg.csrd.action2', 'Compléter indicateurs S1-S4'),
      t('compliance.multiReg.csrd.action3', 'Intégrer au rapport de gestion annuel'),
    ],
  },
  {
    id: 'taxonomie',
    name: 'Taxonomie UE',
    fullName: t('compliance.multiReg.taxonomie.fullName', 'Règlement UE 2020/852 — Taxonomie verte'),
    category: 'Finance durable',
    icon: Leaf,
    color: '#059669',
    bgColor: 'bg-emerald-50',
    description: t('compliance.multiReg.taxonomie.description', 'Classification des activités économiques durables selon 6 objectifs environnementaux. Exigée pour les rapports NFRD/CSRD.'),
    scope: t('compliance.multiReg.taxonomie.scope', 'Grandes entreprises cotées + secteur financier'),
    deadline: 'Annuel — exercice en cours',
    authority: t('compliance.multiReg.taxonomie.authority', 'Commission Européenne'),
    globalStatus: 'partiel',
    score: 58,
    checks: [
      { label: t('compliance.multiReg.taxonomie.check1', 'Éligibilité des activités identifiée'), status: 'conforme' },
      { label: t('compliance.multiReg.taxonomie.check2', "Critères techniques d'examen (CTE)"), status: 'partiel' },
      { label: t('compliance.multiReg.taxonomie.check3', 'Principe DNSH (pas de préjudice significatif)'), status: 'partiel', note: t('compliance.multiReg.taxonomie.note3', 'Objectifs eau et biodiversité à compléter') },
      { label: t('compliance.multiReg.taxonomie.check4', 'Garanties minimales sociales'), status: 'conforme' },
      { label: t('compliance.multiReg.taxonomie.check5', 'Calcul % CA aligné'), status: 'non_conforme' },
      { label: t('compliance.multiReg.taxonomie.check6', 'Calcul % CapEx aligné'), status: 'non_conforme' },
      { label: t('compliance.multiReg.taxonomie.check7', 'Calcul % OpEx aligné'), status: 'non_conforme' },
    ],
    actions: [
      t('compliance.multiReg.taxonomie.action1', 'Calculer les ratios CA/CapEx/OpEx alignés'),
      t('compliance.multiReg.taxonomie.action2', 'Documenter les CTE pour chaque activité éligible'),
      t('compliance.multiReg.taxonomie.action3', "Compléter l'analyse DNSH eau et biodiversité"),
    ],
  },
  {
    id: 'dpef',
    name: 'DPEF',
    fullName: t('compliance.multiReg.dpef.fullName', 'Déclaration de Performance Extra-Financière'),
    category: 'Reporting ESG',
    icon: BarChart3,
    color: '#2563eb',
    bgColor: 'bg-blue-50',
    description: t('compliance.multiReg.dpef.description', 'Rapport annuel obligatoire sur les enjeux sociaux, environnementaux et de gouvernance. Remplacée progressivement par la CSRD.'),
    scope: t('compliance.multiReg.dpef.scope', "SA/SCA cotées >500 salariés, SAS >500 salariés et >100M€ CA"),
    deadline: 'Rapport de gestion annuel',
    authority: t('compliance.multiReg.dpef.authority', 'AMF / Commissaires aux comptes'),
    globalStatus: 'conforme',
    score: 85,
    checks: [
      { label: t('compliance.multiReg.dpef.check1', 'Informations sociales (effectifs, égalité, santé)'), status: 'conforme' },
      { label: t('compliance.multiReg.dpef.check2', 'Informations environnementales (GHG, eau, déchets)'), status: 'conforme' },
      { label: t('compliance.multiReg.dpef.check3', 'Informations sociétales (sous-traitance, droits humains)'), status: 'partiel' },
      { label: t('compliance.multiReg.dpef.check4', "Modèle d'affaires et risques extra-financiers"), status: 'conforme' },
      { label: t('compliance.multiReg.dpef.check5', 'Vérification organisme tiers indépendant (OTI)'), status: 'conforme' },
      { label: t('compliance.multiReg.dpef.check6', 'Publication dans rapport de gestion'), status: 'conforme' },
    ],
    actions: [
      t('compliance.multiReg.dpef.action1', 'Renforcer le reporting sur la sous-traitance et les droits humains (Pilier 3 DPEF)'),
    ],
  },
  {
    id: 'sapin2',
    name: 'Loi Sapin II',
    fullName: t('compliance.multiReg.sapin2.fullName', 'Loi n°2016-1691 — Transparence & Anticorruption'),
    category: 'Gouvernance',
    icon: Scale,
    color: '#7c3aed',
    bgColor: 'bg-violet-50',
    description: t('compliance.multiReg.sapin2.description', "Oblige les grandes entreprises à mettre en place un programme de conformité anticorruption et de trafic d'influence."),
    scope: t('compliance.multiReg.sapin2.scope', "Entreprises >500 salariés et >100M€ CA"),
    deadline: t('compliance.multiReg.sapin2.deadline', "Continu — évalué par l'AFA"),
    authority: t('compliance.multiReg.sapin2.authority', 'Agence Française Anticorruption (AFA)'),
    globalStatus: 'partiel',
    score: 61,
    checks: [
      { label: t('compliance.multiReg.sapin2.check1', 'Code de conduite anticorruption'), status: 'conforme' },
      { label: t('compliance.multiReg.sapin2.check2', "Dispositif d'alerte interne"), status: 'conforme' },
      { label: t('compliance.multiReg.sapin2.check3', 'Cartographie des risques de corruption'), status: 'partiel', note: t('compliance.multiReg.sapin2.note3', 'Mise à jour annuelle requise') },
      { label: t('compliance.multiReg.sapin2.check4', "Procédures d'évaluation des tiers"), status: 'partiel', note: t('compliance.multiReg.sapin2.note4', 'Couverture fournisseurs < 80%') },
      { label: t('compliance.multiReg.sapin2.check5', 'Procédures comptables de contrôle'), status: 'non_conforme' },
      { label: t('compliance.multiReg.sapin2.check6', 'Formation des collaborateurs exposés'), status: 'conforme' },
      { label: t('compliance.multiReg.sapin2.check7', 'Régime disciplinaire'), status: 'conforme' },
      { label: t('compliance.multiReg.sapin2.check8', 'Dispositif de contrôle & évaluation'), status: 'partiel' },
    ],
    actions: [
      t('compliance.multiReg.sapin2.action1', 'Mettre à jour la cartographie des risques'),
      t('compliance.multiReg.sapin2.action2', "Étendre l'évaluation tiers à 100% des fournisseurs critiques"),
      t('compliance.multiReg.sapin2.action3', 'Formaliser les procédures comptables de contrôle'),
    ],
  },
  {
    id: 'devoir_vigilance',
    name: 'Devoir de Vigilance',
    fullName: t('compliance.multiReg.devoirVigilance.fullName', 'Loi n°2017-399 — Devoir de vigilance'),
    category: 'Droits humains & Environnement',
    icon: Users,
    color: '#0891b2',
    bgColor: 'bg-cyan-50',
    description: t('compliance.multiReg.devoirVigilance.description', "Impose aux grandes entreprises un plan de vigilance pour prévenir atteintes aux droits humains et à l'environnement dans leur chaîne de valeur."),
    scope: t('compliance.multiReg.devoirVigilance.scope', 'SA >5 000 salariés en France ou >10 000 dans le monde'),
    deadline: 'Plan de vigilance annuel',
    authority: t('compliance.multiReg.devoirVigilance.authority', 'Tribunaux judiciaires / Parties civiles'),
    globalStatus: 'partiel',
    score: 54,
    checks: [
      { label: t('compliance.multiReg.devoirVigilance.check1', 'Plan de vigilance publié'), status: 'conforme' },
      { label: t('compliance.multiReg.devoirVigilance.check2', 'Cartographie des risques droits humains'), status: 'partiel' },
      { label: t('compliance.multiReg.devoirVigilance.check3', "Procédures d'évaluation filiales & fournisseurs"), status: 'partiel', note: t('compliance.multiReg.devoirVigilance.note3', 'Fournisseurs rang 2 non couverts') },
      { label: t('compliance.multiReg.devoirVigilance.check4', "Actions d'atténuation des risques identifiés"), status: 'partiel' },
      { label: t('compliance.multiReg.devoirVigilance.check5', 'Mécanisme d\'alerte & recueil signalements'), status: 'conforme' },
      { label: t('compliance.multiReg.devoirVigilance.check6', 'Dispositif de suivi & évaluation'), status: 'non_conforme' },
    ],
    actions: [
      t('compliance.multiReg.devoirVigilance.action1', 'Étendre la cartographie aux fournisseurs rang 2 et 3'),
      t('compliance.multiReg.devoirVigilance.action2', 'Mettre en place des KPIs de suivi du plan de vigilance'),
      t('compliance.multiReg.devoirVigilance.action3', 'Renforcer les clauses contractuelles fournisseurs'),
    ],
  },
  {
    id: 'art29',
    name: 'Article 29 LEC',
    fullName: t('compliance.multiReg.art29.fullName', 'Article 29 Loi Énergie-Climat — Reporting climatique'),
    category: 'Finance & Climat',
    icon: TrendingUp,
    color: '#d97706',
    bgColor: 'bg-amber-50',
    description: t('compliance.multiReg.art29.description', 'Oblige les investisseurs institutionnels et sociétés de gestion à intégrer et déclarer les risques climatiques dans leur gestion et reporting.'),
    scope: t('compliance.multiReg.art29.scope', 'Investisseurs institutionnels, sociétés de gestion, assureurs'),
    deadline: 'Rapport annuel',
    authority: t('compliance.multiReg.art29.authority', 'AMF / ACPR'),
    globalStatus: 'na',
    score: 0,
    checks: [
      { label: t('compliance.multiReg.art29.check1', "Politique d'intégration des risques ESG"), status: 'na' },
      { label: t('compliance.multiReg.art29.check2', 'Exposition aux risques physiques climatiques'), status: 'na' },
      { label: t('compliance.multiReg.art29.check3', 'Exposition aux risques de transition'), status: 'na' },
      { label: t('compliance.multiReg.art29.check4', 'Alignement portefeuille avec Accord de Paris'), status: 'na' },
      { label: t('compliance.multiReg.art29.check5', 'Stratégie de vote (engagement actionnarial)'), status: 'na' },
    ],
    actions: [
      t('compliance.multiReg.art29.action1', "Non applicable — réservé aux investisseurs institutionnels et sociétés de gestion d'actifs"),
    ],
  },
  {
    id: 'sfdr',
    name: 'SFDR',
    fullName: t('compliance.multiReg.sfdr.fullName', 'Sustainable Finance Disclosure Regulation (2019/2088)'),
    category: 'Finance durable',
    icon: Banknote,
    color: '#be185d',
    bgColor: 'bg-pink-50',
    description: t('compliance.multiReg.sfdr.description', "Règlement européen imposant aux acteurs des marchés financiers de classer et déclarer leurs produits selon leur durabilité (Art. 6, 8 ou 9)."),
    scope: t('compliance.multiReg.sfdr.scope', "Gestionnaires actifs, conseillers financiers, fonds d'investissement"),
    deadline: t('compliance.multiReg.sfdr.deadline', 'Continu — mis à jour trimestriellement'),
    authority: t('compliance.multiReg.sfdr.authority', 'ESMA / AMF'),
    globalStatus: 'na',
    score: 0,
    checks: [
      { label: t('compliance.multiReg.sfdr.check1', 'Classification produits Art. 6/8/9'), status: 'na' },
      { label: t('compliance.multiReg.sfdr.check2', 'Déclarations précontractuelles'), status: 'na' },
      { label: t('compliance.multiReg.sfdr.check3', 'Rapports périodiques durabilité'), status: 'na' },
      { label: t('compliance.multiReg.sfdr.check4', 'Intégration risques durabilité (PAI)'), status: 'na' },
    ],
    actions: [
      t('compliance.multiReg.sfdr.action1', 'Non applicable — réservé aux acteurs des marchés financiers'),
    ],
  },
  {
    id: 'iso14001',
    name: 'ISO 14001',
    fullName: t('compliance.multiReg.iso14001.fullName', 'Système de Management Environnemental ISO 14001:2015'),
    category: 'Normes ISO',
    icon: Leaf,
    color: '#15803d',
    bgColor: 'bg-green-50',
    description: t('compliance.multiReg.iso14001.description', "Norme internationale pour les systèmes de management environnemental. Démontre l'engagement envers la réduction de l'impact environnemental."),
    scope: t('compliance.multiReg.iso14001.scope', 'Toute organisation souhaitant certifier son SME'),
    deadline: 'Certification initiale + audits annuels',
    authority: t('compliance.multiReg.iso14001.authority', 'Organismes certificateurs accrédités (COFRAC)'),
    globalStatus: 'partiel',
    score: 45,
    checks: [
      { label: t('compliance.multiReg.iso14001.check1', 'Analyse du contexte & parties intéressées'), status: 'conforme' },
      { label: t('compliance.multiReg.iso14001.check2', 'Politique environnementale'), status: 'conforme' },
      { label: t('compliance.multiReg.iso14001.check3', 'Identification aspects/impacts significatifs'), status: 'partiel' },
      { label: t('compliance.multiReg.iso14001.check4', "Objectifs environnementaux & plans d'action"), status: 'partiel' },
      { label: t('compliance.multiReg.iso14001.check5', 'Compétences & sensibilisation'), status: 'non_conforme' },
      { label: t('compliance.multiReg.iso14001.check6', 'Maîtrise opérationnelle'), status: 'non_conforme' },
      { label: t('compliance.multiReg.iso14001.check7', 'Audit interne SME'), status: 'non_conforme' },
      { label: t('compliance.multiReg.iso14001.check8', 'Revue de direction'), status: 'non_conforme' },
    ],
    actions: [
      t('compliance.multiReg.iso14001.action1', 'Désigner un responsable SME'),
      t('compliance.multiReg.iso14001.action2', 'Planifier un audit interne ISO 14001'),
      t('compliance.multiReg.iso14001.action3', 'Mettre en place un programme de formations environnementales'),
    ],
  },
  {
    id: 'iso26000',
    name: 'ISO 26000',
    fullName: t('compliance.multiReg.iso26000.fullName', 'Lignes directrices pour la responsabilité sociétale ISO 26000:2010'),
    category: 'Normes ISO',
    icon: Globe,
    color: '#1d4ed8',
    bgColor: 'bg-blue-50',
    description: t('compliance.multiReg.iso26000.description', 'Norme de référence (non certifiable) pour la responsabilité sociétale des organisations. Couvre 7 questions centrales RSE.'),
    scope: t('compliance.multiReg.iso26000.scope', 'Toute organisation, tous secteurs'),
    deadline: t('compliance.multiReg.iso26000.deadline', 'Référentiel — pas de date limite'),
    authority: t('compliance.multiReg.iso26000.authority', 'ISO (non certifiable)'),
    globalStatus: 'partiel',
    score: 63,
    checks: [
      { label: t('compliance.multiReg.iso26000.check1', "Gouvernance de l'organisation"), status: 'conforme' },
      { label: t('compliance.multiReg.iso26000.check2', "Droits de l'Homme"), status: 'partiel' },
      { label: t('compliance.multiReg.iso26000.check3', 'Relations et conditions de travail'), status: 'conforme' },
      { label: t('compliance.multiReg.iso26000.check4', 'Environnement'), status: 'partiel' },
      { label: t('compliance.multiReg.iso26000.check5', 'Loyauté des pratiques'), status: 'conforme' },
      { label: t('compliance.multiReg.iso26000.check6', 'Questions relatives aux consommateurs'), status: 'partiel', note: t('compliance.multiReg.iso26000.note6', 'Politique réclamations à renforcer') },
      { label: t('compliance.multiReg.iso26000.check7', 'Communautés et développement local'), status: 'non_conforme' },
    ],
    actions: [
      t('compliance.multiReg.iso26000.action1', 'Cartographier les impacts sur les communautés locales'),
      t('compliance.multiReg.iso26000.action2', 'Renforcer la politique de traitement des réclamations'),
      t('compliance.multiReg.iso26000.action3', "Documenter la chaîne d'approvisionnement responsable"),
    ],
  },
  {
    id: 'lksg',
    name: 'LkSG',
    fullName: t('compliance.multiReg.lksg.fullName', "Lieferkettensorgfaltspflichtengesetz (Loi allemande chaîne d'approvisionnement)"),
    category: 'Droits humains & Environnement',
    icon: Landmark,
    color: '#374151',
    bgColor: 'bg-gray-50',
    description: t('compliance.multiReg.lksg.description', "Loi allemande sur le devoir de diligence dans la chaîne d'approvisionnement, applicable aux entreprises exportant vers l'Allemagne."),
    scope: t('compliance.multiReg.lksg.scope', 'Entreprises >3 000 salariés présentes sur le marché allemand'),
    deadline: 'Rapport annuel — depuis 2023',
    authority: t('compliance.multiReg.lksg.authority', 'BAFA (Office fédéral allemand)'),
    globalStatus: 'non_conforme',
    score: 20,
    checks: [
      { label: t('compliance.multiReg.lksg.check1', 'Gestion des risques en matière de droits humains'), status: 'partiel' },
      { label: t('compliance.multiReg.lksg.check2', 'Déclaration de principes'), status: 'conforme' },
      { label: t('compliance.multiReg.lksg.check3', 'Analyse de risques fournisseurs directs'), status: 'non_conforme' },
      { label: t('compliance.multiReg.lksg.check4', 'Mesures préventives'), status: 'non_conforme' },
      { label: t('compliance.multiReg.lksg.check5', 'Mécanisme de réclamation'), status: 'non_conforme' },
      { label: t('compliance.multiReg.lksg.check6', 'Rapport annuel BAFA'), status: 'non_conforme' },
    ],
    actions: [
      t('compliance.multiReg.lksg.action1', 'Évaluer si l\'entreprise est dans le scope LkSG'),
      t('compliance.multiReg.lksg.action2', 'Analyser les fournisseurs directs allemands'),
      t('compliance.multiReg.lksg.action3', 'Mettre en place un mécanisme de réclamation conforme'),
    ],
  },
];

// ─── Category filter ──────────────────────────────────────────────────────────
// category values match regulation.category — used for filtering, not displayed directly
const CATEGORY_KEYS: { value: string; labelKey: string }[] = [
  { value: 'Tous', labelKey: 'compliance.catAll' },
  { value: 'Reporting ESG', labelKey: 'compliance.catEsgReporting' },
  { value: 'Finance durable', labelKey: 'compliance.catSustainableFinance' },
  { value: 'Gouvernance', labelKey: 'compliance.catGovernance' },
  { value: 'Droits humains & Environnement', labelKey: 'compliance.catHumanRights' },
  { value: 'Normes ISO', labelKey: 'compliance.catIso' },
];

// ─── Global stats ─────────────────────────────────────────────────────────────
function computeGlobalStats(regs: Regulation[]) {
  const applicable = regs.filter(r => r.globalStatus !== 'na');
  const conforme = applicable.filter(r => r.globalStatus === 'conforme').length;
  const partiel = applicable.filter(r => r.globalStatus === 'partiel').length;
  const nonConforme = applicable.filter(r => r.globalStatus === 'non_conforme').length;
  const avgScore = applicable.length > 0
    ? Math.round(applicable.reduce((s, r) => s + r.score, 0) / applicable.length)
    : 0;
  return { applicable: applicable.length, conforme, partiel, nonConforme, avgScore };
}

// ─── Regulation card ──────────────────────────────────────────────────────────
function RegulationCard({ reg }: { reg: Regulation }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const Icon = reg.icon;
  const isNA = reg.globalStatus === 'na';
  const statusLabels: Record<Status, string> = {
    conforme: t('compliance.statusCompliant'),
    partiel: t('compliance.statusPartial'),
    non_conforme: t('compliance.statusNonCompliant'),
    na: t('compliance.statusNa'),
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${reg.globalStatus === 'conforme' ? 'border-green-200' : reg.globalStatus === 'partiel' ? 'border-amber-200' : reg.globalStatus === 'non_conforme' ? 'border-red-200' : 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
      {/* Header */}
      <div className={`p-6 ${reg.bgColor}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: reg.color + '20' }}>
              <Icon className="h-6 w-6" style={{ color: reg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900">{reg.name}</h3>
                <span className="text-xs px-2 py-0.5 bg-white/70 text-gray-600 rounded-full border border-gray-200">{reg.category}</span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5 truncate">{reg.fullName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge status={reg.globalStatus} />
            {!isNA && <ScoreRing score={reg.score} color={reg.color} />}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{reg.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 uppercase tracking-wider font-semibold">{t('compliance.metaScope')}</span>
            <span className="text-gray-700">{reg.scope}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 uppercase tracking-wider font-semibold">{t('compliance.metaDeadline')}</span>
            <span className="text-gray-700">{reg.deadline}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 uppercase tracking-wider font-semibold">{t('compliance.metaAuthority')}</span>
            <span className="text-gray-700">{reg.authority}</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mt-2"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {expanded ? t('compliance.hideDetail') : t('compliance.showCompliance', { count: reg.checks.length })}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Disclaimer points de contrôle */}
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs" style={{ background: '#fefce8', borderColor: '#fde047' }}>
              <span className="text-sm mt-0.5 flex-shrink-0">⚠️</span>
              <span className="text-yellow-800 leading-relaxed">
                <strong>{t('compliance.multiReg.checklistDisclaimerTitle', 'Points de contrôle indicatifs')}</strong> — {t('compliance.multiReg.checklistDisclaimerBody', 'Ces statuts sont des points de départ basés sur les pratiques courantes. Vérifiez et mettez à jour chaque élément selon votre situation réelle avec votre équipe juridique / commissaires aux comptes.')}
              </span>
            </div>
            {/* Checklist */}
            <div className="space-y-2">
              {reg.checks.map((check, i) => {
                const cfg = statusConfig[check.status];
                const Icon2 = cfg.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg}`}>
                    <Icon2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${cfg.color}`}>{check.label}</span>
                      {check.note && (
                        <p className="text-xs text-gray-500 mt-0.5">{check.note}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${cfg.color}`}>{statusLabels[check.status]}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {reg.actions.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  {t('compliance.recommendedActions')}
                </h4>
                <ul className="space-y-1.5">
                  {reg.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live score computation from real ESG data ────────────────────────────────
function computeLiveRegulations(base: Regulation[], esgData: any): Regulation[] {
  if (!esgData) return base;
  // /live-summary returns flat fields: esg_score, environmental_score, social_score, governance_score
  const env   = Math.round(esgData.environmental_score ?? 0);
  const soc   = Math.round(esgData.social_score        ?? 0);
  const gov   = Math.round(esgData.governance_score    ?? 0);
  const total = Math.round(esgData.esg_score           ?? 0);

  const scoreMap: Record<string, number> = {
    csrd:             Math.min(100, Math.round(total * 0.90)),
    taxonomie:        Math.min(100, Math.round(env   * 0.80)),
    dpef:             Math.min(100, Math.round((env + soc) / 2 * 0.90)),
    sapin2:           Math.min(100, Math.round(gov   * 0.75)),
    devoir_vigilance: Math.min(100, Math.round((soc + gov) / 2 * 0.70)),
    art29:            0,
    sfdr:             0,
    iso14001:         Math.min(100, Math.round(env   * 0.60)),
    iso26000:         Math.min(100, Math.round(total * 0.75)),
    lksg:             Math.min(100, Math.round((soc + gov) / 2 * 0.50)),
  };

  return base.map(reg => {
    if (reg.globalStatus === 'na') return reg;
    const score        = scoreMap[reg.id] ?? reg.score;
    const globalStatus: Status = score >= 75 ? 'conforme' : score >= 40 ? 'partiel' : 'non_conforme';
    return { ...reg, score, globalStatus };
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MultiRegulatoryCompliance() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const regulations = getRegulations(t);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0].value);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [esgData, setEsgData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchESGData = useCallback(async () => {
    try {
      // Use accurate scores endpoint
      let data: any = null;
      try {
        const r1 = await api.get('/scores/latest');
        const s = r1.data;
        data = {
          esg_score: s.overall_score ?? 0,
          environmental_score: s.environmental_score ?? 0,
          social_score: s.social_score ?? 0,
          governance_score: s.governance_score ?? 0,
          has_real_data: (s.overall_score ?? 0) > 0,
        };
      } catch {
        const r2 = await api.get('/esg-scoring/dashboard').catch(() => ({ data: {} }));
        const st = r2.data?.statistics ?? {};
        data = {
          esg_score: st.average_score ?? 0,
          environmental_score: st.average_environmental ?? 0,
          social_score: st.average_social ?? 0,
          governance_score: st.average_governance ?? 0,
          has_real_data: (st.average_score ?? 0) > 0,
        };
      }
      setEsgData(data);
    } catch {
      setEsgData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchESGData(); }, [fetchESGData]);

  const liveRegulations = computeLiveRegulations(regulations, esgData);
  const stats = computeGlobalStats(liveRegulations);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchESGData();
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  }, [fetchESGData]);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const STATUS_LABELS: Record<Status, string> = {
    conforme: 'Conforme', partiel: 'Partiel', non_conforme: 'Non conforme', na: 'N/A',
  };
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const fileDate = new Date().toISOString().slice(0, 10);

  const handleExportCSV = useCallback(() => {
    setExportMenuOpen(false);
    const lines: string[] = [
      `"RAPPORT CONFORMITÉ MULTI-RÉGLEMENTAIRE"`,
      `"Généré le : ${dateStr}"`,
      `"Score global : ${stats.avgScore}%"`,
      `"Conformes : ${stats.conforme} | Partiels : ${stats.partiel} | Non conformes : ${stats.nonConforme} | N/A : ${liveRegulations.length - stats.applicable}"`,
      `""`,
      `"Réglementation","Catégorie","Statut Global","Score","Périmètre","Échéance","Autorité","Points de contrôle","Actions requises"`,
    ];
    for (const reg of liveRegulations) {
      lines.push(`"${reg.name}","${reg.category}","${STATUS_LABELS[reg.globalStatus]}","${reg.score}%","${reg.scope}","${reg.deadline}","${reg.authority}","${reg.checks.map(c => `${c.label}: ${STATUS_LABELS[c.status]}`).join(' | ')}","${reg.actions.join(' | ')}"`);
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `conformite_${fileDate}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [stats, liveRegulations, dateStr, fileDate]);

  const handleExportPDF = useCallback(async () => {
    setExportMenuOpen(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Header
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, 297, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Rapport Conformité Multi-Réglementaire', 14, 11);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Généré le ${dateStr}  ·  Score global : ${stats.avgScore}%  ·  ${stats.conforme} conformes · ${stats.partiel} partiels · ${stats.nonConforme} non conformes`, 14, 20);
    // KPI boxes
    doc.setTextColor(0, 0, 0);
    const kpis = [
      { label: 'Score global', val: `${stats.avgScore}%`, color: [124, 58, 237] as [number,number,number] },
      { label: 'Conformes', val: String(stats.conforme), color: [22, 163, 74] as [number,number,number] },
      { label: 'Partiels', val: String(stats.partiel), color: [217, 119, 6] as [number,number,number] },
      { label: 'Non conformes', val: String(stats.nonConforme), color: [220, 38, 38] as [number,number,number] },
    ];
    kpis.forEach((k, i) => {
      const x = 14 + i * 68;
      doc.setFillColor(...k.color); doc.roundedRect(x, 28, 64, 16, 2, 2, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont('helvetica','bold');
      doc.text(k.val, x + 32, 37, { align: 'center' });
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text(k.label, x + 32, 42, { align: 'center' });
    });
    // Table
    autoTable(doc, {
      startY: 50,
      head: [['Réglementation', 'Catégorie', 'Statut', 'Score', 'Périmètre', 'Échéance', 'Autorité']],
      body: liveRegulations.map(r => [r.name, r.category, STATUS_LABELS[r.globalStatus], `${r.score}%`, r.scope, r.deadline, r.authority]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 245, 255] },
      columnStyles: { 0: { fontStyle: 'bold' }, 3: { halign: 'center' } },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.raw as string;
          const color = val === 'Conforme' ? [22,163,74] : val === 'Partiel' ? [217,119,6] : val === 'N/A' ? [107,114,128] : [220,38,38];
          doc.setFillColor(...(color as [number,number,number]));
          doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 1, 1, 'F');
          doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
          doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 0.5, { align: 'center' });
        }
      },
    });
    // Checks detail pages
    liveRegulations.filter(r => r.globalStatus !== 'na').forEach(reg => {
      (doc as any).addPage();
      doc.setFillColor(109, 40, 217); doc.rect(0, 0, 297, 14, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(12); doc.setFont('helvetica','bold');
      doc.text(`${reg.name} — ${reg.fullName}`, 14, 9);
      autoTable(doc, {
        startY: 18,
        head: [['Point de contrôle', 'Statut', 'Note']],
        body: reg.checks.map(c => [c.label, STATUS_LABELS[c.status], c.note ?? '']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [109, 40, 217] },
      });
    });
    doc.save(`conformite_multi_reglementaire_${fileDate}.pdf`);
  }, [stats, liveRegulations, dateStr, fileDate]);

  const handleExportExcel = useCallback(async () => {
    setExportMenuOpen(false);
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    // Sheet 1 — Synthèse
    const synth = [
      ['RAPPORT CONFORMITÉ MULTI-RÉGLEMENTAIRE'],
      [`Généré le : ${dateStr}`],
      [`Score global : ${stats.avgScore}%`],
      [`Conformes : ${stats.conforme}`, `Partiels : ${stats.partiel}`, `Non conformes : ${stats.nonConforme}`, `N/A : ${liveRegulations.length - stats.applicable}`],
      [],
      ['Réglementation', 'Catégorie', 'Statut Global', 'Score (%)', 'Périmètre', 'Échéance', 'Autorité'],
      ...liveRegulations.map(r => [r.name, r.category, STATUS_LABELS[r.globalStatus], r.score, r.scope, r.deadline, r.authority]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(synth);
    ws1['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 45 }, { wch: 28 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Synthèse');
    // Sheet 2 — Points de contrôle
    const checks = [
      ['Réglementation', 'Point de contrôle', 'Statut', 'Note'],
      ...liveRegulations.flatMap(r => r.checks.map(c => [r.name, c.label, STATUS_LABELS[c.status], c.note ?? ''])),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(checks);
    ws2['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 14 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Points de contrôle');
    // Sheet 3 — Actions
    const actions = [
      ['Réglementation', 'Catégorie', 'Statut', 'Action requise'],
      ...liveRegulations.flatMap(r => r.actions.map(a => [r.name, r.category, STATUS_LABELS[r.globalStatus], a])),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(actions);
    ws3['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Actions');
    XLSX.writeFile(wb, `conformite_multi_reglementaire_${fileDate}.xlsx`);
  }, [stats, liveRegulations, dateStr, fileDate]);

  const handleExportWord = useCallback(async () => {
    setExportMenuOpen(false);
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } = await import('docx');
    const statusColor: Record<Status, string> = { conforme: '16a34a', partiel: 'd97706', non_conforme: 'dc2626', na: '6b7280' };
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: 'Rapport Conformité Multi-Réglementaire', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: `Généré le : ${dateStr}`, italics: true, color: '6b7280' })] }),
          new Paragraph({ children: [new TextRun({ text: `Score global : ${stats.avgScore}%  ·  Conformes : ${stats.conforme}  ·  Partiels : ${stats.partiel}  ·  Non conformes : ${stats.nonConforme}`, bold: true })] }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: ['Réglementation','Catégorie','Statut','Score','Périmètre','Échéance'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'ffffff' })], alignment: AlignmentType.CENTER })], shading: { fill: '6d28d9' } })
                ),
              }),
              ...liveRegulations.map(r => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.name, bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: r.category })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: STATUS_LABELS[r.globalStatus], color: statusColor[r.globalStatus], bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${r.score}%`, bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: r.scope })] }),
                  new TableCell({ children: [new Paragraph({ text: r.deadline })] }),
                ],
              })),
            ],
          }),
          new Paragraph({ text: '' }),
          ...liveRegulations.filter(r => r.globalStatus !== 'na').flatMap(r => [
            new Paragraph({ text: `${r.name} — Points de contrôle`, heading: HeadingLevel.HEADING_2 }),
            ...r.checks.map(c => new Paragraph({ children: [new TextRun({ text: `${STATUS_LABELS[c.status].toUpperCase()}  `, color: statusColor[c.status], bold: true }), new TextRun({ text: c.label + (c.note ? ` (${c.note})` : '') })] })),
            new Paragraph({ text: '' }),
          ]),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `conformite_multi_reglementaire_${fileDate}.docx` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [stats, liveRegulations, dateStr, fileDate]);

  const filtered = liveRegulations.filter(r => {
    const matchCat = activeCategory === CATEGORY_KEYS[0].value || r.category === activeCategory;
    const matchSearch = search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.fullName.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div
      className="rounded-2xl p-6 max-w-6xl mx-auto space-y-6 shadow-xl"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {loadingData ? (
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t('compliance.multiReg.loadingScores', 'Chargement des scores de conformité depuis vos données ESG réelles…')}
        </div>
      ) : esgData ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <span className="font-bold">{t('compliance.multiReg.scoresFromRealData', 'Scores calculés depuis vos données réelles')}</span>
            {' — '}ESG : <span className="font-bold">{Math.round(esgData.esg_score ?? 0)}/100</span>
            {' · '}E : <span className="font-semibold">{Math.round(esgData.environmental_score ?? 0)}</span>
            {' · '}S : <span className="font-semibold">{Math.round(esgData.social_score ?? 0)}</span>
            {' · '}G : <span className="font-semibold">{Math.round(esgData.governance_score ?? 0)}</span>
            {esgData.total_entries > 0 && (
              <span className="text-green-600"> · {esgData.total_entries} {t('compliance.multiReg.dataEntries', 'données')}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          {t('compliance.multiReg.noEsgData', 'Données ESG non disponibles — les scores affichés sont indicatifs. Importez vos données pour obtenir une analyse personnalisée.')}
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                {t('compliance.multiReg.heroBadge', 'Conformité Multi-Réglementaire')}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Shield className="h-8 w-8" />
              {t('compliance.title')}
            </h1>
            <p className="text-violet-100">{t('compliance.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('compliance.multiReg.refreshing', 'Actualisation...') : t('compliance.refresh')}
            </button>
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-violet-700 rounded-xl text-sm font-bold hover:bg-violet-50 transition-all shadow-md active:scale-95"
              >
                <Download className="h-4 w-4" />
                {t('compliance.multiReg.export', 'Exporter')}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {[
                    { label: t('compliance.multiReg.exportPdf', '📄 PDF'), action: handleExportPDF },
                    { label: t('compliance.multiReg.exportExcel', '📊 Excel (.xlsx)'), action: handleExportExcel },
                    { label: t('compliance.multiReg.exportWord', '📝 Word (.docx)'), action: handleExportWord },
                    { label: t('compliance.multiReg.exportCsv', '🗂 CSV'), action: handleExportCSV },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                    >{item.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">

        {/* ── Global KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: t('compliance.kpiGlobalScore'), value: `${stats.avgScore}%`, sub: t('compliance.kpiGlobalScoreSub'), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
            { label: t('compliance.kpiCompliant'), value: stats.conforme, sub: t('compliance.kpiCompliantSub', { count: stats.applicable }), color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            { label: t('compliance.kpiPartial'), value: stats.partiel, sub: t('compliance.kpiPartialSub'), color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: t('compliance.kpiNonCompliant'), value: stats.nonConforme, sub: t('compliance.kpiNonCompliantSub'), color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
            { label: t('compliance.kpiNa'), value: liveRegulations.length - stats.applicable, sub: t('compliance.kpiNaSub'), color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl border-2 ${kpi.bg} p-5`}>
              <div className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{kpi.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Alert banner ── */}
        {stats.nonConforme > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-red-700">
                {stats.nonConforme} {t('compliance.kpiNonCompliant')} —{' '}
              </span>
              <span className="text-red-600 text-sm">{t('compliance.alertBanner')}</span>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat.value ? 'bg-violet-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'}`}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={t('compliance.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ml-auto px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64"
          />
        </div>

        {/* ── Regulation cards ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map(reg => (
            <RegulationCard key={reg.id} reg={reg} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('compliance.noFrameworkFound')}</p>
          </div>
        )}

        {/* ── Roadmap ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            {t('compliance.upcomingDeadlinesTitle')}
          </h2>
          <div className="space-y-3">
            {[
              { date: 'T2 2025', label: t('compliance.multiReg.roadmap1', 'CSRD — Rapport de durabilité exercice 2024'), status: 'non_conforme' as Status, urgency: 'high' },
              { date: 'T2 2025', label: t('compliance.multiReg.roadmap2', 'DPEF — Intégration rapport de gestion annuel'), status: 'conforme' as Status, urgency: 'low' },
              { date: 'T3 2025', label: t('compliance.multiReg.roadmap3', 'Sapin II — Mise à jour cartographie risques corruption'), status: 'partiel' as Status, urgency: 'medium' },
              { date: 'T3 2025', label: t('compliance.multiReg.roadmap4', 'Devoir de vigilance — Plan de vigilance annuel'), status: 'partiel' as Status, urgency: 'medium' },
              { date: 'T4 2025', label: t('compliance.multiReg.roadmap5', 'ISO 14001 — Audit interne système management environnemental'), status: 'non_conforme' as Status, urgency: 'high' },
              { date: 'T4 2025', label: t('compliance.multiReg.roadmap6', 'LkSG — Rapport annuel BAFA (marché allemand)'), status: 'non_conforme' as Status, urgency: 'high' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${item.urgency === 'high' ? 'bg-red-50 border-red-200' : item.urgency === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className={`text-xs font-bold px-2 py-1 rounded-lg ${item.urgency === 'high' ? 'bg-red-200 text-red-800' : item.urgency === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                  {item.date}
                </div>
                <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Compliance Tools ── */}
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <div className="px-5 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #0c4a6e, #0284c7)' }}>
            <Zap className="h-5 w-5 text-sky-300" />
            <h2 className="text-base font-bold text-white">{t('compliance.multiReg.climateToolsTitle', 'Outils de reporting climatique')}</h2>
          </div>
          <div className="bg-white grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              {
                icon: Shield,
                title: t('compliance.multiReg.tool1Title', 'TCFD / ISSB / IFRS S2 Builder'),
                desc: t('compliance.multiReg.tool1Desc', 'Rédigez vos divulgations climatiques alignées TCFD, ISSB S1/S2 et IFRS S2 en 4 piliers.'),
                href: '/app/tcfd',
                color: '#0284c7',
                soft: '#f0f9ff',
                badge: t('compliance.multiReg.badgeNew', 'Nouveau'),
              },
              {
                icon: BarChart3,
                title: t('compliance.multiReg.tool2Title', 'Analyse ESRS / DMA'),
                desc: t('compliance.multiReg.tool2Desc', 'Évaluez votre couverture ESRS E1-E5, S1-S4, G1 et identifiez les lacunes de reporting.'),
                href: '/app/esrs-gap',
                color: '#7c3aed',
                soft: '#faf5ff',
                badge: t('compliance.multiReg.badgePro', 'Pro'),
              },
              {
                icon: Leaf,
                title: t('compliance.multiReg.tool3Title', 'Plan Décarbonation'),
                desc: t('compliance.multiReg.tool3Desc', 'Scénarios IPCC AR6, compensation carbone, trajectoire SBTi 1,5°C.'),
                href: '/app/decarbonation',
                color: '#059669',
                soft: '#ecfdf5',
                badge: null,
              },
            ].map(tool => {
              const Icon = tool.icon;
              return (
                <button key={tool.href}
                  onClick={() => navigate(tool.href)}
                  className="flex items-start gap-4 p-5 hover:bg-gray-50 transition-colors text-left w-full group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: tool.soft }}>
                    <Icon className="h-5 w-5" style={{ color: tool.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">{tool.title}</span>
                      {tool.badge && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: tool.soft, color: tool.color }}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>
            {t('compliance.legalDisclaimer')}{' '}
            <a href="https://www.legifrance.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
              Légifrance <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
