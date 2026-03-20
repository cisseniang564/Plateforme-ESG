import { useState, useMemo } from 'react';
import {
  Truck, Search, Plus, Send, CheckCircle, AlertTriangle,
  XCircle, Clock, ChevronDown, ChevronRight, Download,
  Filter, Star, Shield, Leaf, Users, Scale, BarChart3,
  Globe, Mail, Eye, RefreshCw, TrendingUp, TrendingDown,
  Building2, ArrowRight, Info, X, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = 'Critique' | 'Élevé' | 'Moyen' | 'Faible';
type EvalStatus = 'Évalué' | 'En cours' | 'Non évalué' | 'Refus';
type TabId = 'dashboard' | 'suppliers' | 'questionnaires' | 'diligence';

interface ESGScore {
  env: number;   // 0-100
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
  spend: number;         // k€ annuel
  employees: number;
  risk: RiskLevel;
  status: EvalStatus;
  scores: ESGScore;
  globalScore: number;   // 0-100
  lastEval: string;
  flags: string[];       // alertes
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
const SUPPLIERS: Supplier[] = [
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const SCORE_DIMS = [
  { key: 'env',        label: 'Environnement', icon: Leaf,    color: '#16a34a' },
  { key: 'social',     label: 'Social',        icon: Users,   color: '#2563eb' },
  { key: 'gov',        label: 'Gouvernance',   icon: Scale,   color: '#7c3aed' },
  { key: 'ethics',     label: 'Éthique',       icon: Shield,  color: '#0891b2' },
  { key: 'safety',     label: 'Sécurité',      icon: Shield,  color: '#d97706' },
  { key: 'compliance', label: 'Conformité',    icon: Check,   color: '#be185d' },
] as const;

const CATEGORIES = ['Toutes', 'Matières premières', 'Logistique', 'Sous-traitance', 'Emballages', 'IT & Numérique', 'Énergie', 'Services'];

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

// ─── Supplier drawer / detail panel ──────────────────────────────────────────
function SupplierDrawer({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const riskCfg = RISK_CFG[supplier.risk];
  const statusCfg = STATUS_CFG[supplier.status];
  const StatusIcon = statusCfg.icon;

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
              { label: 'Pays', val: supplier.country },
              { label: 'Catégorie', val: supplier.category },
              { label: 'Dépense annuelle', val: `${supplier.spend.toLocaleString()}k€` },
              { label: 'Effectifs', val: supplier.employees.toLocaleString() },
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
              <span className={`w-2 h-2 rounded-full ${riskCfg.dot}`} />Risque {supplier.risk}
            </span>
            <span className="ml-auto text-xs text-gray-400">Dernière éval. {supplier.lastEval}</span>
          </div>

          {/* Global score */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-center text-white">
            <div className="text-5xl font-extrabold mb-1">{supplier.globalScore || '—'}</div>
            <div className="text-sm text-slate-300">Score ESG Global /100</div>
            <div className="mt-3 text-xs text-slate-400">{
              supplier.globalScore === 0 ? 'Évaluation non réalisée' :
              supplier.globalScore >= 75 ? '✓ Fournisseur validé' :
              supplier.globalScore >= 50 ? '⚠ Amélioration requise' :
              '✗ Fournisseur à risque — action immédiate'
            }</div>
          </div>

          {/* Score breakdown */}
          {supplier.globalScore > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Détail par dimension</h3>
              {SCORE_DIMS.map(dim => (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 flex items-center gap-1.5">
                      <dim.icon className="h-3.5 w-3.5" style={{ color: dim.color }} />
                      {dim.label}
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
                <AlertTriangle className="h-4 w-4" /> Alertes identifiées
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
            <h3 className="text-sm font-bold text-gray-900">Questionnaire ESG</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Envoyé</span>
              {supplier.questionnaireSent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Complété</span>
              {supplier.questionnaireCompleted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-400" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <Mail className="h-3.5 w-3.5" />{supplier.contactEmail}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {!supplier.questionnaireSent && (
              <button className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors">
                <Send className="h-4 w-4" /> Envoyer le questionnaire
              </button>
            )}
            {supplier.questionnaireSent && !supplier.questionnaireCompleted && (
              <button className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors">
                <RefreshCw className="h-4 w-4" /> Relancer le fournisseur
              </button>
            )}
            <button className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" /> Exporter la fiche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SupplyChainESG() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [catFilter, setCatFilter] = useState('Toutes');
  const [riskFilter, setRiskFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeQSection, setActiveQSection] = useState('Environnement');
  const [qAnswers, setQAnswers] = useState<Record<string, string>>({});
  const [sendSuccess, setSendSuccess] = useState(false);

  // KPIs
  const evaluated = SUPPLIERS.filter(s => s.status === 'Évalué').length;
  const critical = SUPPLIERS.filter(s => s.risk === 'Critique').length;
  const avgScore = Math.round(SUPPLIERS.filter(s => s.globalScore > 0).reduce((s, sup) => s + sup.globalScore, 0) / SUPPLIERS.filter(s => s.globalScore > 0).length);
  const totalSpend = SUPPLIERS.reduce((s, sup) => s + sup.spend, 0);
  const criticalSpend = SUPPLIERS.filter(s => s.risk === 'Critique').reduce((s, sup) => s + sup.spend, 0);

  // Filtered suppliers
  const filtered = useMemo(() => SUPPLIERS.filter(s => {
    if (catFilter !== 'Toutes' && s.category !== catFilter) return false;
    if (riskFilter !== 'Tous' && s.risk !== riskFilter) return false;
    if (statusFilter !== 'Tous' && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.country.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const rOrder: Record<RiskLevel, number> = { Critique: 0, Élevé: 1, Moyen: 2, Faible: 3 };
    return rOrder[a.risk] - rOrder[b.risk];
  }), [catFilter, riskFilter, statusFilter, search]);

  const qSections = [...new Set(QUESTIONNAIRE.map(q => q.section))];
  const sectionQuestions = QUESTIONNAIRE.filter(q => q.section === activeQSection);

  const handleSendQuestionnaire = () => {
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const tabs = [
    { id: 'dashboard' as TabId, label: 'Tableau de bord' },
    { id: 'suppliers' as TabId, label: `Fournisseurs (${SUPPLIERS.length})` },
    { id: 'questionnaires' as TabId, label: 'Questionnaires' },
    { id: 'diligence' as TabId, label: 'Devoir de vigilance' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Supply Chain ESG</h1>
              <p className="text-sm text-gray-500 mt-0.5">Évaluation fournisseurs · Questionnaires · Due diligence · Devoir de vigilance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Ajouter fournisseur
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Fournisseurs évalués', val: `${evaluated}/${SUPPLIERS.length}`, sub: `${Math.round(evaluated / SUPPLIERS.length * 100)}% du panel`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { label: 'Score ESG moyen', val: avgScore, sub: 'Sur les fournisseurs évalués', color: avgScore >= 70 ? 'text-green-700' : 'text-amber-700', bg: avgScore >= 70 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200' },
                { label: 'Fournisseurs critiques', val: critical, sub: `${Math.round(criticalSpend / totalSpend * 100)}% des achats`, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                { label: 'Achats total panel', val: `${(totalSpend / 1000).toFixed(1)}M€`, sub: 'Volume annuel', color: 'text-gray-900', bg: 'bg-white border-gray-200' },
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
                  <span className="font-bold text-red-800">{critical} fournisseur{critical > 1 ? 's critiques' : ' critique'} identifié{critical > 1 ? 's' : ''} — </span>
                  <span className="text-red-700 text-sm">Ces fournisseurs présentent des risques droits humains ou environnementaux graves. Une action immédiate est requise au titre du devoir de vigilance (Loi 2017-399).</span>
                </div>
                <button onClick={() => setTab('diligence')} className="flex items-center gap-1 text-xs font-bold text-red-700 hover:underline whitespace-nowrap">
                  Voir plan <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Risk distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5">Répartition par niveau de risque</h2>
                <div className="space-y-3">
                  {(['Critique', 'Élevé', 'Moyen', 'Faible'] as RiskLevel[]).map(r => {
                    const count = SUPPLIERS.filter(s => s.risk === r).length;
                    const pct = Math.round(count / SUPPLIERS.length * 100);
                    const cfg = RISK_CFG[r];
                    return (
                      <div key={r}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-semibold ${cfg.color}`}>{r}</span>
                          <span className="text-sm text-gray-600">{count} fournisseur{count > 1 ? 's' : ''} ({pct}%)</span>
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
                <h2 className="text-base font-bold text-gray-900 mb-5">Statut des évaluations</h2>
                <div className="space-y-3">
                  {(['Évalué', 'En cours', 'Non évalué', 'Refus'] as EvalStatus[]).map(s => {
                    const count = SUPPLIERS.filter(sup => sup.status === s).length;
                    const pct = Math.round(count / SUPPLIERS.length * 100);
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
              <h2 className="text-base font-bold text-gray-900 mb-4">Fournisseurs à traiter en priorité</h2>
              <div className="divide-y divide-gray-100">
                {SUPPLIERS.filter(s => s.risk === 'Critique' || (s.risk === 'Élevé' && s.status === 'Non évalué')).map(s => {
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
              </div>
            </div>
          </div>
        )}

        {/* ── Suppliers list ── */}
        {tab === 'suppliers' && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-200">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un fournisseur..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <th className="px-5 py-3 text-left">Fournisseur</th>
                    <th className="px-5 py-3 text-left">Catégorie</th>
                    <th className="px-5 py-3 text-right">Achats</th>
                    <th className="px-5 py-3 text-center">Risque</th>
                    <th className="px-5 py-3 text-center">Statut</th>
                    <th className="px-5 py-3 text-center">Score ESG</th>
                    <th className="px-5 py-3 text-center">Questionnaire</th>
                    <th className="px-5 py-3 text-center">Actions</th>
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
                          <div className="text-xs text-gray-400">{s.country} · {s.employees.toLocaleString()} sal.</div>
                          {s.flags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-red-400" />
                              <span className="text-xs text-red-500">{s.flags.length} alerte{s.flags.length > 1 ? 's' : ''}</span>
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
                            <span className="text-green-600 text-xs font-semibold flex items-center justify-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Complété</span>
                          ) : s.questionnaireSent ? (
                            <span className="text-amber-600 text-xs font-semibold flex items-center justify-center gap-1"><Clock className="h-3.5 w-3.5" />En attente</span>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center justify-center gap-1"><X className="h-3.5 w-3.5" />Non envoyé</span>
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
                {filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}
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
                    <h2 className="text-base font-bold text-gray-900">Questionnaire ESG Fournisseurs</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{QUESTIONNAIRE.length} questions</span>
                  </div>
                  {/* Section tabs */}
                  <div className="flex gap-2 flex-wrap mb-6">
                    {qSections.map(s => (
                      <button key={s} onClick={() => setActiveQSection(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeQSection === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s} ({QUESTIONNAIRE.filter(q => q.section === s).length})
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {sectionQuestions.map((q, i) => (
                      <div key={q.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-900">{q.text}</p>
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">Poids : {q.weight}%</span>
                        </div>
                        {q.type === 'yesno' && (
                          <div className="flex gap-3 ml-9">
                            {['Oui', 'Non', 'En cours'].map(opt => (
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
                  <h3 className="font-bold text-gray-900">Envoyer aux fournisseurs</h3>
                  <div className="space-y-2">
                    {SUPPLIERS.filter(s => !s.questionnaireCompleted).slice(0, 5).map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked={s.risk === 'Critique' || s.risk === 'Élevé'} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.country}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RISK_CFG[s.risk].bg} ${RISK_CFG[s.risk].color}`}>{s.risk}</span>
                      </label>
                    ))}
                  </div>
                  {sendSuccess ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" /> Questionnaires envoyés avec succès !
                    </div>
                  ) : (
                    <button onClick={handleSendQuestionnaire} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
                      <Send className="h-4 w-4" /> Envoyer les questionnaires
                    </button>
                  )}
                  <p className="text-xs text-gray-400 text-center">Chaque fournisseur recevra un lien sécurisé par email pour remplir le questionnaire en ligne.</p>
                </div>

                {/* Progress */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Suivi des réponses</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Envoyés', count: SUPPLIERS.filter(s => s.questionnaireSent).length, color: 'bg-blue-500' },
                      { label: 'Complétés', count: SUPPLIERS.filter(s => s.questionnaireCompleted).length, color: 'bg-green-500' },
                      { label: 'En attente', count: SUPPLIERS.filter(s => s.questionnaireSent && !s.questionnaireCompleted).length, color: 'bg-amber-400' },
                      { label: 'Non envoyés', count: SUPPLIERS.filter(s => !s.questionnaireSent).length, color: 'bg-gray-300' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28">{item.label}</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-2.5 ${item.color} rounded-full`} style={{ width: `${(item.count / SUPPLIERS.length) * 100}%` }} />
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
                <h3 className="font-bold text-blue-900 mb-1">Loi n°2017-399 — Devoir de Vigilance</h3>
                <p className="text-sm text-blue-700">
                  Les entreprises de plus de 5 000 salariés en France (ou 10 000 dans le monde) ont l'obligation légale d'établir et publier un <strong>plan de vigilance</strong> couvrant leurs activités, filiales, sous-traitants et fournisseurs. Ce plan doit identifier les risques graves en matière de droits humains, libertés fondamentales, santé, sécurité et environnement.
                </p>
              </div>
            </div>

            {/* Plan de vigilance KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Fournisseurs rang 1 couverts', val: `${SUPPLIERS.filter(s => s.status === 'Évalué').length}/${SUPPLIERS.length}`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { label: 'Risques graves identifiés', val: critical + SUPPLIERS.filter(s => s.risk === 'Élevé').length, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                { label: 'Plans d\'action actifs', val: critical, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                { label: 'Conformité loi vigilance', val: critical === 0 ? '✓ OK' : '⚠ Action', color: critical === 0 ? 'text-green-700' : 'text-red-700', bg: critical === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200' },
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
                <h2 className="text-base font-bold text-gray-900">Plan d'action — Fournisseurs à risque grave</h2>
                <span className="text-xs text-gray-400">Conforme Loi 2017-399 art. L.225-102-4</span>
              </div>
              <div className="divide-y divide-gray-100">
                {SUPPLIERS.filter(s => s.risk === 'Critique' || s.risk === 'Élevé').map(s => {
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
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mesures de vigilance requises</p>
                            {[
                              s.risk === 'Critique' ? 'Audit social tiers sur site dans les 60 jours' : 'Questionnaire ESG à envoyer sous 30 jours',
                              'Intégrer les clauses contractuelles droits humains',
                              s.risk === 'Critique' ? 'Plan d\'amélioration contraignant ou substitution fournisseur' : 'Suivi annuel des indicateurs sociaux et environnementaux',
                              'Documenter dans le rapport plan de vigilance annuel',
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
                          <button onClick={() => setSelectedSupplier(s)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors">
                            <Eye className="h-3.5 w-3.5" /> Fiche
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold transition-colors">
                            <Send className="h-3.5 w-3.5" /> Relancer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scope coverage */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Couverture du périmètre de vigilance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Filiales directes', pct: 95, status: 'Couvert', color: 'bg-green-500' },
                  { title: 'Fournisseurs rang 1', pct: Math.round(SUPPLIERS.filter(s => s.status === 'Évalué').length / SUPPLIERS.length * 100), status: 'Partiel', color: 'bg-amber-400' },
                  { title: 'Sous-traitants rang 2+', pct: 12, status: 'À développer', color: 'bg-red-400' },
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
              Ce module constitue un outil d'aide au suivi. Il ne remplace pas l'obligation légale de publication d'un plan de vigilance formalisé, ni l'accompagnement d'un conseil juridique spécialisé en droits humains et responsabilité sociétale des entreprises.
            </div>
          </div>
        )}
      </div>

      {/* Supplier drawer */}
      {selectedSupplier && <SupplierDrawer supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} />}
    </div>
  );
}
