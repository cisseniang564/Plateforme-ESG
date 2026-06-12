import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Award, ChevronDown, ChevronUp, Download, Shield, Users,
  Globe, Leaf, Heart,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import toast from 'react-hot-toast';

const LS_KEY = 'bcorp_assessment';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QuestionOption {
  label: string;
  value: number;
}

interface Question {
  id: string;
  label: string;
  options: QuestionOption[];
}

interface Section {
  id: string;
  title: string;
  maxPts: number;
  theme: {
    bg: string;
    border: string;
    badge: string;
    badgeText: string;
    icon: React.ElementType;
    iconColor: string;
    headerBg: string;
  };
  questions: Question[];
}

type Answers = Record<string, number>;

// ─── Data ──────────────────────────────────────────────────────────────────────

const getSections = (t: TFunction): Section[] => [
  {
    id: 'gouvernance',
    title: t('compliance.bcorp.sections.gouvernance.title', 'Gouvernance'),
    maxPts: 25,
    theme: {
      bg: 'bg-violet-950/40',
      border: 'border-violet-700/40',
      badge: 'bg-violet-900/60',
      badgeText: 'text-violet-300',
      icon: Shield,
      iconColor: 'text-violet-400',
      headerBg: 'bg-violet-900/30',
    },
    questions: [
      {
        id: 'gov_ethique',
        label: t('compliance.bcorp.sections.gouvernance.questions.gov_ethique', "Code d'éthique public"),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.enCours', 'En cours'), value: 1 },
          { label: t('compliance.bcorp.sections.gouvernance.options.ethique_interne', 'Oui interne'), value: 2 },
          { label: t('compliance.bcorp.sections.gouvernance.options.ethique_publie', 'Oui publié'), value: 4 },
        ],
      },
      {
        id: 'gov_mission',
        label: t('compliance.bcorp.sections.gouvernance.questions.gov_mission', 'Mission sociale dans les statuts'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.enProjet', 'En projet'), value: 2 },
          { label: t('compliance.bcorp.sections.gouvernance.options.mission_mention', 'Oui mention'), value: 4 },
          { label: t('compliance.bcorp.sections.gouvernance.options.mission_raison', "Oui RAISON D'ÊTRE"), value: 6 },
        ],
      },
      {
        id: 'gov_transparence',
        label: t('compliance.bcorp.sections.gouvernance.questions.gov_transparence', "Transparence financière envers parties prenantes"),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.options.complete', 'Complète'), value: 4 },
        ],
      },
      {
        id: 'gov_formation',
        label: t('compliance.bcorp.sections.gouvernance.questions.gov_formation', 'Formation dirigeants aux enjeux ESG'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.options.complete', 'Complète'), value: 4 },
        ],
      },
      {
        id: 'gov_succession',
        label: t('compliance.bcorp.sections.gouvernance.questions.gov_succession', 'Plan de succession responsable'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.informel', 'Informel'), value: 2 },
          { label: t('compliance.bcorp.options.formalise', 'Formalisé'), value: 3 },
        ],
      },
      {
        id: 'gov_reclamation',
        label: t('compliance.bcorp.sections.gouvernance.questions.gov_reclamation', "Mécanisme de réclamation interne"),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.gouvernance.options.reclamation_boite', "Boite à idées"), value: 1 },
          { label: t('compliance.bcorp.sections.gouvernance.options.reclamation_comite', 'Comité dédié'), value: 2 },
          { label: t('compliance.bcorp.sections.gouvernance.options.reclamation_procedure', 'Procédure formelle'), value: 4 },
        ],
      },
    ],
  },
  {
    id: 'collaborateurs',
    title: t('compliance.bcorp.sections.collaborateurs.title', 'Collaborateurs'),
    maxPts: 50,
    theme: {
      bg: 'bg-blue-950/40',
      border: 'border-blue-700/40',
      badge: 'bg-blue-900/60',
      badgeText: 'text-blue-300',
      icon: Users,
      iconColor: 'text-blue-400',
      headerBg: 'bg-blue-900/30',
    },
    questions: [
      {
        id: 'col_salaires',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_salaires', 'Salaires au-dessus du minimum légal'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: '+10%', value: 3 },
          { label: '+20%', value: 6 },
          { label: '+30%', value: 10 },
        ],
      },
      {
        id: 'col_participation',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_participation', 'Participation aux résultats'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.participation_primes', 'Primes'), value: 3 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.participation_interessement', 'Intéressement'), value: 6 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.participation_actionnariat', 'Actionnariat'), value: 10 },
        ],
      },
      {
        id: 'col_formation',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_formation', 'Formation professionnelle (h/an/ETP)'),
        options: [
          { label: '0h', value: 0 },
          { label: '1-10h', value: 2 },
          { label: '11-20h', value: 5 },
          { label: '>20h', value: 8 },
        ],
      },
      {
        id: 'col_promotion',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_promotion', 'Taux de promotion interne'),
        options: [
          { label: '<20%', value: 0 },
          { label: '20-40%', value: 3 },
          { label: '40-60%', value: 5 },
          { label: '>60%', value: 7 },
        ],
      },
      {
        id: 'col_enps',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_enps', 'Score engagement collaborateurs (eNPS)'),
        options: [
          { label: '<0', value: 0 },
          { label: '0-20', value: 2 },
          { label: '21-40', value: 5 },
          { label: '41-60', value: 8 },
          { label: '>60', value: 10 },
        ],
      },
      {
        id: 'col_teletravail',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_teletravail', 'Politique de télétravail'),
        options: [
          { label: t('compliance.bcorp.options.aucune', 'Aucune'), value: 0 },
          { label: t('compliance.bcorp.options.occasionnel', 'Occasionnel'), value: 2 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.teletravail_hybride', 'Hybride formalisé'), value: 4 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.teletravail_fullremote', 'Full remote possible'), value: 5 },
        ],
      },
      {
        id: 'col_conges',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_conges', 'Congés parentaux au-delà du légal'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.conges_2sem', '+2 semaines'), value: 3 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.conges_4sem', '+4 semaines'), value: 5 },
          { label: t('compliance.bcorp.sections.collaborateurs.options.conges_4semPlus', '>4 semaines'), value: 7 },
        ],
      },
      {
        id: 'col_bienetre',
        label: t('compliance.bcorp.sections.collaborateurs.questions.col_bienetre', 'Programme bien-être (sport/santé/psy)'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partiel', 'Partiel'), value: 2 },
          { label: t('compliance.bcorp.options.complet', 'Complet'), value: 3 },
        ],
      },
    ],
  },
  {
    id: 'communaute',
    title: t('compliance.bcorp.sections.communaute.title', 'Communauté'),
    maxPts: 50,
    theme: {
      bg: 'bg-green-950/40',
      border: 'border-green-700/40',
      badge: 'bg-green-900/60',
      badgeText: 'text-green-300',
      icon: Globe,
      iconColor: 'text-green-400',
      headerBg: 'bg-green-900/30',
    },
    questions: [
      {
        id: 'com_achats_locaux',
        label: t('compliance.bcorp.sections.communaute.questions.com_achats_locaux', 'Achats locaux (<100km)'),
        options: [
          { label: '<10%', value: 0 },
          { label: '10-30%', value: 3 },
          { label: '30-50%', value: 6 },
          { label: '>50%', value: 10 },
        ],
      },
      {
        id: 'com_benevolat',
        label: t('compliance.bcorp.sections.communaute.questions.com_benevolat', "Bénévolat d'entreprise"),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.occasionnel', 'Occasionnel'), value: 2 },
          { label: t('compliance.bcorp.sections.communaute.options.benevolat_jour', 'Jour/an/ETP'), value: 4 },
          { label: t('compliance.bcorp.sections.communaute.options.benevolat_plusJour', '>1 jour/an'), value: 7 },
        ],
      },
      {
        id: 'com_partenariats',
        label: t('compliance.bcorp.sections.communaute.questions.com_partenariats', 'Partenariats associations locales'),
        options: [
          { label: t('compliance.bcorp.options.aucun', 'Aucun'), value: 0 },
          { label: '1-2', value: 3 },
          { label: '3-5', value: 5 },
          { label: '>5', value: 8 },
        ],
      },
      {
        id: 'com_insertion',
        label: t('compliance.bcorp.sections.communaute.questions.com_insertion', 'Programme insertion professionnelle'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.communaute.options.insertion_stagiaires', 'Stagiaires/alternants'), value: 3 },
          { label: t('compliance.bcorp.sections.communaute.options.insertion_qpv', 'QPV/handicap'), value: 5 },
          { label: t('compliance.bcorp.sections.communaute.options.insertion_programme', 'Programme dédié'), value: 8 },
        ],
      },
      {
        id: 'com_mecenat',
        label: t('compliance.bcorp.sections.communaute.questions.com_mecenat', 'Mécénat et dons'),
        options: [
          { label: '<0.5% CA', value: 0 },
          { label: '0.5-1%', value: 3 },
          { label: '1-2%', value: 5 },
          { label: '>2%', value: 7 },
        ],
      },
      {
        id: 'com_clause_rse',
        label: t('compliance.bcorp.sections.communaute.questions.com_clause_rse', 'Clause RSE dans contrats fournisseurs'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.enCours', 'En cours'), value: 2 },
          { label: t('compliance.bcorp.options.oui', 'Oui'), value: 5 },
          { label: t('compliance.bcorp.sections.communaute.options.rse_audit', 'Audit annuel'), value: 8 },
        ],
      },
      {
        id: 'com_pmr',
        label: t('compliance.bcorp.sections.communaute.questions.com_pmr', 'Accessibilité PMR/inclusivité'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.sections.communaute.options.pmr_totale', 'Totale'), value: 4 },
          { label: t('compliance.bcorp.sections.communaute.options.pmr_auDela', 'Au-delà du légal'), value: 7 },
        ],
      },
    ],
  },
  {
    id: 'environnement',
    title: t('compliance.bcorp.sections.environnement.title', 'Environnement'),
    maxPts: 50,
    theme: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-700/40',
      badge: 'bg-emerald-900/60',
      badgeText: 'text-emerald-300',
      icon: Leaf,
      iconColor: 'text-emerald-400',
      headerBg: 'bg-emerald-900/30',
    },
    questions: [
      {
        id: 'env_bilan',
        label: t('compliance.bcorp.sections.environnement.questions.env_bilan', 'Bilan carbone réalisé'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.enCours', 'En cours'), value: 2 },
          { label: 'Scope 1+2', value: 5 },
          { label: 'Scope 1+2+3', value: 8 },
        ],
      },
      {
        id: 'env_objectif',
        label: t('compliance.bcorp.sections.environnement.questions.env_objectif', 'Objectif de réduction GES'),
        options: [
          { label: t('compliance.bcorp.options.aucun', 'Aucun'), value: 0 },
          { label: t('compliance.bcorp.options.informel', 'Informel'), value: 2 },
          { label: t('compliance.bcorp.options.formalise', 'Formalisé'), value: 4 },
          { label: t('compliance.bcorp.sections.environnement.options.objectif_sbti', 'Validé SBTi'), value: 10 },
        ],
      },
      {
        id: 'env_energie',
        label: t('compliance.bcorp.sections.environnement.questions.env_energie', "Part d'énergie renouvelable"),
        options: [
          { label: '<10%', value: 0 },
          { label: '10-30%', value: 2 },
          { label: '30-70%', value: 5 },
          { label: '>70%', value: 8 },
        ],
      },
      {
        id: 'env_achats_durables',
        label: t('compliance.bcorp.sections.environnement.questions.env_achats_durables', 'Politique achats durables'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.sections.environnement.options.achats_formalisee', 'Formalisée'), value: 5 },
          { label: t('compliance.bcorp.sections.environnement.options.achats_labels', 'Labels exigés'), value: 8 },
        ],
      },
      {
        id: 'env_recyclage',
        label: t('compliance.bcorp.sections.environnement.questions.env_recyclage', 'Taux de recyclage déchets'),
        options: [
          { label: '<30%', value: 0 },
          { label: '30-60%', value: 2 },
          { label: '60-90%', value: 5 },
          { label: '>90%', value: 8 },
        ],
      },
      {
        id: 'env_emballages',
        label: t('compliance.bcorp.sections.environnement.questions.env_emballages', 'Emballages éco-conçus'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.enCours', 'En cours'), value: 2 },
          { label: t('compliance.bcorp.sections.environnement.options.emballages_partiels', 'Partiels'), value: 4 },
          { label: t('compliance.bcorp.sections.environnement.options.emballages_integraux', 'Intégraux'), value: 6 },
        ],
      },
      {
        id: 'env_eau',
        label: t('compliance.bcorp.sections.environnement.questions.env_eau', "Bilan eau / réduction consommation"),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.environnement.options.eau_suivi', 'Suivi seul'), value: 2 },
          { label: t('compliance.bcorp.sections.environnement.options.eau_objectif', 'Objectif réduction'), value: 4 },
          { label: t('compliance.bcorp.sections.environnement.options.eau_atteint', 'Atteint -20%'), value: 5 },
        ],
      },
      {
        id: 'env_compensation',
        label: t('compliance.bcorp.sections.environnement.questions.env_compensation', 'Compensation carbone'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.sections.environnement.options.compensation_gold', 'Totale Gold Standard'), value: 4 },
        ],
      },
    ],
  },
  {
    id: 'clients',
    title: t('compliance.bcorp.sections.clients.title', 'Clients'),
    maxPts: 25,
    theme: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-700/40',
      badge: 'bg-amber-900/60',
      badgeText: 'text-amber-300',
      icon: Heart,
      iconColor: 'text-amber-400',
      headerBg: 'bg-amber-900/30',
    },
    questions: [
      {
        id: 'cli_nps',
        label: t('compliance.bcorp.sections.clients.questions.cli_nps', 'NPS ou mesure satisfaction'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.clients.options.nps_annuel', 'Annuel'), value: 2 },
          { label: t('compliance.bcorp.sections.clients.options.nps_semestriel', 'Semestriel'), value: 4 },
          { label: t('compliance.bcorp.sections.clients.options.nps_continu', 'Continu'), value: 6 },
        ],
      },
      {
        id: 'cli_rgpd',
        label: t('compliance.bcorp.sections.clients.questions.cli_rgpd', 'Politique de confidentialité des données'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.sections.clients.options.rgpd_basique', 'Basique'), value: 2 },
          { label: t('compliance.bcorp.sections.clients.options.rgpd_complet', 'RGPD complet'), value: 4 },
          { label: t('compliance.bcorp.sections.clients.options.rgpd_privacybydesign', 'Privacy by design'), value: 6 },
        ],
      },
      {
        id: 'cli_rgaa',
        label: t('compliance.bcorp.sections.clients.questions.cli_rgaa', 'Accessibilité numérique (RGAA)'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.sections.clients.options.rgaa_niveauaa', 'Niveau AA'), value: 4 },
        ],
      },
      {
        id: 'cli_tracabilite',
        label: t('compliance.bcorp.sections.clients.questions.cli_tracabilite', 'Traçabilité produit/service'),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.partielle', 'Partielle'), value: 2 },
          { label: t('compliance.bcorp.options.complete', 'Complète'), value: 4 },
          { label: t('compliance.bcorp.sections.clients.options.tracabilite_opendata', 'Open data'), value: 5 },
        ],
      },
      {
        id: 'cli_fidelite',
        label: t('compliance.bcorp.sections.clients.questions.cli_fidelite', "Programme fidélité à impact"),
        options: [
          { label: t('compliance.bcorp.options.non', 'Non'), value: 0 },
          { label: t('compliance.bcorp.options.enCours', 'En cours'), value: 2 },
          { label: t('compliance.bcorp.sections.clients.options.fidelite_actif', 'Actif'), value: 4 },
        ],
      },
    ],
  },
];

