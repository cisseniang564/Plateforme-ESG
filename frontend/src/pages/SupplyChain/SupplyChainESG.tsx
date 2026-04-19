import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { getBatchOrgScores } from '@/services/esgScoringService';
import {
  Truck, Search, Plus, Send, CheckCircle, AlertTriangle,
  XCircle, Clock, ChevronRight, Download,
  Shield, Leaf, Users, Scale,
  Mail, Eye, RefreshCw,
  ArrowRight, Info, X, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = 'Critique' | 'Élevé' | 'Moyen' | 'Faible';
type EvalStatus = 'Évalué' | 'En cours' | 'Non évalué' | 'Refus';
type TabId = 'dashboard' | 'suppliers' | 'questionnaires' | 'diligence';

interface ESGScore {
  env: number;
  social: number;
  gov: number;
  ethics: number;
  safety: number;
  compliance: number;
}

interface Supplier {
  id: string;
  name: string;
  country: string;
  category: string;
  spend: number;
  employees: number;
  risk: RiskLevel;
  status: EvalStatus;
  scores: ESGScore;
  globalScore: number;
  lastEval: string;
  flags: string[];
  questionnaireSent: boolean;
  questionnaireCompleted: boolean;
  contactEmail: string;
}

interface Question {
  id: string;
  section: string;
  text: string;
  type: 'yesno' | 'scale' | 'text' | 'multiselect';
  options?: string[];
  weight: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
function riskFromScore(score: number | null): RiskLevel {
  if (!score || score === 0) return 'Élevé';
  if (score < 40) return 'Critique';
  if (score < 60) return 'Élevé';
  if (score < 75) return 'Moyen';
  return 'Faible';
}
function statusFromScore(score: number | null): EvalStatus {
  if (!score || score === 0) return 'Non évalué';
  return 'Évalué';
}

const SUPPLIERS_FALLBACK: Supplier[] = [
  {
    id: 's1', name: 'AcierPlus Industries', country: 'France', category: 'Matières premières',
    spend: 2400, employees: 850, risk: 'Élevé', status: 'Évalué',
    scores: { env: 52, social: 68, gov: 71, ethics: 65, safety: 78, compliance: 60 },
    globalScore: 66, lastEval: '2025-11-15',
    flags: ['Émissions Scope 3 élevées', 'Absence certification ISO 14001'],
    questionnaireSent: true, questionnaireCompleted: true, contactEmail: 'rse@acierplus.fr',
  },
  {
    id: 's2', name: 'LogiTrans Europe', country: 'Allemagne', category: 'Logistique',
    spend: 1800, employees: 3200, risk: 'Moyen', status: 'Évalué',
    scores: { env: 61, social: 72, gov: 69, ethics: 74, safety: 80, compliance: 73 },
    globalScore: 72, lastEval: '2025-10-03',
    flags: ['Flotte diesel > 80%'],
    questionnaireSent: true, questionnaireCompleted: true, contactEmail: 'esg@logitrans.de',
  },
  {
    id: 's3', name: 'TextileCo Asia', country: 'Bangladesh', category: 'Sous-traitance',
    spend: 3100, employees: 12000, risk: 'Critique', status: 'En cours',
    scores: { env: 28, social: 32, gov: 41, ethics: 35, safety: 39, compliance: 30 },
    globalScore: 34, lastEval: '2025-08-20',
    flags: ['Risque travail enfants', 'Conditions de travail défaillantes', 'Non-conformité OCDE', 'Aucune certification sociale'],
    questionnaireSent: true, questionnaireCompleted: false, contactEmail: 'admin@textileco.bd',
  },
  {
    id: 's4', name: 'GreenPack Solutions', country: 'France', category: 'Emballages',
    spend: 620, employees: 145, risk: 'Faible', status: 'Évalué',
    scores: { env: 88, social: 82, gov: 79, ethics: 84, safety: 90, compliance: 85 },
    globalScore: 85, lastEval: '2025-12-01',
    flags: [],
    questionnaireSent: true, questionnaireCompleted: true, contactEmail: 'contact@greenpack.fr',
  },
  {
    id: 's5', name: 'DataCloud SaaS', country: 'USA', category: 'IT & Numérique',
    spend: 480, employees: 5500, risk: 'Moyen', status: 'Évalué',
    scores: { env: 55, social: 77, gov: 85, ethics: 80, safety: 72, compliance: 78 },
    globalScore: 75, lastEval: '2025-09-14',
    flags: ['Hébergement hors UE', 'RGPD à vérifier'],
    questionnaireSent: true, questionnaireCompleted: true, contactEmail: 'compliance@datacloud.io',
  },
  {
    id: 's6', name: 'ChimieBase SARL', country: 'Belgique', category: 'Matières premières',
    spend: 1250, employees: 280, risk: 'Élevé', status: 'Non évalué',
    scores: { env: 0, social: 0, gov: 0, ethics: 0, safety: 0, compliance: 0 },
    globalScore: 0, lastEval: '—',
    flags: ['Substances dangereuses REACH', 'Évaluation en attente'],
    questionnaireSent: false, questionnaireCompleted: false, contactEmail: 'contact@chimiebase.be',
  },
  {
    id: 's7', name: 'Energie Renov', country: 'France', category: 'Énergie',
    spend: 390, employees: 62, risk: 'Faible', status: 'Évalué',
    scores: { env: 91, social: 76, gov: 73, ethics: 80, safety: 85, compliance: 88 },
    globalScore: 82, lastEval: '2025-11-28',
    flags: [],
    questionnaireSent: true, questionnaireCompleted: true, contactEmail: 'rse@energierenov.fr',
  },
  {
    id: 's8', name: 'Plastex Méditerranée', country: 'Italie', category: 'Emballages',
    spend: 720, employees: 410, risk: 'Moyen', status: 'En cours',
    scores: { env: 44, social: 59, gov: 62, ethics: 55, safety: 67, compliance: 58 },
    globalScore: 58, lastEval: '2025-07-10',
    flags: ['Plastiques non recyclables', 'Déchets industriels non tracés'],
    questionnaireSent: true, questionnaireCompleted: false, contactEmail: 'sustainability@plastex.it',
  },
  {
    id: 's9', name: 'ConseilRH Partners', country: 'France', category: 'Services',
    spend: 310, employees: 95, risk: 'Faible', status: 'Non évalué',
    scores: { env: 0, social: 0, gov: 0, ethics: 0, safety: 0, compliance: 0 },
    globalScore: 0, lastEval: '—',
    flags: [],
    questionnaireSent: false, questionnaireCompleted: false, contactEmail: 'contact@conseilrh.fr',
  },
  {
    id: 's10', name: 'MinéralExtract SA', country: 'RDC', category: 'Matières premières',
    spend: 870, employees: 1800, risk: 'Critique', status: 'Non évalué',
    scores: { env: 0, social: 0, gov: 0, ethics: 0, safety: 0, compliance: 0 },
    globalScore: 0, lastEval: '—',
    flags: ['Zone conflit potentiel', 'Minéraux de conflit (OCDE)', 'Évaluation urgente requise'],
    questionnaireSent: false, questionnaireCompleted: false, contactEmail: 'direction@mineralextract.cd',
  },
];

const QUESTIONNAIRE: Question[] = [
  // Environnement
  { id: 'q1', section: 'Environnement', text: 'Avez-vous mesuré votre bilan carbone (Scope 1, 2, 3) ?', type: 'yesno', weight: 15 },
  { id: 'q2', section: 'Environnement', text: 'Disposez-vous d\'une certification ISO 14001 ou équivalente ?', type: 'yesno', weight: 10 },
  { id: 'q3', section: 'Environnement', text: 'Avez-vous des objectifs de réduction d\'émissions GHG formalisés ?', type: 'yesno', weight: 10 },
  { id: 'q4', section: 'Environnement', text: 'Comment évaluez-vous votre gestion des déchets ?', type: 'scale', weight: 8 },
  { id: 'q5', section: 'Environnement', text: 'Quelle part de votre énergie est renouvelable ?', type: 'multiselect', options: ['0%', '1-25%', '26-50%', '51-75%', '>75%'], weight: 7 },
  // Social
  { id: 'q6', section: 'Social', text: 'Êtes-vous certifié SA8000 ou disposez-vous d\'une politique droits humains ?', type: 'yesno', weight: 15 },
  { id: 'q7', section: 'Social', text: 'Avez-vous réalisé un audit social tiers sur les 24 derniers mois ?', type: 'yesno', weight: 12 },
  { id: 'q8', section: 'Social', text: 'Vos sous-traitants rang 1 sont-ils évalués sur des critères sociaux ?', type: 'yesno', weight: 10 },
  { id: 'q9', section: 'Social', text: 'Quel est votre taux de fréquence des accidents du travail (TF1) ?', type: 'multiselect', options: ['< 2', '2-5', '5-10', '10-20', '> 20'], weight: 8 },
  { id: 'q10', section: 'Social', text: 'Avez-vous une politique de diversité & inclusion formalisée ?', type: 'yesno', weight: 6 },
  // Gouvernance
  { id: 'q11', section: 'Gouvernance', text: 'Disposez-vous d\'un code de conduite anticorruption (Sapin II / FCPA) ?', type: 'yesno', weight: 12 },
  { id: 'q12', section: 'Gouvernance', text: 'Avez-vous un mécanisme d\'alerte (whistleblowing) opérationnel ?', type: 'yesno', weight: 10 },
  { id: 'q13', section: 'Gouvernance', text: 'Vos fournisseurs sont-ils évalués sur des critères éthiques ?', type: 'yesno', weight: 8 },
  { id: 'q14', section: 'Gouvernance', text: 'Publiez-vous un rapport RSE ou développement durable annuel ?', type: 'yesno', weight: 6 },
  // Conformité
  { id: 'q15', section: 'Conformité', text: 'Êtes-vous conforme à la réglementation REACH (si applicable) ?', type: 'yesno', weight: 10 },
  { id: 'q16', section: 'Conformité', text: 'Respectez-vous les exigences du règlement sur les minéraux de conflit (OCDE) ?', type: 'yesno', weight: 10 },
  { id: 'q17', section: 'Conformité', text: 'Avez-vous fait l\'objet de sanctions réglementaires dans les 3 dernières années ?', type: 'yesno', weight: 8 },
  { id: 'q18', section: 'Conformité', text: 'Acceptez-vous un audit de notre part sur site ?', type: 'yesno', weight: 5 },
];

// ─── Config maps ──────────────────────────────────────────────────────────────
const RISK_CFG: Record<RiskLevel, { color: string; bg: string; border: string; dot: string }> = {
  Critique: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500' },
  Élevé:    { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  Moyen:    { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  Faible:   { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500' },
};

const STATUS_CFG: Record<EvalStatus, { color: string; bg: string; icon: any }> = {
  Évalué:       { color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  'En cours':   { color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Clock },
  'Non évalué': { color: 'text-gray-500',   bg: 'bg-gray-100',   icon: AlertTriangle },
  Refus:        { color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
};

const SCORE_DIMS_KEYS = [
  { key: 'env',        labelKey: 'supplychain.dimEnvironment', icon: Leaf,    color: '#16a34a' },
  { key: 'social',     labelKey: 'supplychain.dimSocial',      icon: Users,   color: '#2563eb' },
  { key: 'gov',        labelKey: 'supplychain.dimGovernance',  icon: Scale,   color: '#7c3aed' },
  { key: 'ethics',     labelKey: 'supplychain.dimEthics',      icon: Shield,  color: '#0891b2' },
  { key: 'safety',     labelKey: 'supplychain.dimSafety',      icon: Shield,  color: '#d97706' },
  { key: 'compliance', labelKey: 'supplychain.dimCompliance',  icon: Check,   color: '#be185d' },
] as const;

const CATEGORIES = ['Toutes', 'Matières premières', 'Logistique', 'Sous-traitance', 'Emballages', 'IT & Numérique', 'Énergie', 'Services'];

// ─── Mini components ──────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number }) {
  const color = score === 0 ? 'bg-gray-100 text-gray-400' :
    score >= 75 ? 'bg-green-100 text-green-700' :
    score >= 50 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center justify-center w-12 h-7 rounded-lg text-xs font-bold ${color}`}>
      {score === 0 ? 'N/A' : score}
    </span>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Supplier drawer ──────────────────────────────────────────────────────────
function SupplierDrawer({
  supplier,
  onClose,
  onSend,
}: {
  supplier: Supplier;
  onClose: () => void;
  onSend: (s: Supplier) => void;
}) {
  const { t } = useTranslation();
  const riskCfg = RISK_CFG[supplier.risk];
  const statusCfg = STATUS_CFG[supplier.status];
  const StatusIcon = statusCfg.icon;

  const handleExportSheet = () => {
    const rows: [string, string | number][] = [
      ['Nom', supplier.name],
      ['Pays', supplier.country],
      ['Catégorie', supplier.category],
      ['Achats (k€)', supplier.spend],
      ['Employés', supplier.employees],
      ['Risque ESG', supplier.risk],
      ['Statut évaluation', supplier.status],
      ['Score ESG global', supplier.globalScore || 'N/A'],
      ['Score Environnement', supplier.scores.env || 'N/A'],
      ['Score Social', supplier.scores.social || 'N/A'],
      ['Score Gouvernance', supplier.scores.gov || 'N/A'],
      ['Score Éthique', supplier.scores.ethics || 'N/A'],
      ['Score Sécurité', supplier.scores.safety || 'N/A'],
      ['Score Conformité', supplier.scores.compliance || 'N/A'],
      ['Dernière évaluation', supplier.lastEval],
      ['Email contact', supplier.contactEmail],
      ['Questionnaire envoyé', supplier.questionnaireSent ? 'Oui' : 'Non'],
      ['Questionnaire complété', supplier.questionnaireCompleted ? 'Oui' : 'Non'],
      ...supplier.flags.map((f, i): [string, string] => [`Alerte ${i + 1}`, f]),
    ];
    const csv = rows.map(r => `"${r[0]}";"${r[1]}"`).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiche-${supplier.name.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{supplier.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('supplychain.drawerCountry'), val: supplier.country },
              { label: t('supplychain.drawerCategory'), val: supplier.category },
              { label: t('supplychain.drawerSpend'), val: `${supplier.spend.toLocaleString()}k€` },
              { label: t('supplychain.drawerHeadcount'), val: supplier.employees.toLocaleString() },
            ].map((i, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-0.5">{i.label}</div>
                <div className="text-sm font-bold text-gray-900">{i.val}</div>
              </div>
            ))}
          </div>

          {/* Status & Risk */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />{supplier.status}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${riskCfg.bg} ${riskCfg.color} border ${riskCfg.border}`}>
              <span className={`w-2 h-2 rounded-full ${riskCfg.dot}`} />{t('supplychain.drawerRisk')} {supplier.risk}
            </span>
            <span className="ml-auto text-xs text-gray-400">{t('supplychain.drawerLastEval')} {supplier.lastEval}</span>
          </div>

          {/* Global score */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-center text-white">
            <div className="text-5xl font-extrabold mb-1">{supplier.globalScore || '—'}</div>
            <div className="text-sm text-slate-300">{t('supplychain.drawerGlobalScore')}</div>
            <div className="mt-3 text-xs text-slate-400">{
              supplier.globalScore === 0 ? t('supplychain.scoreNotEvaluated') :
              supplier.globalScore >= 75 ? t('supplychain.scoreValidated') :
              supplier.globalScore >= 50 ? t('supplychain.scoreImprove') :
              t('supplychain.scoreAtRisk')
            }</div>
          </div>

          {/* Score breakdown */}
          {supplier.globalScore > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">{t('supplychain.drawerDimensions')}</h3>
              {SCORE_DIMS_KEYS.map(dim => (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 flex items-center gap-1.5">
                      <dim.icon className="h-3.5 w-3.5" style={{ color: dim.color }} />
                      {t(dim.labelKey)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: dim.color }}>{supplier.scores[dim.key]}</span>
                  </div>
                  <ScoreBar value={supplier.scores[dim.key]} color={dim.color} />
                </div>
              ))}
            </div>
          )}

          {/* Flags */}
          {supplier.flags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> {t('supplychain.drawerAlerts')}
              </h3>
              {supplier.flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{flag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Questionnaire status */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-900">{t('supplychain.drawerQuestionnaire')}</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('supplychain.drawerQuestionnaireLastSent')}</span>
              {supplier.questionnaireSent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('supplychain.drawerQuestionnaireCompletion')}</span>
              {supplier.questionnaireCompleted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-400" />}
            </div>
            {supplier.contactEmail && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <Mail className="h-3.5 w-3.5" />{supplier.contactEmail}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {/* Always show a questionnaire action button */}
            {!supplier.questionnaireSent ? (
              <button
                onClick={() => { onSend(supplier); onClose(); }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
              >
                <Send className="h-4 w-4" /> {t('supplychain.drawerSendQuestionnaire')}
              </button>
            ) : !supplier.questionnaireCompleted ? (
              <button
                onClick={() => { onSend(supplier); onClose(); }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> {t('supplychain.drawerViewHistory')}
              </button>
            ) : (
              <button
                onClick={() => { onSend(supplier); onClose(); }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                <Send className="h-4 w-4" /> Renvoyer le questionnaire
              </button>
            )}
            <button
              onClick={handleExportSheet}
              className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" /> {t('supplychain.exportSheet')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SupplyChainESG() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('dashboard');
  const [catFilter, setCatFilter] = useState('Toutes');
  const [riskFilter, setRiskFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeQSection, setActiveQSection] = useState('Environnement');
  const [qAnswers, setQAnswers] = useState<Record<string, string>>({});
  const [sendSuccess, setSendSuccess] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'orgs' | 'demo' | 'empty'>('empty');
  const [questionnaire, setQuestionnaire] = useState<Question[]>(QUESTIONNAIRE);
  const [checkedSupplierIds, setCheckedSupplierIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', country: 'France', category: 'Services', contactEmail: '', spend: '' });

  useEffect(() => {
    (async () => {
      try {
        // 1) Try dedicated supply-chain endpoint
        const scRes = await api.get('/supply-chain/suppliers?page_size=200');
        const scSuppliers: any[] = scRes.data || [];
        if (scSuppliers.length > 0) {
          const mapped: Supplier[] = scSuppliers.map((s: any) => ({
            id: s.id,
            name: s.name,
            country: s.country ?? 'France',
            category: s.category ?? 'Services',
            spend: s.spend ?? 0,
            employees: s.employees ?? 0,
            risk: (s.risk as RiskLevel) ?? riskFromScore(s.global_score),
            status: (s.status as EvalStatus) ?? statusFromScore(s.global_score),
            scores: {
              env: s.env_score ?? 0,
              social: s.social_score ?? 0,
              gov: s.gov_score ?? 0,
              ethics: s.gov_score ?? 0,
              safety: s.social_score ?? 0,
              compliance: s.gov_score ?? 0,
            },
            globalScore: s.global_score ?? 0,
            lastEval: s.last_eval ?? '—',
            flags: s.flags ?? [],
            questionnaireSent: s.questionnaire_sent ?? false,
            questionnaireCompleted: s.questionnaire_completed ?? false,
            contactEmail: s.contact_email ?? '',
          }));
          setSuppliers(mapped);
          setDataSource('real');
          setLoadingSuppliers(false);
          return;
        }
      } catch { /* pas de module supply-chain — fallback organisations */ }

      // 2) Fallback: use organisations + real ESG scores
      try {
        const res = await api.get('/organizations');
        const orgs: any[] = res.data?.organizations || res.data?.items || res.data || [];
        if (orgs.length > 0) {
          const scoreMap = await getBatchOrgScores(orgs.map((o: any) => o.id));
          const mapped: Supplier[] = orgs.map((org: any) => {
            const s = scoreMap[org.id];
            const env   = Math.round(s?.environmental_score ?? 0);
            const soc   = Math.round(s?.social_score ?? 0);
            const gov   = Math.round(s?.governance_score ?? 0);
            const score = Math.round(s?.overall_score ?? 0);
            return {
              id: org.id, name: org.name,
              country: org.country ?? 'France',
              category: org.industry ?? org.sector ?? 'Services',
              spend: 0, employees: org.employees ?? 0,
              risk: riskFromScore(score),
              status: statusFromScore(score),
              scores: { env, social: soc, gov, ethics: gov, safety: soc, compliance: gov },
              globalScore: score,
              lastEval: s ? new Date().toISOString().slice(0, 10) : '—',
              flags: score === 0 ? ['Évaluation en attente'] : score < 40 ? ['Score ESG critique'] : [],
              questionnaireSent: score > 0,
              questionnaireCompleted: score > 0,
              contactEmail: '',
            };
          });
          setSuppliers(mapped);
          setDataSource('orgs');
          setLoadingSuppliers(false);
          return;
        }
      } catch { /* ignore */ }

      // 3) No real data — show demo data so the page is functional
      setSuppliers(SUPPLIERS_FALLBACK);
      setDataSource('demo');
      setLoadingSuppliers(false);
    })();
  }, []);

  // Fetch questionnaire questions from backend (fallback to local constant)
  useEffect(() => {
    api.get('/supply-chain/questionnaire/questions')
      .then(res => {
        const items: any[] = res.data || [];
        if (items.length === 0) return;
        const typeMap: Record<string, Question['type']> = {
          boolean: 'yesno', number: 'scale', select: 'multiselect', text: 'text',
        };
        const sectionWeightBase: Record<string, number> = {
          Environnement: 10, Social: 10, Gouvernance: 8, Conformité: 8,
        };
        const mapped: Question[] = items.map((q: any) => ({
          id: String(q.id),
          section: q.section ?? 'Général',
          text: q.question ?? q.text ?? '',
          type: typeMap[q.type] ?? 'yesno',
          options: q.options ?? undefined,
          weight: q.weight ?? sectionWeightBase[q.section] ?? 8,
        }));
        setQuestionnaire(mapped);
      })
      .catch(() => { /* keep local QUESTIONNAIRE fallback */ });
  }, []);

  // Pre-check high-risk suppliers when data loads
  useEffect(() => {
    if (suppliers.length === 0) return;
    setCheckedSupplierIds(new Set(
      suppliers
        .filter(s => (s.risk === 'Critique' || s.risk === 'Élevé') && !s.questionnaireCompleted)
        .map(s => s.id)
    ));
  }, [suppliers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // KPIs
  const evaluated = suppliers.filter(s => s.status === 'Évalué').length;
  const critical = suppliers.filter(s => s.risk === 'Critique').length;
  const scoredSuppliers = suppliers.filter(s => s.globalScore > 0);
  const avgScore = scoredSuppliers.length
    ? Math.round(scoredSuppliers.reduce((acc, s) => acc + s.globalScore, 0) / scoredSuppliers.length)
    : 0;
  const totalSpend = suppliers.reduce((s, sup) => s + sup.spend, 0);
  const criticalSpend = suppliers.filter(s => s.risk === 'Critique').reduce((s, sup) => s + sup.spend, 0);

  // Filtered suppliers
  const filtered = useMemo(() => suppliers.filter(s => {
    if (catFilter !== 'Toutes' && s.category !== catFilter) return false;
    if (riskFilter !== 'Tous' && s.risk !== riskFilter) return false;
    if (statusFilter !== 'Tous' && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.country.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const rOrder: Record<RiskLevel, number> = { Critique: 0, Élevé: 1, Moyen: 2, Faible: 3 };
    return rOrder[a.risk] - rOrder[b.risk];
  }), [catFilter, riskFilter, statusFilter, search, suppliers]);

  const qSections = [...new Set(questionnaire.map(q => q.section))];
  const sectionQuestions = questionnaire.filter(q => q.section === activeQSection);

  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Send questionnaire to one or more supplier IDs */
  const sendQuestionnaire = async (supplierIds: string[]) => {
    if (supplierIds.length === 0) return;
    await Promise.allSettled(
      supplierIds.map(id => {
        const sup = suppliers.find(s => s.id === id);
        return api.post(`/supply-chain/suppliers/${id}/questionnaire`, {
          recipient_email: sup?.contactEmail || undefined,
        }).catch(() => {});
      })
    );
    setSuppliers(prev => prev.map(s =>
      supplierIds.includes(s.id) ? { ...s, questionnaireSent: true, status: 'En cours' as EvalStatus } : s
    ));
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3500);
  };

  /** Send to all checked suppliers (questionnaire tab button) */
  const handleSendQuestionnaire = () => {
    const ids = Array.from(checkedSupplierIds);
    if (ids.length === 0) return;
    sendQuestionnaire(ids);
  };

  /** Export all suppliers as CSV */
  const handleExportCSV = () => {
    const header = ['Nom', 'Pays', 'Catégorie', 'Achats (k€)', 'Employés', 'Risque', 'Statut', 'Score ESG', 'Email contact'];
    const rows = suppliers.map(s => [
      s.name, s.country, s.category, String(s.spend), String(s.employees),
      s.risk, s.status, String(s.globalScore), s.contactEmail,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fournisseurs-esg.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Add a new supplier locally (and attempt backend save) */
  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    const sup: Supplier = {
      id: `new-${Date.now()}`,
      name: newSupplier.name.trim(),
      country: newSupplier.country || 'France',
      category: newSupplier.category || 'Services',
      spend: parseInt(newSupplier.spend) || 0,
      employees: 0,
      risk: 'Élevé',
      status: 'Non évalué',
      scores: { env: 0, social: 0, gov: 0, ethics: 0, safety: 0, compliance: 0 },
      globalScore: 0,
      lastEval: '—',
      flags: ['Évaluation en attente'],
      questionnaireSent: false,
      questionnaireCompleted: false,
      contactEmail: newSupplier.contactEmail,
    };
    setSuppliers(prev => [...prev, sup]);
    setShowAddModal(false);
    setNewSupplier({ name: '', country: 'France', category: 'Services', contactEmail: '', spend: '' });
    // Attempt backend save silently
    api.post('/supply-chain/suppliers', {
      name: sup.name, country: sup.country, category: sup.category,
      spend: sup.spend, contact_email: sup.contactEmail,
    }).catch(() => {});
  };

  const tabs = [
    { id: 'dashboard' as TabId, label: t('supplychain.tabs.dashboard') },
    { id: 'suppliers' as TabId, label: `${t('supplychain.tabs.suppliers')} (${suppliers.length})` },
    { id: 'questionnaires' as TabId, label: t('supplychain.tabs.questionnaires') },
    { id: 'diligence' as TabId, label: t('supplychain.tabs.vigilance') },
  ];

  return (
    <div className="space-y-6">
      {/* ── Data source banner ──────────────────────────────────────────────── */}
      {loadingSuppliers ? (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Chargement des données fournisseurs…
        </div>
      ) : dataSource === 'real' ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span><span className="font-bold">{suppliers.length} fournisseurs chargés</span> — {evaluated} évalués · {critical} à risque critique</span>
        </div>
      ) : dataSource === 'orgs' ? (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <span>
            <span className="font-bold">{suppliers.length} organisations affichées comme fournisseurs</span> — données ESG réelles · module Supply Chain non activé.{' '}
            <a href="/app/data/connectors" className="underline hover:text-blue-900">Configurer les connecteurs →</a>
          </span>
        </div>
      ) : dataSource === 'demo' ? (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span>
            <span className="font-bold">Données de démonstration.</span> Aucun fournisseur réel trouvé — module Supply Chain non activé.{' '}
            <a href="/app/data/connectors" className="underline hover:text-amber-900">Configurer les connecteurs →</a>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span>
            <span className="font-bold">Aucun fournisseur trouvé.</span> Ajoutez des fournisseurs via le bouton ci-dessous ou importez-les depuis vos connecteurs.
          </span>
        </div>
      )}

      {/* ── Hero gradient ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="sc" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20h40M20 0v40" stroke="white" strokeWidth="0.5" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#sc)"/></svg>
        </div>
        <div className="relative flex items-start justify-between flex-wrap gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('supplychain.title')}</h1>
              <p className="text-sm text-blue-100 mt-0.5">{t('supplychain.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> {t('supplychain.addSupplier')}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" /> {t('common.export')}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="relative mt-6 flex gap-2">
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === tb.id ? 'bg-white text-blue-700 shadow-md' : 'text-white/80 hover:bg-white/20'}`}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 py-0">

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            {/* Empty state when no suppliers */}
            {!loadingSuppliers && suppliers.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Truck className="h-14 w-14 mx-auto text-gray-200 mb-4" />
                <p className="text-lg font-semibold text-gray-900">Aucun fournisseur enregistré</p>
                <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                  Ajoutez vos fournisseurs pour évaluer leurs risques ESG et envoyer des questionnaires.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Ajouter un fournisseur
                </button>
              </div>
            )}
            {/* KPIs — only when suppliers exist */}
            {suppliers.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t('supplychain.kpiEvaluated'), val: `${evaluated}/${suppliers.length}`, sub: `${suppliers.length > 0 ? Math.round(evaluated / suppliers.length * 100) : 0}% ${t('supplychain.kpiEvaluatedSub')}`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                    { label: t('supplychain.kpiAvgScore'), val: avgScore, sub: t('supplychain.kpiAvgScoreSub'), color: avgScore >= 70 ? 'text-green-700' : 'text-amber-700', bg: avgScore >= 70 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200' },
                    { label: t('supplychain.kpiCritical'), val: critical, sub: `${totalSpend > 0 ? Math.round(criticalSpend / totalSpend * 100) : 0}% ${t('supplychain.kpiCriticalSub')}`, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                    { label: t('supplychain.kpiPurchases'), val: `${(totalSpend / 1000).toFixed(1)}M€`, sub: t('supplychain.kpiPurchasesSub'), color: 'text-gray-900', bg: 'bg-white border-gray-200' },
                  ].map((k, i) => (
                    <div key={i} className={`rounded-2xl border-2 ${k.bg} p-5`}>
                      <div className={`text-3xl font-extrabold ${k.color}`}>{k.val}</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">{k.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Alert banner for critical suppliers */}
                {critical > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold text-red-800">{t('supplychain.alertBannerText', { count: critical })}</span>
                      <span className="text-red-700 text-sm"> {t('supplychain.alertBannerDesc')}</span>
                    </div>
                    <button onClick={() => setTab('diligence')} className="flex items-center gap-1 text-xs font-bold text-red-700 hover:underline whitespace-nowrap">
                      {t('supplychain.alertBannerLink')} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Risk distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-base font-bold text-gray-900 mb-5">{t('supplychain.sectionRiskDistribution')}</h2>
                    <div className="space-y-3">
                      {(['Critique', 'Élevé', 'Moyen', 'Faible'] as RiskLevel[]).map(r => {
                        const count = suppliers.filter(s => s.risk === r).length;
                        const pct = suppliers.length > 0 ? Math.round(count / suppliers.length * 100) : 0;
                        const cfg = RISK_CFG[r];
                        return (
                          <div key={r}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-sm font-semibold ${cfg.color}`}>{r}</span>
                              <span className="text-sm text-gray-600">{t('supplychain.supplierCount', { count, pct })}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-3 rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-base font-bold text-gray-900 mb-5">{t('supplychain.sectionEvalStatus')}</h2>
                    <div className="space-y-3">
                      {(['Évalué', 'En cours', 'Non évalué', 'Refus'] as EvalStatus[]).map(s => {
                        const count = suppliers.filter(sup => sup.status === s).length;
                        const pct = suppliers.length > 0 ? Math.round(count / suppliers.length * 100) : 0;
                        const cfg = STATUS_CFG[s];
                        const Icon = cfg.icon;
                        return (
                          <div key={s} className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} w-28 flex-shrink-0`}>
                              <Icon className="h-3 w-3" />{s}
                            </span>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-3 rounded-full ${s === 'Évalué' ? 'bg-green-500' : s === 'En cours' ? 'bg-blue-500' : s === 'Refus' ? 'bg-red-400' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm text-gray-500 w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Top risks */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4">{t('supplychain.sectionPriority')}</h2>
                  <div className="divide-y divide-gray-100">
                    {suppliers.filter(s => s.risk === 'Critique' || (s.risk === 'Élevé' && s.status === 'Non évalué')).map(s => {
                      const cfg = RISK_CFG[s.risk];
                      return (
                        <div key={s.id} className="flex items-center gap-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer rounded-xl px-2" onClick={() => setSelectedSupplier(s)}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.country} · {s.category} · {s.spend.toLocaleString()}k€</div>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{s.risk}</span>
                          <div className="text-xs text-gray-400">{s.flags[0] || ''}</div>
                          <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </div>
                      );
                    })}
                    {suppliers.filter(s => s.risk === 'Critique' || (s.risk === 'Élevé' && s.status === 'Non évalué')).length === 0 && (
                      <p className="py-6 text-sm text-center text-gray-400">Aucun fournisseur à risque critique ou élevé non évalué.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Suppliers list ── */}
        {tab === 'suppliers' && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-200">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('supplychain.searchSupplier')} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 5).map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c}</button>
                ))}
              </div>
              <div className="flex gap-2 ml-auto">
                {(['Tous', 'Critique', 'Élevé', 'Moyen', 'Faible'] as const).map(r => (
                  <button key={r} onClick={() => setRiskFilter(r)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${riskFilter === r ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>{r}</button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-5 py-3 text-left">{t('supplychain.colSupplier')}</th>
                    <th className="px-5 py-3 text-left">{t('supplychain.colCategory')}</th>
                    <th className="px-5 py-3 text-right">{t('supplychain.colPurchases')}</th>
                    <th className="px-5 py-3 text-center">{t('supplychain.colRisk')}</th>
                    <th className="px-5 py-3 text-center">{t('supplychain.colStatus')}</th>
                    <th className="px-5 py-3 text-center">{t('supplychain.colEsgScore')}</th>
                    <th className="px-5 py-3 text-center">{t('supplychain.colQuestionnaire')}</th>
                    <th className="px-5 py-3 text-center">{t('supplychain.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(s => {
                    const rCfg = RISK_CFG[s.risk];
                    const stCfg = STATUS_CFG[s.status];
                    const StIcon = stCfg.icon;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900 text-sm">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.country} · {s.employees.toLocaleString()} {t('supplychain.employees')}</div>
                          {s.flags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-red-400" />
                              <span className="text-xs text-red-500">{t('supplychain.flagCount', { count: s.flags.length })}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">{s.category}</td>
                        <td className="px-5 py-4 text-right text-sm font-semibold text-gray-700">{s.spend.toLocaleString()}k€</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${rCfg.bg} ${rCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rCfg.dot}`} />{s.risk}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stCfg.bg} ${stCfg.color}`}>
                            <StIcon className="h-3 w-3" />{s.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <ScorePill score={s.globalScore} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          {s.questionnaireCompleted ? (
                            <span className="text-green-600 text-xs font-semibold flex items-center justify-center gap-1"><CheckCircle className="h-3.5 w-3.5" />{t('supplychain.questionnaireCompleted')}</span>
                          ) : s.questionnaireSent ? (
                            <span className="text-amber-600 text-xs font-semibold flex items-center justify-center gap-1"><Clock className="h-3.5 w-3.5" />{t('supplychain.questionnairePending')}</span>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center justify-center gap-1"><X className="h-3.5 w-3.5" />{t('supplychain.questionnaireNotSent')}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => setSelectedSupplier(s)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                {t('supplychain.supplierCountFooter', { count: filtered.length })}
              </div>
            </div>
          </div>
        )}

        {/* ── Questionnaire tab ── */}
        {tab === 'questionnaires' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Questionnaire builder */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-gray-900">{t('supplychain.questionnaireTabTitle')}</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{questionnaire.length} questions</span>
                  </div>
                  {/* Section tabs */}
                  <div className="flex gap-2 flex-wrap mb-6">
                    {qSections.map(s => (
                      <button key={s} onClick={() => setActiveQSection(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeQSection === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s} ({questionnaire.filter(q => q.section === s).length})
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {sectionQuestions.map((q, i) => (
                      <div key={q.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-900">{q.text}</p>
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{t('supplychain.questionnaireWeight')} {q.weight}%</span>
                        </div>
                        {q.type === 'yesno' && (
                          <div className="flex gap-3 ml-9">
                            {[t('supplychain.questionnaireYes'), t('supplychain.questionnaireNo'), t('supplychain.questionnaireInProgress')].map(opt => (
                              <button key={opt} onClick={() => setQAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors border ${qAnswers[q.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                        {q.type === 'scale' && (
                          <div className="flex gap-2 ml-9">
                            {[1, 2, 3, 4, 5].map(v => (
                              <button key={v} onClick={() => setQAnswers(prev => ({ ...prev, [q.id]: String(v) }))}
                                className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors border ${qAnswers[q.id] === String(v) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                                {v}
                              </button>
                            ))}
                          </div>
                        )}
                        {q.type === 'multiselect' && q.options && (
                          <div className="flex gap-2 flex-wrap ml-9">
                            {q.options.map(opt => (
                              <button key={opt} onClick={() => setQAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${qAnswers[q.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Send panel */}
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 sticky top-6">
                  <h3 className="font-bold text-gray-900">{t('supplychain.questionnaireSendTitle')}</h3>
                  <div className="space-y-2">
                    {suppliers.filter(s => !s.questionnaireCompleted).slice(0, 6).map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={checkedSupplierIds.has(s.id)}
                          onChange={e => setCheckedSupplierIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(s.id); else next.delete(s.id);
                            return next;
                          })}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.country}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RISK_CFG[s.risk].bg} ${RISK_CFG[s.risk].color}`}>{s.risk}</span>
                      </label>
                    ))}
                    {suppliers.filter(s => !s.questionnaireCompleted).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-3">Tous les questionnaires ont été complétés.</p>
                    )}
                  </div>
                  {sendSuccess ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" /> {t('supplychain.questionnaireSendSuccess')}
                    </div>
                  ) : (
                    <button
                      onClick={handleSendQuestionnaire}
                      disabled={checkedSupplierIds.size === 0}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      <Send className="h-4 w-4" />
                      {checkedSupplierIds.size > 0
                        ? `${t('supplychain.questionnaireSendButton')} (${checkedSupplierIds.size})`
                        : t('supplychain.questionnaireSendButton')}
                    </button>
                  )}
                  <p className="text-xs text-gray-400 text-center">{t('supplychain.questionnaireNotice')}</p>
                </div>

                {/* Progress */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">{t('supplychain.questionnaireTrackingStatus')}</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: t('supplychain.questionnaireTrackingLastSent'), count: suppliers.filter(s => s.questionnaireSent).length, color: 'bg-blue-500' },
                      { label: t('supplychain.questionnaireCompleted'), count: suppliers.filter(s => s.questionnaireCompleted).length, color: 'bg-green-500' },
                      { label: t('supplychain.questionnairePending'), count: suppliers.filter(s => s.questionnaireSent && !s.questionnaireCompleted).length, color: 'bg-amber-400' },
                      { label: t('supplychain.questionnaireNotSent'), count: suppliers.filter(s => !s.questionnaireSent).length, color: 'bg-gray-300' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28">{item.label}</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2.5 ${item.color} rounded-full`}
                            style={{ width: `${suppliers.length > 0 ? (item.count / suppliers.length) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-4 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Due diligence tab ── */}
        {tab === 'diligence' && (
          <div className="space-y-8">
            {/* Legal context */}
            <div className="flex items-start gap-4 p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <Scale className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">{t('supplychain.vigilanceLawTitle')}</h3>
                <p className="text-sm text-blue-700">{t('supplychain.vigilanceLawDesc')}</p>
              </div>
            </div>

            {/* Plan de vigilance KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t('supplychain.vigilanceKpiCovered'), val: `${suppliers.filter(s => s.status === 'Évalué').length}/${suppliers.length}`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { label: t('supplychain.vigilanceKpiRisks'), val: critical + suppliers.filter(s => s.risk === 'Élevé').length, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                { label: t('supplychain.vigilanceKpiActivePlans'), val: critical, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                { label: t('supplychain.vigilanceKpiCompliance'), val: critical === 0 ? '✓ OK' : '⚠ Action', color: critical === 0 ? 'text-green-700' : 'text-red-700', bg: critical === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200' },
              ].map((k, i) => (
                <div key={i} className={`rounded-2xl border-2 ${k.bg} p-5`}>
                  <div className={`text-3xl font-extrabold ${k.color}`}>{k.val}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-2">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Critical suppliers action plan */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">{t('supplychain.actionPlanTitle')}</h2>
                <span className="text-xs text-gray-400">{t('supplychain.actionPlanLegal')}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {suppliers.filter(s => s.risk === 'Critique' || s.risk === 'Élevé').map(s => {
                  const cfg = RISK_CFG[s.risk];
                  return (
                    <div key={s.id} className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                          <Truck className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="font-bold text-gray-900">{s.name}</h3>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{s.risk}</span>
                            <span className="text-xs text-gray-400">{s.country} · {s.category}</span>
                          </div>
                          {/* Flags */}
                          {s.flags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {s.flags.map((f, i) => (
                                <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />{f}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Actions requises */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('supplychain.vigilanceMeasures')}</p>
                            {[
                              s.risk === 'Critique' ? t('supplychain.actionCritiqueAudit') : t('supplychain.actionHighQuestionnaire'),
                              t('supplychain.actionContractClauses'),
                              s.risk === 'Critique' ? t('supplychain.actionCritiqueImprovement') : t('supplychain.actionHighMonitoring'),
                              t('supplychain.actionDocument'),
                            ].map((action, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.risk === 'Critique' ? 'bg-red-100' : 'bg-amber-100'}`}>
                                  <span className={`text-xs font-bold ${s.risk === 'Critique' ? 'text-red-600' : 'text-amber-600'}`}>{i + 1}</span>
                                </div>
                                <span className="text-sm text-gray-700">{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => setSelectedSupplier(s)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> {t('supplychain.btnSheet')}
                          </button>
                          <button
                            onClick={() => sendQuestionnaire([s.id])}
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" /> {t('supplychain.btnFollowUp')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {suppliers.filter(s => s.risk === 'Critique' || s.risk === 'Élevé').length === 0 && (
                  <p className="py-8 text-sm text-center text-gray-400">Aucun fournisseur à risque critique ou élevé identifié.</p>
                )}
              </div>
            </div>

            {/* Scope coverage */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">{t('supplychain.vigilanceCoverage')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: t('supplychain.coverageDirectSubsidiaries'), pct: 95, status: t('supplychain.coverageStatusCovered'), color: 'bg-green-500' },
                  { title: t('supplychain.coverageRank1'), pct: suppliers.length > 0 ? Math.round(suppliers.filter(s => s.status === 'Évalué').length / suppliers.length * 100) : 0, status: t('supplychain.coverageStatusPartial'), color: 'bg-amber-400' },
                  { title: t('supplychain.coverageRank2Plus'), pct: 12, status: t('supplychain.coverageStatusToDevelop'), color: 'bg-red-400' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                      <span className="text-sm font-bold text-gray-700">{item.pct}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div className={`h-3 ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              {t('supplychain.vigilanceDisclaimer')}
            </div>
          </div>
        )}
      </div>

      {/* ── Add supplier modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ajouter un fournisseur</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de l'entreprise fournisseur"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <input
                    value={newSupplier.country}
                    onChange={e => setNewSupplier(p => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    value={newSupplier.category}
                    onChange={e => setNewSupplier(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email contact RSE</label>
                <input
                  value={newSupplier.contactEmail}
                  onChange={e => setNewSupplier(p => ({ ...p, contactEmail: e.target.value }))}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="rse@fournisseur.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Achats annuels (k€)</label>
                <input
                  value={newSupplier.spend}
                  onChange={e => setNewSupplier(p => ({ ...p, spend: e.target.value }))}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={!newSupplier.name.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Global send success toast ──────────────────────────────────────── */}
      {sendSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white rounded-2xl shadow-xl text-sm font-semibold">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          {t('supplychain.questionnaireSendSuccess')}
        </div>
      )}

      {/* ── Supplier drawer ────────────────────────────────────────────────── */}
      {selectedSupplier && (
        <SupplierDrawer
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onSend={sup => sendQuestionnaire([sup.id])}
        />
      )}
    </div>
  );
}
