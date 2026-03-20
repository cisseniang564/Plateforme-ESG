import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, ChevronDown,
  ChevronRight, FileText, Download, ExternalLink, Info,
  Building2, Globe, Scale, Landmark, Banknote, Leaf,
  BarChart3, Users, TrendingUp, RefreshCw,
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
const regulations: Regulation[] = [
  {
    id: 'csrd',
    name: 'CSRD',
    fullName: 'Corporate Sustainability Reporting Directive',
    category: 'Reporting ESG',
    icon: FileText,
    color: '#16a34a',
    bgColor: 'bg-green-50',
    description: 'Directive européenne imposant un reporting de durabilité standardisé selon les ESRS pour les grandes entreprises.',
    scope: 'Entreprises >250 salariés ou >40M€ CA',
    deadline: 'Exercice 2024 (rapport 2025)',
    authority: 'Commission Européenne / EFRAG',
    globalStatus: 'partiel',
    score: 72,
    checks: [
      { label: 'Collecte des données ESRS', status: 'conforme' },
      { label: 'Double matérialité documentée', status: 'conforme' },
      { label: 'Indicateurs E1 (Changement climatique)', status: 'conforme' },
      { label: 'Indicateurs S1 (Effectifs propres)', status: 'partiel', note: 'Données partielles Q3' },
      { label: 'Indicateurs G1 (Gouvernance)', status: 'partiel', note: 'Politique anticorruption à formaliser' },
      { label: 'Audit / assurance limitée', status: 'non_conforme', note: 'Commissaire aux comptes non mandaté' },
      { label: 'Publication dans rapport de gestion', status: 'non_conforme' },
    ],
    actions: ['Mandater un commissaire aux comptes pour l\'assurance limitée', 'Compléter indicateurs S1-S4', 'Intégrer au rapport de gestion annuel'],
  },
  {
    id: 'taxonomie',
    name: 'Taxonomie UE',
    fullName: 'Règlement UE 2020/852 — Taxonomie verte',
    category: 'Finance durable',
    icon: Leaf,
    color: '#059669',
    bgColor: 'bg-emerald-50',
    description: 'Classification des activités économiques durables selon 6 objectifs environnementaux. Exigée pour les rapports NFRD/CSRD.',
    scope: 'Grandes entreprises cotées + secteur financier',
    deadline: 'Annuel — exercice en cours',
    authority: 'Commission Européenne',
    globalStatus: 'partiel',
    score: 58,
    checks: [
      { label: 'Éligibilité des activités identifiée', status: 'conforme' },
      { label: 'Critères techniques d\'examen (CTE)', status: 'partiel' },
      { label: 'Principe DNSH (pas de préjudice significatif)', status: 'partiel', note: 'Objectifs eau et biodiversité à compléter' },
      { label: 'Garanties minimales sociales', status: 'conforme' },
      { label: 'Calcul % CA aligné', status: 'non_conforme' },
      { label: 'Calcul % CapEx aligné', status: 'non_conforme' },
      { label: 'Calcul % OpEx aligné', status: 'non_conforme' },
    ],
    actions: ['Calculer les ratios CA/CapEx/OpEx alignés', 'Documenter les CTE pour chaque activité éligible', 'Compléter l\'analyse DNSH eau et biodiversité'],
  },
  {
    id: 'dpef',
    name: 'DPEF',
    fullName: 'Déclaration de Performance Extra-Financière',
    category: 'Reporting ESG',
    icon: BarChart3,
    color: '#2563eb',
    bgColor: 'bg-blue-50',
    description: 'Rapport annuel obligatoire sur les enjeux sociaux, environnementaux et de gouvernance. Remplacée progressivement par la CSRD.',
    scope: 'SA/SCA cotées >500 salariés, SAS >500 salariés et >100M€ CA',
    deadline: 'Rapport de gestion annuel',
    authority: 'AMF / Commissaires aux comptes',
    globalStatus: 'conforme',
    score: 85,
    checks: [
      { label: 'Informations sociales (effectifs, égalité, santé)', status: 'conforme' },
      { label: 'Informations environnementales (GHG, eau, déchets)', status: 'conforme' },
      { label: 'Informations sociétales (sous-traitance, droits humains)', status: 'partiel' },
      { label: 'Modèle d\'affaires et risques extra-financiers', status: 'conforme' },
      { label: 'Vérification organisme tiers indépendant (OTI)', status: 'conforme' },
      { label: 'Publication dans rapport de gestion', status: 'conforme' },
    ],
    actions: ['Renforcer le reporting sur la sous-traitance et les droits humains (Pilier 3 DPEF)'],
  },
  {
    id: 'sapin2',
    name: 'Loi Sapin II',
    fullName: 'Loi n°2016-1691 — Transparence & Anticorruption',
    category: 'Gouvernance',
    icon: Scale,
    color: '#7c3aed',
    bgColor: 'bg-violet-50',
    description: 'Oblige les grandes entreprises à mettre en place un programme de conformité anticorruption et de trafic d\'influence.',
    scope: 'Entreprises >500 salariés et >100M€ CA',
    deadline: 'Continu — évalué par l\'AFA',
    authority: 'Agence Française Anticorruption (AFA)',
    globalStatus: 'partiel',
    score: 61,
    checks: [
      { label: 'Code de conduite anticorruption', status: 'conforme' },
      { label: 'Dispositif d\'alerte interne', status: 'conforme' },
      { label: 'Cartographie des risques de corruption', status: 'partiel', note: 'Mise à jour annuelle requise' },
      { label: 'Procédures d\'évaluation des tiers', status: 'partiel', note: 'Couverture fournisseurs < 80%' },
      { label: 'Procédures comptables de contrôle', status: 'non_conforme' },
      { label: 'Formation des collaborateurs exposés', status: 'conforme' },
      { label: 'Régime disciplinaire', status: 'conforme' },
      { label: 'Dispositif de contrôle & évaluation', status: 'partiel' },
    ],
    actions: ['Mettre à jour la cartographie des risques', 'Étendre l\'évaluation tiers à 100% des fournisseurs critiques', 'Formaliser les procédures comptables de contrôle'],
  },
  {
    id: 'devoir_vigilance',
    name: 'Devoir de Vigilance',
    fullName: 'Loi n°2017-399 — Devoir de vigilance',
    category: 'Droits humains & Environnement',
    icon: Users,
    color: '#0891b2',
    bgColor: 'bg-cyan-50',
    description: 'Impose aux grandes entreprises un plan de vigilance pour prévenir atteintes aux droits humains et à l\'environnement dans leur chaîne de valeur.',
    scope: 'SA >5 000 salariés en France ou >10 000 dans le monde',
    deadline: 'Plan de vigilance annuel',
    authority: 'Tribunaux judiciaires / Parties civiles',
    globalStatus: 'partiel',
    score: 54,
    checks: [
      { label: 'Plan de vigilance publié', status: 'conforme' },
      { label: 'Cartographie des risques droits humains', status: 'partiel' },
      { label: 'Procédures d\'évaluation filiales & fournisseurs', status: 'partiel', note: 'Fournisseurs rang 2 non couverts' },
      { label: 'Actions d\'atténuation des risques identifiés', status: 'partiel' },
      { label: 'Mécanisme d\'alerte & recueil signalements', status: 'conforme' },
      { label: 'Dispositif de suivi & évaluation', status: 'non_conforme' },
    ],
    actions: ['Étendre la cartographie aux fournisseurs rang 2 et 3', 'Mettre en place des KPIs de suivi du plan de vigilance', 'Renforcer les clauses contractuelles fournisseurs'],
  },
  {
    id: 'art29',
    name: 'Article 29 LEC',
    fullName: 'Article 29 Loi Énergie-Climat — Reporting climatique',
    category: 'Finance & Climat',
    icon: TrendingUp,
    color: '#d97706',
    bgColor: 'bg-amber-50',
    description: 'Oblige les investisseurs institutionnels et sociétés de gestion à intégrer et déclarer les risques climatiques dans leur gestion et reporting.',
    scope: 'Investisseurs institutionnels, sociétés de gestion, assureurs',
    deadline: 'Rapport annuel',
    authority: 'AMF / ACPR',
    globalStatus: 'na',
    score: 0,
    checks: [
      { label: 'Politique d\'intégration des risques ESG', status: 'na' },
      { label: 'Exposition aux risques physiques climatiques', status: 'na' },
      { label: 'Exposition aux risques de transition', status: 'na' },
      { label: 'Alignement portefeuille avec Accord de Paris', status: 'na' },
      { label: 'Stratégie de vote (engagement actionnarial)', status: 'na' },
    ],
    actions: ['Non applicable — réservé aux investisseurs institutionnels et sociétés de gestion d\'actifs'],
  },
  {
    id: 'sfdr',
    name: 'SFDR',
    fullName: 'Sustainable Finance Disclosure Regulation (2019/2088)',
    category: 'Finance durable',
    icon: Banknote,
    color: '#be185d',
    bgColor: 'bg-pink-50',
    description: 'Règlement européen imposant aux acteurs des marchés financiers de classer et déclarer leurs produits selon leur durabilité (Art. 6, 8 ou 9).',
    scope: 'Gestionnaires actifs, conseillers financiers, fonds d\'investissement',
    deadline: 'Continu — mis à jour trimestriellement',
    authority: 'ESMA / AMF',
    globalStatus: 'na',
    score: 0,
    checks: [
      { label: 'Classification produits Art. 6/8/9', status: 'na' },
      { label: 'Déclarations précontractuelles', status: 'na' },
      { label: 'Rapports périodiques durabilité', status: 'na' },
      { label: 'Intégration risques durabilité (PAI)', status: 'na' },
    ],
    actions: ['Non applicable — réservé aux acteurs des marchés financiers'],
  },
  {
    id: 'iso14001',
    name: 'ISO 14001',
    fullName: 'Système de Management Environnemental ISO 14001:2015',
    category: 'Normes ISO',
    icon: Leaf,
    color: '#15803d',
    bgColor: 'bg-green-50',
    description: 'Norme internationale pour les systèmes de management environnemental. Démontre l\'engagement envers la réduction de l\'impact environnemental.',
    scope: 'Toute organisation souhaitant certifier son SME',
    deadline: 'Certification initiale + audits annuels',
    authority: 'Organismes certificateurs accrédités (COFRAC)',
    globalStatus: 'partiel',
    score: 45,
    checks: [
      { label: 'Analyse du contexte & parties intéressées', status: 'conforme' },
      { label: 'Politique environnementale', status: 'conforme' },
      { label: 'Identification aspects/impacts significatifs', status: 'partiel' },
      { label: 'Objectifs environnementaux & plans d\'action', status: 'partiel' },
      { label: 'Compétences & sensibilisation', status: 'non_conforme' },
      { label: 'Maîtrise opérationnelle', status: 'non_conforme' },
      { label: 'Audit interne SME', status: 'non_conforme' },
      { label: 'Revue de direction', status: 'non_conforme' },
    ],
    actions: ['Désigner un responsable SME', 'Planifier un audit interne ISO 14001', 'Mettre en place un programme de formations environnementales'],
  },
  {
    id: 'iso26000',
    name: 'ISO 26000',
    fullName: 'Lignes directrices pour la responsabilité sociétale ISO 26000:2010',
    category: 'Normes ISO',
    icon: Globe,
    color: '#1d4ed8',
    bgColor: 'bg-blue-50',
    description: 'Norme de référence (non certifiable) pour la responsabilité sociétale des organisations. Couvre 7 questions centrales RSE.',
    scope: 'Toute organisation, tous secteurs',
    deadline: 'Référentiel — pas de date limite',
    authority: 'ISO (non certifiable)',
    globalStatus: 'partiel',
    score: 63,
    checks: [
      { label: 'Gouvernance de l\'organisation', status: 'conforme' },
      { label: 'Droits de l\'Homme', status: 'partiel' },
      { label: 'Relations et conditions de travail', status: 'conforme' },
      { label: 'Environnement', status: 'partiel' },
      { label: 'Loyauté des pratiques', status: 'conforme' },
      { label: 'Questions relatives aux consommateurs', status: 'partiel', note: 'Politique réclamations à renforcer' },
      { label: 'Communautés et développement local', status: 'non_conforme' },
    ],
    actions: ['Cartographier les impacts sur les communautés locales', 'Renforcer la politique de traitement des réclamations', 'Documenter la chaîne d\'approvisionnement responsable'],
  },
  {
    id: 'lksg',
    name: 'LkSG',
    fullName: 'Lieferkettensorgfaltspflichtengesetz (Loi allemande chaîne d\'approvisionnement)',
    category: 'Droits humains & Environnement',
    icon: Landmark,
    color: '#374151',
    bgColor: 'bg-gray-50',
    description: 'Loi allemande sur le devoir de diligence dans la chaîne d\'approvisionnement, applicable aux entreprises exportant vers l\'Allemagne.',
    scope: 'Entreprises >3 000 salariés présentes sur le marché allemand',
    deadline: 'Rapport annuel — depuis 2023',
    authority: 'BAFA (Office fédéral allemand)',
    globalStatus: 'non_conforme',
    score: 20,
    checks: [
      { label: 'Gestion des risques en matière de droits humains', status: 'partiel' },
      { label: 'Déclaration de principes', status: 'conforme' },
      { label: 'Analyse de risques fournisseurs directs', status: 'non_conforme' },
      { label: 'Mesures préventives', status: 'non_conforme' },
      { label: 'Mécanisme de réclamation', status: 'non_conforme' },
      { label: 'Rapport annuel BAFA', status: 'non_conforme' },
    ],
    actions: ['Évaluer si l\'entreprise est dans le scope LkSG', 'Analyser les fournisseurs directs allemands', 'Mettre en place un mécanisme de réclamation conforme'],
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MultiRegulatoryCompliance() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0].value);
  const [search, setSearch] = useState('');

  const stats = computeGlobalStats(regulations);

  const filtered = regulations.filter(r => {
    const matchCat = activeCategory === CATEGORY_KEYS[0].value || r.category === activeCategory;
    const matchSearch = search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.fullName.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-violet-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{t('compliance.title')}</h1>
              </div>
              <p className="text-gray-500 ml-13 text-sm">
                {t('compliance.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
                <RefreshCw className="h-4 w-4" />
                {t('compliance.refresh')}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
                <Download className="h-4 w-4" />
                {t('compliance.exportPdf')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Global KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: t('compliance.kpiGlobalScore'), value: `${stats.avgScore}%`, sub: t('compliance.kpiGlobalScoreSub'), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
            { label: t('compliance.kpiCompliant'), value: stats.conforme, sub: t('compliance.kpiCompliantSub', { count: stats.applicable }), color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            { label: t('compliance.kpiPartial'), value: stats.partiel, sub: t('compliance.kpiPartialSub'), color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: t('compliance.kpiNonCompliant'), value: stats.nonConforme, sub: t('compliance.kpiNonCompliantSub'), color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
            { label: t('compliance.kpiNa'), value: regulations.length - stats.applicable, sub: t('compliance.kpiNaSub'), color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
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
              { date: 'T2 2025', label: 'CSRD — Rapport de durabilité exercice 2024', status: 'non_conforme' as Status, urgency: 'high' },
              { date: 'T2 2025', label: 'DPEF — Intégration rapport de gestion annuel', status: 'conforme' as Status, urgency: 'low' },
              { date: 'T3 2025', label: 'Sapin II — Mise à jour cartographie risques corruption', status: 'partiel' as Status, urgency: 'medium' },
              { date: 'T3 2025', label: 'Devoir de vigilance — Plan de vigilance annuel', status: 'partiel' as Status, urgency: 'medium' },
              { date: 'T4 2025', label: 'ISO 14001 — Audit interne système management environnemental', status: 'non_conforme' as Status, urgency: 'high' },
              { date: 'T4 2025', label: 'LkSG — Rapport annuel BAFA (marché allemand)', status: 'non_conforme' as Status, urgency: 'high' },
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