// ─── Score helpers ─────────────────────────────────────────────────────────────

function computeScore(answers: Answers): number {
  return Object.values(answers).reduce((sum, v) => sum + v, 0);
}

function scoreLabel(score: number, t: (key: string, def: string) => string): { text: string; color: string } {
  if (score < 40) return { text: t('compliance.bcorp.status.ineligible', 'Non éligible'), color: 'text-red-400' };
  if (score < 80) return { text: t('compliance.bcorp.status.inProgress', 'En progression'), color: 'text-amber-400' };
  if (score < 100) return { text: t('compliance.bcorp.status.eligible', 'Éligible à la certification'), color: 'text-green-400' };
  return { text: t('compliance.bcorp.status.leader', 'Leader B Corp'), color: 'text-emerald-300' };
}

function barColor(score: number): string {
  if (score < 40) return 'bg-red-500';
  if (score < 80) return 'bg-amber-500';
  return 'bg-green-500';
}

function sectionScore(section: Section, answers: Answers): number {
  return section.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-700/40 last:border-0">
      <span className="flex-1 text-sm text-slate-300">{question.label}</span>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.value + opt.label}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              value === opt.value
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
            }`}
          >
            {opt.label}
            {opt.value > 0 && (
              <span className={`ml-1.5 ${value === opt.value ? 'text-indigo-300' : 'text-slate-500'}`}>
                +{opt.value}pt
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionAccordion({
  section,
  answers,
  onAnswer,
}: {
  section: Section;
  answers: Answers;
  onAnswer: (qId: string, val: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const Icon = section.theme.icon;
  const pts = sectionScore(section, answers);
  const pct = Math.min((pts / section.maxPts) * 100, 100);

  return (
    <div className={`rounded-2xl border ${section.theme.border} ${section.theme.bg} overflow-hidden print:break-inside-avoid`}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-6 py-4 ${section.theme.headerBg} hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${section.theme.iconColor}`} />
          <span className="font-semibold text-white text-sm">{section.title}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${section.theme.badge} ${section.theme.badgeText}`}>
            max {section.maxPts} pts
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-white">
            {pts} / {section.maxPts} pts
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-slate-700/50">
        <div
          className={`h-full transition-all duration-500 ${
            pts === 0 ? 'bg-slate-600' : pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Body — hidden when collapsed but shown for print */}
      <div className={`px-6 py-2 ${open ? '' : 'hidden print:block'}`}>
        {section.questions.map((q) => (
          <QuestionRow
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onAnswer(q.id, val)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function BCorp() {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Answers>({});
  const sections = getSections(t);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setAnswers(JSON.parse(stored));
    } catch {/* ignore */}
  }, []);

  // Persist answers on every change
  const handleAnswer = useCallback((qId: string, val: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {/* ignore */}
      return next;
    });
  }, []);

  const score = computeScore(answers);
  const { text: statusText, color: statusColor } = scoreLabel(score, t);
  const pct = Math.min((score / 200) * 100, 100);

  const handlePrint = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const statusLabel = score >= 100 ? t('compliance.bcorp.status.leader', 'Leader B Corp') : score >= 80 ? t('compliance.bcorp.status.eligible', 'Éligible à la certification') : score >= 40 ? t('compliance.bcorp.status.inProgress', 'En progression') : t('compliance.bcorp.status.ineligible', 'Non éligible');

    // Header
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 28, pageW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(t('compliance.bcorp.pdf.reportTitle', 'Évaluation B Corp — Rapport de scores'), 12, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score global : ${score.toFixed(1)} / 200 pts  ·  Statut : ${statusLabel}  ·  ${dateStr}`, 12, 22);

    let y = 38;
    const GREEN: [number,number,number] = [22, 163, 74];
    const INDIGO: [number,number,number] = [99, 102, 241];

    // Global summary
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      head: [[t('compliance.bcorp.pdf.colSection', 'Section'), t('compliance.bcorp.pdf.colScore', 'Score obtenu'), t('compliance.bcorp.pdf.colMax', 'Maximum'), '%']],
      body: sections.map(s => {
        const pts = sectionScore(s, answers);
        return [s.title, `${pts.toFixed(1)} pts`, `${s.maxPts} pts`, `${Math.round((pts / s.maxPts) * 100)}%`];
      }),
      headStyles: { fillColor: INDIGO, textColor: [255,255,255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Detail per section
    for (const section of sections) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...INDIGO);
      const spts = sectionScore(section, answers);
      doc.text(`${section.title}  —  ${spts.toFixed(1)} / ${section.maxPts} pts`, 12, y);
      y += 3;
      autoTable(doc, {
        startY: y,
        margin: { left: 12, right: 12 },
        head: [[t('compliance.bcorp.pdf.colCriteria', 'Critère'), t('compliance.bcorp.pdf.colAnswer', 'Réponse sélectionnée'), t('compliance.bcorp.pdf.colPoints', 'Points')]],
        body: section.questions.map(q => {
          const val = answers[q.id];
          const opt = q.options.find(o => o.value === val);
          return [q.label, opt ? opt.label : t('compliance.bcorp.pdf.unanswered', 'Non répondu'), val != null ? `${val}` : '0'];
        }),
        headStyles: { fillColor: [51, 65, 85], textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 70 }, 2: { halign: 'center', cellWidth: 20 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} / ${totalPages}  ·  B Corp Assessment  ·  ESGFlow`, pageW / 2, 292, { align: 'center' });
    }

    doc.save(`BCorp_Assessment_${new Date().getFullYear()}.pdf`);
    toast.success(t('compliance.bcorp.toast.pdfGenerated', 'PDF B Corp généré et téléchargé'));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl shadow-xl no-print"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%)' }}
        >
          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.10) 0%, transparent 55%)' }}
          />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="bcorpdots" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="14" cy="14" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#bcorpdots)" />
            </svg>
          </div>

          <div className="relative px-8 py-7">
            <BackButton to="/app/compliance" label={t('compliance.bcorp.nav.compliance', 'Conformité')} className="mb-4 text-white/70 hover:text-white" />

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    {t('compliance.bcorp.hero.title', 'Évaluation B Corp — B Impact Assessment')}
                  </h1>
                </div>
                <p className="text-indigo-200 text-sm ml-1 mb-4">
                  {t('compliance.bcorp.hero.subtitle', 'Certification internationale pour les entreprises à impact')}
                </p>

                {/* Score gauge */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 inline-block min-w-[280px]">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-extrabold text-white">{score}</span>
                    <span className="text-indigo-300 text-lg mb-1">/ 200 pts</span>
                  </div>
                  {/* Bar */}
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor(score)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* Thresholds */}
                  <div className="flex justify-between text-[10px] text-indigo-300 mb-2">
                    <span>0</span>
                    <span>40</span>
                    <span>80</span>
                    <span>100</span>
                    <span>200</span>
                  </div>
                  <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>
                </div>
              </div>

              {/* Right — export */}
              <div className="flex flex-col gap-3 lg:items-end">
                <button
                  onClick={handlePrint}
                  className="no-print flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-sm transition-all border border-white/20"
                >
                  <Download className="h-4 w-4" />
                  {t('compliance.bcorp.hero.exportPdf', 'Exporter PDF')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Print header (visible only on print) ─────────────────────────── */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-black">
            {t('compliance.bcorp.hero.title', 'Évaluation B Corp — B Impact Assessment')}
          </h1>
          <p className="text-gray-600">{t('compliance.bcorp.print.totalScore', 'Score total : {{score}} / 200 pts — {{status}}', { score, status: statusText })}</p>
          <p className="text-gray-500 text-sm">
            {t('compliance.bcorp.print.generatedOn', 'Généré le {{date}}', { date: new Date().toLocaleDateString('fr-FR') })}
          </p>
        </div>

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        {sections.map((section) => (
          <SectionAccordion
            key={section.id}
            section={section}
            answers={answers}
            onAnswer={handleAnswer}
          />
        ))}

        {/* ── Footer score summary ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            {t('compliance.bcorp.summary.sectionRecap', 'Récapitulatif par section')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {sections.map((section) => {
              const pts = sectionScore(section, answers);
              const pctSection = Math.min((pts / section.maxPts) * 100, 100);
              const Icon = section.theme.icon;
              return (
                <div key={section.id} className="flex flex-col items-center gap-2">
                  <Icon className={`h-5 w-5 ${section.theme.iconColor}`} />
                  <span className="text-xs text-slate-400 text-center">{section.title}</span>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(pts)}`}
                      style={{ width: `${pctSection}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white">{pts}/{section.maxPts}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
