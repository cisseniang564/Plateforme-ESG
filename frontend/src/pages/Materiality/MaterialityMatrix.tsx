import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Grid, Plus, RefreshCw, AlertCircle, CheckCircle, Edit, Trash2, X,
  List, ShieldAlert, Target, Activity, Zap, Sparkles, Users, Download,
  ChevronRight, ChevronLeft, Building2, BarChart3, FileText, Check,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type IROType = 'impact' | 'risk' | 'opportunity';

interface MaterialityIssue {
  id: string; name: string; description?: string; category: string;
  financial_impact: number; esg_impact: number; is_material: boolean;
  priority: string; stakeholders?: string;
  // CSRD ESRS binding
  iro_type?: IROType;           // Impact / Risque / Opportunité
  esrs_topic?: string;          // 'E1' | 'E2' | … | 'G1'
  iro_actual_or_potential?: 'actual' | 'potential'; // for impacts
}
interface ESGRisk {
  id: string; title: string; description?: string; category: string;
  probability: number; impact: number; risk_score: number; severity: string;
  status: string; mitigation_plan?: string; responsible_person?: string;
}
interface Stakeholder { id: string; name: string; role: string; type: 'internal' | 'external'; }
interface Rating { stakeholderId: string; issueId: string; financial: number; esg: number; }

// ─── Config ───────────────────────────────────────────────────────────────────
const CAT = {
  environmental: { labelKey: 'materiality.catEnvironmental', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  social:        { labelKey: 'materiality.catSocial',        color: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-500'    },
  governance:    { labelKey: 'materiality.catGovernance',    color: 'bg-purple-100 text-purple-800',   dot: 'bg-purple-500'  },
} as const;

const SEV = {
  critical: { labelKey: 'materiality.sevCritical', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400'    },
  high:     { labelKey: 'materiality.sevHigh',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400' },
  medium:   { labelKey: 'materiality.sevMedium',   color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-400' },
  low:      { labelKey: 'materiality.sevLow',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400'  },
} as const;

// ─── Sector suggestions ───────────────────────────────────────────────────────
const SECTORS: Record<string, Array<{ name: string; description: string; category: string; financial_impact: number; esg_impact: number }>> = {
  'Industrie & Manufacture': [
    { name: 'Émissions CO₂ Scope 1 & 2', category: 'environmental', financial_impact: 88, esg_impact: 92, description: 'Émissions directes liées à la production et consommation d\'électricité' },
    { name: 'Efficacité énergétique', category: 'environmental', financial_impact: 75, esg_impact: 78, description: 'Consommation par unité produite, plans de réduction' },
    { name: 'Gestion des déchets industriels', category: 'environmental', financial_impact: 60, esg_impact: 82, description: 'Taux de valorisation, élimination et traitement' },
    { name: 'Santé & sécurité des travailleurs', category: 'social', financial_impact: 78, esg_impact: 88, description: 'Accidents du travail, maladies professionnelles, prévention' },
    { name: 'Chaîne d\'approvisionnement responsable', category: 'governance', financial_impact: 72, esg_impact: 80, description: 'Audit fournisseurs, standards sociaux et environnementaux' },
    { name: 'Consommation d\'eau industrielle', category: 'environmental', financial_impact: 55, esg_impact: 70, description: 'Volume prélevé, recyclé et traitement des eaux usées' },
    { name: 'Économie circulaire', category: 'environmental', financial_impact: 65, esg_impact: 75, description: 'Recyclage des matières premières, réduction des ressources vierges' },
    { name: 'Développement des compétences', category: 'social', financial_impact: 60, esg_impact: 65, description: 'Formation continue, reconversion et apprentissage' },
  ],
  'Finance & Assurance': [
    { name: 'Finance durable (ESG intégration)', category: 'governance', financial_impact: 85, esg_impact: 90, description: 'Intégration des critères ESG dans les décisions d\'investissement' },
    { name: 'Financement d\'activités controversées', category: 'governance', financial_impact: 88, esg_impact: 85, description: 'Exposition aux secteurs charbon, armement, tabac' },
    { name: 'Risque climatique physique portefeuille', category: 'environmental', financial_impact: 90, esg_impact: 80, description: 'Impact des événements climatiques sur la valeur des actifs' },
    { name: 'Conformité SFDR & Taxonomie UE', category: 'governance', financial_impact: 82, esg_impact: 88, description: 'Alignement des produits financiers avec la réglementation européenne' },
    { name: 'Inclusion financière', category: 'social', financial_impact: 55, esg_impact: 72, description: 'Accès aux services financiers pour les populations défavorisées' },
    { name: 'Protection des données clients', category: 'governance', financial_impact: 80, esg_impact: 75, description: 'Cybersécurité et conformité RGPD' },
    { name: 'Gouvernance des conseils d\'administration', category: 'governance', financial_impact: 75, esg_impact: 80, description: 'Diversité, indépendance et rémunération des dirigeants' },
  ],
  'Distribution & Commerce': [
    { name: 'Émissions logistique (Scope 3)', category: 'environmental', financial_impact: 80, esg_impact: 85, description: 'Transport de marchandises, livraison last-mile, flotte' },
    { name: 'Emballages & plastiques', category: 'environmental', financial_impact: 70, esg_impact: 88, description: 'Réduction, recyclabilité et alternatives aux plastiques' },
    { name: 'Gaspillage alimentaire', category: 'environmental', financial_impact: 72, esg_impact: 82, description: 'Pertes en rayon, dons alimentaires, valorisation des invendus' },
    { name: 'Conditions de travail (TMS)', category: 'social', financial_impact: 68, esg_impact: 80, description: 'Troubles musculo-squelettiques, horaires atypiques' },
    { name: 'Offre de produits durables', category: 'environmental', financial_impact: 75, esg_impact: 78, description: 'Part de l\'assortiment certifié bio, équitable, éco-conçu' },
    { name: 'Sourcing éthique & audit fournisseurs', category: 'governance', financial_impact: 70, esg_impact: 82, description: 'Respect des droits humains chez les fournisseurs' },
    { name: 'Énergie des magasins & réfrigération', category: 'environmental', financial_impact: 65, esg_impact: 72, description: 'Éclairage, climatisation, froid commercial' },
  ],
  'Énergie & Utilities': [
    { name: 'Transition énergétique & décarbonation', category: 'environmental', financial_impact: 95, esg_impact: 95, description: 'Plan de réduction des émissions, développement des EnR' },
    { name: 'Fuites de méthane (Scope 1)', category: 'environmental', financial_impact: 88, esg_impact: 92, description: 'Détection et réduction des fuites sur les réseaux de gaz' },
    { name: 'Acceptabilité sociale des projets', category: 'social', financial_impact: 80, esg_impact: 85, description: 'Consultation des communautés locales, riverains' },
    { name: 'Sécurité des installations (SEVESO)', category: 'social', financial_impact: 85, esg_impact: 88, description: 'PPI, exercices de crise, formation sécurité' },
    { name: 'Mix énergétique renouvelable', category: 'environmental', financial_impact: 82, esg_impact: 90, description: 'Part des énergies renouvelables dans la production totale' },
    { name: 'Impacts sur la biodiversité', category: 'environmental', financial_impact: 65, esg_impact: 80, description: 'Artificialisation des sols, nuisances sur les écosystèmes' },
    { name: 'Reporting TCFD & risques climatiques', category: 'governance', financial_impact: 85, esg_impact: 82, description: 'Stress-tests climatiques et gouvernance du risque' },
  ],
  'Services & Conseil': [
    { name: 'Empreinte carbone numérique', category: 'environmental', financial_impact: 55, esg_impact: 72, description: 'Datacenter, équipements informatiques, déplacements professionnels' },
    { name: 'Bien-être et qualité de vie au travail', category: 'social', financial_impact: 70, esg_impact: 80, description: 'Télétravail, équilibre vie pro/perso, prévention burnout' },
    { name: 'Diversité & inclusion', category: 'social', financial_impact: 65, esg_impact: 78, description: 'Parité femmes/hommes, handicap, diversité culturelle' },
    { name: 'Éthique et conformité (anticorruption)', category: 'governance', financial_impact: 78, esg_impact: 75, description: 'Devoir de vigilance, code éthique, whistleblowing' },
    { name: 'Formation et attractivité des talents', category: 'social', financial_impact: 72, esg_impact: 70, description: 'Rétention, développement, marque employeur' },
    { name: 'Protection des données (RGPD)', category: 'governance', financial_impact: 80, esg_impact: 72, description: 'Conformité RGPD, cybersécurité, gestion des incidents' },
  ],
  'Immobilier & Construction': [
    { name: 'Efficacité énergétique des bâtiments (DPE)', category: 'environmental', financial_impact: 88, esg_impact: 88, description: 'Rénovation thermique, certifications HQE, BREEAM, LEED' },
    { name: 'Biodiversité & artificialisation des sols', category: 'environmental', financial_impact: 70, esg_impact: 82, description: 'Imperméabilisation, espaces verts, trames écologiques' },
    { name: 'Accessibilité et mixité sociale', category: 'social', financial_impact: 62, esg_impact: 75, description: 'Logement social, accessibilité PMR, prix abordables' },
    { name: 'Matériaux de construction durables', category: 'environmental', financial_impact: 68, esg_impact: 78, description: 'Matériaux bas-carbone, réemploi, éco-conception' },
    { name: 'Risques climatiques physiques (inondations)', category: 'environmental', financial_impact: 85, esg_impact: 80, description: 'Inondations, îlots de chaleur, submersion marine' },
    { name: 'Sécurité des chantiers (BTP)', category: 'social', financial_impact: 72, esg_impact: 82, description: 'Accidents du travail en phase de construction' },
  ],
};

const STAKEHOLDER_ROLES = ['Dirigeant / DG', 'Directeur RSE', 'Direction financière', 'Employés / partenaires sociaux', 'Clients', 'Investisseurs', 'Régulateurs / autorités', 'ONG / Société civile', 'Fournisseurs', 'Communautés locales'];

// ─── IRO config ───────────────────────────────────────────────────────────────
const IRO_CFG: Record<IROType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  impact:      { label: 'Impact',      icon: '⚡', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-300'  },
  risk:        { label: 'Risque',      icon: '⚠️', color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-300'    },
  opportunity: { label: 'Opportunité', icon: '🚀', color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-300'  },
};

const ESRS_TOPICS_LIST = ['E1','E2','E3','E4','E5','S1','S2','S3','S4','G1'] as const;
const ESRS_TOPIC_LABELS: Record<string, string> = {
  E1: 'E1 — Changement climatique', E2: 'E2 — Pollution',
  E3: 'E3 — Ressources hydriques', E4: 'E4 — Biodiversité',
  E5: 'E5 — Économie circulaire',  S1: 'S1 — Effectifs',
  S2: 'S2 — Chaîne de valeur',     S3: 'S3 — Communautés',
  S4: 'S4 — Consommateurs',        G1: 'G1 — Conduite des affaires',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Normalize stored category to CAT keys (handles French 'Environnement', 'Gouvernance', etc.)
const normCatKey = (c: string): string => {
  const lower = (c || '').toLowerCase().trim();
  if (lower.startsWith('env')) return 'environmental';
  if (lower.startsWith('soc')) return 'social';
  if (lower.startsWith('gov') || lower.startsWith('gou')) return 'governance';
  return lower;
};
const catDot   = (c: string) => (CAT as any)[normCatKey(c)]?.dot   ?? 'bg-gray-400';
const catBadge = (c: string) => (CAT as any)[normCatKey(c)]?.color ?? 'bg-gray-100 text-gray-600';
const quadrant = (x: number, y: number) => {
  if (x > 60 && y > 60) return { labelKey: 'materiality.quadrantDoubleMaterialLabel', bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700'    };
  if (x > 60)           return { labelKey: 'materiality.quadrantFinancialImpactLabel', bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700' };
  if (y > 60)           return { labelKey: 'materiality.quadrantEsgImpactLabel',       bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-700'   };
  return                       { labelKey: 'materiality.quadrantNotMaterialLabel',     bg: 'bg-gray-50',   border: 'border-gray-300',   text: 'text-gray-500'   };
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function MaterialityMatrix() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const normCat = normCatKey; // alias for use inside component JSX
  const catLabel = (c: string) => t((CAT as any)[normCat(c)]?.labelKey ?? c);
  const iroLabel = (type: IROType) => ({
    impact:      t('materiality.iroImpactLabel',      'Impact'),
    risk:        t('materiality.iroRiskLabel',         'Risque'),
    opportunity: t('materiality.iroOpportunityLabel',  'Opportunité'),
  } as Record<IROType, string>)[type];
  const esrsTopicLabel = (code: string) => t(`materiality.esrsTopic_${code.toLowerCase()}`, ESRS_TOPIC_LABELS[code]);
  const [issues, setIssues]     = useState<MaterialityIssue[]>([]);
  const [risks, setRisks]       = useState<ESGRisk[]>([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // tabs: 'matrix' | 'questionnaire' | 'suggestions' | 'risks' | 'esrs' | 'iros'
  const [activeTab, setActiveTab] = useState<'matrix' | 'questionnaire' | 'suggestions' | 'risks' | 'esrs' | 'iros'>('matrix');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  // Issue modal
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaterialityIssue | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', category: 'environmental', financial_impact: 50, esg_impact: 50, stakeholders: '', iro_type: '' as IROType | '', esrs_topic: '', iro_actual_or_potential: 'potential' as 'actual' | 'potential' });

  // Risk modal
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedRisk, setSelectedRisk]   = useState<ESGRisk | null>(null);
  const [riskForm, setRiskForm] = useState({ title: '', description: '', category: 'environmental', probability: 3, impact: 3, mitigation_plan: '', responsible_person: '' });

  // Drag & drop
  const plotRef     = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Questionnaire
  const [questStep, setQuestStep]       = useState(0);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [stakeholderForm, setStakeholderForm] = useState({ name: '', role: STAKEHOLDER_ROLES[0], type: 'external' as 'internal' | 'external' });
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [ratings, setRatings]           = useState<Rating[]>([]);
  const [questApplied, setQuestApplied] = useState(false);

  // Suggestions IA
  const [selectedSector, setSelectedSector] = useState(Object.keys(SECTORS)[0]);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ir, rr] = await Promise.all([api.get('/materiality/issues'), api.get('/materiality/risks')]);
      setIssues(ir.data || []);
      setRisks(rr.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('materiality.toastLoadError'));
    } finally { setLoading(false); }
  };

  // ── Issue CRUD ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (selectedIssue) { await api.put(`/materiality/issues/${selectedIssue.id}`, formData); toast.success(t('materiality.toastIssueUpdated')); }
      else               { await api.post('/materiality/issues', formData);                     toast.success(t('materiality.toastIssueCreated'));  }
      closeIssueModal(); await loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || t('common.error')); }
    finally { setSubmitting(false); }
  };

  const handleEdit   = (issue: MaterialityIssue) => { setSelectedIssue(issue); setFormData({ name: issue.name, description: issue.description || '', category: issue.category, financial_impact: issue.financial_impact, esg_impact: issue.esg_impact, stakeholders: issue.stakeholders || '', iro_type: issue.iro_type || '', esrs_topic: issue.esrs_topic || '', iro_actual_or_potential: issue.iro_actual_or_potential || 'potential' }); setShowModal(true); };
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('materiality.confirmDeleteIssue', { name }))) return;
    try { await api.delete(`/materiality/issues/${id}`); toast.success(t('materiality.toastIssueDeleted')); await loadAll(); }
    catch (err: any) { toast.error(err.response?.data?.detail || t('common.error')); }
  };
  const closeIssueModal = () => { setShowModal(false); setSelectedIssue(null); setFormData({ name: '', description: '', category: 'environmental', financial_impact: 50, esg_impact: 50, stakeholders: '', iro_type: '', esrs_topic: '', iro_actual_or_potential: 'potential' }); };

  // ── Risk CRUD ────────────────────────────────────────────────────────────────
  const handleRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (selectedRisk) { await api.put(`/materiality/risks/${selectedRisk.id}`, riskForm); toast.success(t('materiality.toastRiskUpdated')); }
      else              { await api.post('/materiality/risks', riskForm);                    toast.success(t('materiality.toastRiskCreated'));  }
      closeRiskModal(); await loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || t('common.error')); }
    finally { setSubmitting(false); }
  };
  const handleRiskEdit   = (risk: ESGRisk) => { setSelectedRisk(risk); setRiskForm({ title: risk.title, description: risk.description || '', category: risk.category, probability: risk.probability, impact: risk.impact, mitigation_plan: risk.mitigation_plan || '', responsible_person: risk.responsible_person || '' }); setShowRiskModal(true); };
  const handleRiskDelete = async (id: string, title: string) => {
    if (!confirm(t('materiality.confirmDeleteRisk', { name: title }))) return;
    try { await api.delete(`/materiality/risks/${id}`); toast.success(t('materiality.toastRiskDeleted')); await loadAll(); }
    catch (err: any) { toast.error(err.response?.data?.detail || t('common.error')); }
  };
  const closeRiskModal = () => { setShowRiskModal(false); setSelectedRisk(null); setRiskForm({ title: '', description: '', category: 'environmental', probability: 3, impact: 3, mitigation_plan: '', responsible_person: '' }); };

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const handleDotMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation(); setDraggingId(id);
  };
  const handlePlotMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !plotRef.current) return;
    const rect = plotRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(2, Math.min(98, Math.round((1 - (e.clientY - rect.top)  / rect.height) * 100)));
    setIssues(prev => prev.map(i => i.id === draggingId ? { ...i, financial_impact: x, esg_impact: y } : i));
  };
  const handlePlotMouseUp = async () => {
    if (!draggingId) return;
    const issue = issues.find(i => i.id === draggingId);
    setDraggingId(null);
    if (!issue) return;
    try {
      await api.put(`/materiality/issues/${issue.id}`, { name: issue.name, description: issue.description || '', category: issue.category, financial_impact: issue.financial_impact, esg_impact: issue.esg_impact, stakeholders: issue.stakeholders || '' });
      toast.success(t('materiality.toastPositionSaved'));
    } catch { toast.error(t('materiality.toastSaveError')); await loadAll(); }
  };

  // ── Questionnaire helpers ────────────────────────────────────────────────────
  const addStakeholder = () => {
    if (!stakeholderForm.name.trim()) return;
    setStakeholders(prev => [...prev, { id: Date.now().toString(), ...stakeholderForm }]);
    setStakeholderForm({ name: '', role: STAKEHOLDER_ROLES[0], type: 'external' });
  };
  const getRating = (sId: string, iId: string, field: 'financial' | 'esg') =>
    ratings.find(r => r.stakeholderId === sId && r.issueId === iId)?.[field] ?? 5;
  const setRating = (sId: string, iId: string, field: 'financial' | 'esg', val: number) =>
    setRatings(prev => {
      const existing = prev.find(r => r.stakeholderId === sId && r.issueId === iId);
      if (existing) return prev.map(r => r.stakeholderId === sId && r.issueId === iId ? { ...r, [field]: val } : r);
      return [...prev, { stakeholderId: sId, issueId: iId, financial: 5, esg: 5, [field]: val }];
    });
  const applyQuestionnaire = async () => {
    const selectedIssues = issues.filter(i => selectedIssueIds.includes(i.id));
    const updates = selectedIssues.map(issue => {
      const issueRatings = ratings.filter(r => r.issueId === issue.id);
      if (issueRatings.length === 0) return null;
      const avgFin = Math.round((issueRatings.reduce((s, r) => s + r.financial, 0) / issueRatings.length) * 10);
      const avgEsg = Math.round((issueRatings.reduce((s, r) => s + r.esg, 0)      / issueRatings.length) * 10);
      return { ...issue, financial_impact: avgFin, esg_impact: avgEsg };
    }).filter(Boolean) as MaterialityIssue[];
    try {
      await Promise.all(updates.map(u => api.put(`/materiality/issues/${u.id}`, { name: u.name, description: u.description || '', category: u.category, financial_impact: u.financial_impact, esg_impact: u.esg_impact, stakeholders: u.stakeholders || '' })));
      toast.success(t('materiality.toastQuestApplied', { count: updates.length }));
      setQuestApplied(true); await loadAll();
    } catch { toast.error(t('materiality.toastQuestError')); }
  };

  // ── Suggestions IA ───────────────────────────────────────────────────────────
  const addSuggestion = async (s: typeof SECTORS[string][number]) => {
    try {
      await api.post('/materiality/issues', { name: s.name, description: s.description, category: s.category, financial_impact: s.financial_impact, esg_impact: s.esg_impact, stakeholders: '' });
      setAddedSuggestions(prev => new Set([...prev, s.name]));
      toast.success(t('materiality.toastAddedToMatrix', { name: s.name }));
      await loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || t('common.error')); }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = `${t('materiality.csvHeaderIssue')},${t('materiality.csvHeaderCategory')},${t('materiality.csvHeaderFinancial')},${t('materiality.csvHeaderEsg')},${t('materiality.csvHeaderQuadrant')},${t('materiality.csvHeaderMaterial')},${t('materiality.csvHeaderPriority')},${t('materiality.csvHeaderStakeholders')}\n`;
    const rows = issues.map(i => {
      const q = quadrant(i.financial_impact, i.esg_impact);
      return `"${i.name}","${catLabel(i.category)}",${i.financial_impact},${i.esg_impact},"${t(q.labelKey)}",${i.is_material ? t('materiality.csvYes') : t('materiality.csvNo')},"${i.priority}","${i.stakeholders || ''}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'matrice-materialite.csv'; a.click();
    URL.revokeObjectURL(url); toast.success(t('materiality.toastExportCsv'));
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total:         issues.length,
    material:      issues.filter(i => i.is_material).length,
    highPriority:  issues.filter(i => i.priority === 'high').length,
    env:           issues.filter(i => i.category === 'environmental').length,
    criticalRisks: risks.filter(r => r.severity === 'critical' || r.severity === 'high').length,
    // IRO stats
    impacts:       issues.filter(i => i.iro_type === 'impact').length,
    risksIRO:      issues.filter(i => i.iro_type === 'risk').length,
    opportunities: issues.filter(i => i.iro_type === 'opportunity').length,
    esrsLinked:    issues.filter(i => i.esrs_topic).length,
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner /></div>;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 -ml-24 -mb-24" />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20 mb-4">
              <Activity className="h-3.5 w-3.5" />
              {t('materiality.heroBadge')}
            </div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Grid className="h-9 w-9 opacity-90" />
              {t('materiality.title')}
            </h1>
            <p className="mt-2 text-indigo-200 max-w-xl">
              {t('materiality.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-sm font-medium transition-all">
              <Download className="h-4 w-4" /> {t('materiality.exportCsvBtn')}
            </button>
            <button onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('materiality.headerRefresh')}
            </button>
            {activeTab === 'matrix' && (
              <button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> {t('materiality.headerAddIssue')}
              </button>
            )}
            {activeTab === 'risks' && (
              <button onClick={() => setShowRiskModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> {t('materiality.headerAddRisk')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('materiality.kpiTotal'),         value: stats.total,         icon: Grid,        color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-400' },
          { label: t('materiality.kpiMaterial'),      value: stats.material,      icon: Target,      color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-400'    },
          { label: t('materiality.kpiHighPriority'),  value: stats.highPriority,  icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-400' },
          { label: t('materiality.kpiEnvironmental'), value: stats.env,           icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-400'  },
          { label: t('materiality.kpiCriticalRisks'), value: stats.criticalRisks, icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-400' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${border}`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 font-medium">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p></div>
              <div className={`p-2.5 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          { key: 'matrix',        label: t('materiality.tabMatrix'),         icon: Grid       },
          { key: 'questionnaire', label: t('materiality.tabQuestionnaire'),  icon: Users      },
          { key: 'suggestions',   label: t('materiality.tabIaSuggestions'),  icon: Sparkles   },
          { key: 'risks',         label: t('materiality.tabRisks'),          icon: ShieldAlert },
          { key: 'esrs',          label: 'Analyse ESRS',                     icon: Target      },
          { key: 'iros',          label: 'IROs CSRD',                        icon: FileText    },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === 'risks' && stats.criticalRisks > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">{stats.criticalRisks}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ MATRIX TAB ═══════════════════════════════════════════════════════ */}
      {activeTab === 'matrix' && (
        <>
          <div className="flex justify-end">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('matrix')} className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'matrix' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                <Grid className="h-4 w-4 inline mr-1.5" />{t('materiality.viewMatrix')}
              </button>
              <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                <List className="h-4 w-4 inline mr-1.5" />{t('materiality.viewList')}
              </button>
            </div>
          </div>

          {/* List view */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center"><Grid className="mx-auto h-12 w-12 text-gray-300 mb-3" /><p className="font-semibold text-gray-700">{t('materiality.noIssues')}</p></div>
              ) : issues.map(issue => {
                const q = quadrant(issue.financial_impact, issue.esg_impact);
                return (
                  <div key={issue.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${catDot(issue.category)}`} />
                          <h3 className="text-base font-semibold text-gray-900">{issue.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${q.bg} ${q.border} ${q.text}`}>{t(q.labelKey)}</span>
                          {issue.iro_type && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${IRO_CFG[issue.iro_type].bg} ${IRO_CFG[issue.iro_type].border} ${IRO_CFG[issue.iro_type].color}`}>
                              {IRO_CFG[issue.iro_type].icon} {iroLabel(issue.iro_type)}
                              {issue.iro_type === 'impact' && issue.iro_actual_or_potential && (
                                <span className="ml-1 opacity-70">({issue.iro_actual_or_potential === 'actual' ? t('materiality.iroActual', 'Avéré') : t('materiality.iroPotential', 'Potentiel')})</span>
                              )}
                            </span>
                          )}
                          {issue.esrs_topic && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                              {issue.esrs_topic}
                            </span>
                          )}
                        </div>
                        {issue.description && <p className="text-sm text-gray-500 mb-3">{issue.description}</p>}
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-gray-600">{t('materiality.listFinancialImpact')}</span>
                            <span className="text-sm font-bold text-orange-600">{issue.financial_impact}/100</span>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-gray-600">{t('materiality.listEsgImpact')}</span>
                            <span className="text-sm font-bold text-blue-600">{issue.esg_impact}/100</span>
                          </div>
                          <span className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${catBadge(issue.category)}`}>{catLabel(issue.category)}</span>
                        </div>
                        {issue.stakeholders && <p className="mt-2 text-xs text-gray-400">{t('materiality.listStakeholdersFull')} {issue.stakeholders}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleEdit(issue)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(issue.id, issue.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Matrix view with drag & drop */}
          {viewMode === 'matrix' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* ── LEFT PANEL ── */}
              <div className="space-y-4">

                {/* Assessment info card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                      <FileText className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{t('materiality.assessmentTitle', 'Évaluation en cours')}</h3>
                  </div>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>{t('materiality.reportingPeriod', 'Période de reporting')}</span>
                      <span className="font-semibold text-gray-900">{new Date().getFullYear() - 1} – {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('materiality.totalTopics', 'Enjeux identifiés')}</span>
                      <span className="font-semibold text-gray-900">{issues.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('materiality.materialTopics', 'Enjeux matériels')}</span>
                      <span className="font-semibold text-green-600">{issues.filter(i => i.is_material).length}</span>
                    </div>
                  </div>
                </div>

                {/* Category breakdown table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">{t('materiality.topicsByCategory', 'Enjeux par catégorie et matérialité')}</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-2 font-semibold text-gray-500">{t('materiality.colCategory', 'Catégorie')}</th>
                        <th className="text-center pb-2 font-semibold text-indigo-600">{t('materiality.colMaterial', 'Matériel')}</th>
                        <th className="text-center pb-2 font-semibold text-gray-400">{t('materiality.colNonMaterial', 'Non-mat.')}</th>
                        <th className="text-center pb-2 font-semibold text-gray-900">{t('materiality.colTotal', 'Total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { key: 'environmental', label: t('materiality.catEnvironmental'), color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                        { key: 'social',        label: t('materiality.catSocial'),        color: 'bg-blue-500',    textColor: 'text-blue-700'    },
                        { key: 'governance',    label: t('materiality.catGovernance'),    color: 'bg-purple-500',  textColor: 'text-purple-700'  },
                      ].map(cat => {
                        const all = issues.filter(i => normCat(i.category) === cat.key);
                        const mat = all.filter(i => i.is_material);
                        return (
                          <tr key={cat.key} className="hover:bg-gray-50/50">
                            <td className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                                <span className="font-medium text-gray-700">{cat.label}</span>
                              </div>
                            </td>
                            <td className="text-center py-2.5">
                              <span className={`font-bold ${mat.length > 0 ? cat.textColor : 'text-gray-300'}`}>{mat.length}</span>
                            </td>
                            <td className="text-center py-2.5 text-gray-400">{all.length - mat.length}</td>
                            <td className="text-center py-2.5 font-bold text-gray-700">{all.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 font-bold text-gray-900 text-xs">{t('materiality.total', 'Total')}</td>
                        <td className="text-center py-2 font-bold text-indigo-700">{issues.filter(i => i.is_material).length}</td>
                        <td className="text-center py-2 text-gray-400 font-semibold">{issues.filter(i => !i.is_material).length}</td>
                        <td className="text-center py-2 font-bold text-gray-900">{issues.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Topics table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">{t('materiality.topicsTable', 'Enjeux')}</h3>
                  <div className="overflow-y-auto max-h-80 -mx-1">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-gray-100">
                          <th className="text-left pb-2 pl-1 font-semibold text-gray-400 w-6">ID</th>
                          <th className="text-left pb-2 font-semibold text-gray-500">{t('materiality.colTopic', 'Enjeu')}</th>
                          <th className="text-center pb-2 font-semibold text-blue-500 w-12">🌍</th>
                          <th className="text-center pb-2 font-semibold text-orange-500 w-12">💰</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[...issues]
                          .sort((a, b) => (b.financial_impact + b.esg_impact) - (a.financial_impact + a.esg_impact))
                          .map((issue, idx) => {
                          const catColors: Record<string, string> = { environmental: 'bg-emerald-500', social: 'bg-blue-500', governance: 'bg-purple-500' };
                          const dotColor = catColors[normCat(issue.category)] ?? 'bg-gray-400';
                          return (
                            <tr
                              key={issue.id}
                              className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${issue.is_material ? 'bg-indigo-50/20' : ''}`}
                              onClick={() => handleEdit(issue)}
                            >
                              <td className="py-2 pl-1 text-gray-400 font-mono">{idx + 1}</td>
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                                  <span className={`line-clamp-1 ${issue.is_material ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{issue.name}</span>
                                </div>
                              </td>
                              <td className="text-center py-2">
                                <span className={`font-bold ${issue.esg_impact >= 60 ? 'text-blue-600' : 'text-gray-400'}`}>
                                  {(issue.esg_impact / 20).toFixed(1)}
                                </span>
                              </td>
                              <td className="text-center py-2">
                                <span className={`font-bold ${issue.financial_impact >= 60 ? 'text-orange-600' : 'text-gray-400'}`}>
                                  {(issue.financial_impact / 20).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {issues.length === 0 && (
                      <div className="text-center py-6 text-gray-400 text-xs">
                        <Grid className="mx-auto h-6 w-6 mb-2 opacity-30" />
                        {t('materiality.noIssues')}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="text-blue-500 font-bold">🌍</span> {t('materiality.impactScore', 'Impact (0-5)')}</span>
                    <span className="flex items-center gap-1"><span className="text-orange-500 font-bold">💰</span> {t('materiality.financialScore', 'Financier (0-5)')}</span>
                  </div>
                </div>
              </div>

              {/* ── RIGHT PANEL : Chart ── */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{t('materiality.matrixTitle2')}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="text-indigo-500 font-medium">✦ {t('materiality.dragTooltip')}</span> {t('materiality.matrixDragSubtitle')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    {[
                      { key: 'environmental', label: t('materiality.catEnvironmental'), dot: 'bg-emerald-500' },
                      { key: 'social',        label: t('materiality.catSocial'),        dot: 'bg-blue-500'    },
                      { key: 'governance',    label: t('materiality.catGovernance'),    dot: 'bg-purple-500'  },
                    ].map(c => (
                      <div key={c.key} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quadrant legend pills */}
                <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-full font-semibold text-red-700">🔴 {t('materiality.doubleMateriality', 'Double Matérialité CSRD')}</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full font-semibold text-blue-700">🌍 {t('materiality.impactMateriality', "Mat. d'impact")}</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full font-semibold text-orange-700">💰 {t('materiality.financialMateriality', 'Mat. financière')}</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-400">⚪ {t('materiality.notMaterial', 'Non matériel')}</span>
                </div>

                {/* Chart area */}
                <div
                  className="relative rounded-xl border-2 border-gray-100 bg-gradient-to-br from-slate-50 to-gray-50"
                  style={{ height: 480, padding: '40px 40px 48px 60px' }}
                >
                  {/* Quadrant backgrounds */}
                  <div className="absolute rounded-xl overflow-hidden pointer-events-none" style={{ inset: '34px 34px 42px 54px' }}>
                    <div className="absolute top-0 left-0 w-[60%] h-[40%] bg-blue-50/80 border-b border-r border-dashed border-blue-200/60" />
                    <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-red-50/90 border-b border-l border-dashed border-red-300" />
                    <div className="absolute bottom-0 right-0 w-[40%] h-[60%] bg-orange-50/70 border-t border-l border-dashed border-orange-200" />
                    <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-gray-50/20" />
                  </div>

                  {/* Median reference lines */}
                  {issues.length > 1 && (() => {
                    const medFin = [...issues].sort((a, b) => a.financial_impact - b.financial_impact)[Math.floor(issues.length / 2)]?.financial_impact ?? 50;
                    const medEsg = [...issues].sort((a, b) => a.esg_impact - b.esg_impact)[Math.floor(issues.length / 2)]?.esg_impact ?? 50;
                    return (
                      <div className="absolute pointer-events-none" style={{ inset: '34px 34px 42px 54px' }}>
                        {/* Vertical median line (financial) */}
                        <div className="absolute top-0 bottom-0" style={{ left: `${medFin}%`, borderLeft: '1.5px dashed #f97316', opacity: 0.6 }}>
                          <span className="absolute top-1 left-1 text-[9px] text-orange-500 font-semibold whitespace-nowrap bg-white/80 px-0.5 rounded">
                            Médiane Fin. {(medFin / 20).toFixed(1)}
                          </span>
                        </div>
                        {/* Horizontal median line (esg) */}
                        <div className="absolute left-0 right-0" style={{ bottom: `${medEsg}%`, borderTop: '1.5px dashed #3b82f6', opacity: 0.6 }}>
                          <span className="absolute -top-3.5 right-1 text-[9px] text-blue-500 font-semibold whitespace-nowrap bg-white/80 px-0.5 rounded">
                            Médiane Impact {(medEsg / 20).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Threshold lines (fixed at 60%) */}
                  <div className="absolute pointer-events-none" style={{ inset: '34px 34px 42px 54px' }}>
                    <div className="absolute w-px bg-orange-300/50 top-0 bottom-0" style={{ left: '60%', borderLeft: '1px solid rgba(251,146,60,0.4)' }} />
                    <div className="absolute h-px bg-blue-300/50 left-0 right-0" style={{ bottom: '40%', borderTop: '1px solid rgba(96,165,250,0.4)' }} />
                  </div>

                  {/* Plot area */}
                  <div
                    ref={plotRef}
                    className="relative h-full"
                    style={{ cursor: draggingId ? 'grabbing' : 'default', userSelect: 'none' }}
                    onMouseMove={handlePlotMouseMove}
                    onMouseUp={handlePlotMouseUp}
                    onMouseLeave={handlePlotMouseUp}
                  >
                    {issues.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center px-6">
                        <div className="text-center max-w-sm">
                          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 mb-3">
                            <Grid className="h-7 w-7 text-purple-500" />
                          </div>
                          <p className="text-gray-700 font-semibold mb-1">{t('materiality.emptyMatrixLine1')}</p>
                          <p className="text-gray-400 text-xs mb-4">{t('materiality.emptyMatrixLine2')}</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button type="button" onClick={() => setShowModal(true)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-colors">
                              <Plus className="h-4 w-4" /> {t('materiality.addIssue', 'Ajouter un enjeu')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : issues.map((issue, idx) => {
                      const catDotColors: Record<string, string> = { environmental: '#10b981', social: '#3b82f6', governance: '#8b5cf6' };
                      const dotColor = catDotColors[normCat(issue.category)] ?? '#6b7280';
                      const bubbleSize = Math.max(18, Math.min(38, 14 + Math.sqrt((issue.financial_impact + issue.esg_impact)) * 1.4));
                      return (
                        <div
                          key={issue.id}
                          className="absolute group"
                          style={{
                            left: `${issue.financial_impact}%`,
                            bottom: `${issue.esg_impact}%`,
                            transform: 'translate(-50%, 50%)',
                            zIndex: draggingId === issue.id ? 50 : 20,
                          }}
                          onMouseDown={e => handleDotMouseDown(e, issue.id)}
                          onClick={() => !draggingId && handleEdit(issue)}
                        >
                          {/* Bubble */}
                          <div
                            className="rounded-full shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing"
                            style={{
                              width: bubbleSize,
                              height: bubbleSize,
                              backgroundColor: dotColor,
                              opacity: issue.is_material ? 0.9 : 0.45,
                              boxShadow: issue.is_material
                                ? `0 0 0 3px white, 0 0 0 5px ${dotColor}55, 0 4px 12px ${dotColor}40`
                                : `0 2px 8px ${dotColor}30`,
                              transform: draggingId === issue.id ? 'scale(1.4)' : 'scale(1)',
                            }}
                          />

                          {/* Number label on bubble */}
                          {bubbleSize >= 24 && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white pointer-events-none select-none">
                              {idx + 1}
                            </span>
                          )}

                          {/* Hover tooltip */}
                          {draggingId !== issue.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 bg-white rounded-xl shadow-2xl border border-gray-100 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-left">
                              <p className="font-bold text-gray-900 text-sm mb-2">{issue.name}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                <div className="bg-blue-50 rounded-lg p-2 text-center">
                                  <p className="text-gray-500 mb-0.5">{t('materiality.impactMat', "Mat. d'Impact")}</p>
                                  <p className="text-lg font-bold text-blue-600">{(issue.esg_impact / 20).toFixed(1)}</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-2 text-center">
                                  <p className="text-gray-500 mb-0.5">{t('materiality.financialMat', 'Mat. Financière')}</p>
                                  <p className="text-lg font-bold text-orange-600">{(issue.financial_impact / 20).toFixed(1)}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                                  <span className="text-gray-500 capitalize">{catLabel(issue.category)}</span>
                                </div>
                                {issue.is_material && (
                                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-bold text-[10px] border border-red-200">● Matériel</span>
                                )}
                              </div>
                              {issue.esrs_topic && (
                                <div className="mt-1.5 text-[10px] text-indigo-600 font-semibold">{issue.esrs_topic}</div>
                              )}
                            </div>
                          )}

                          {/* Drag tooltip */}
                          {draggingId === issue.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 px-2 py-1 bg-indigo-600 text-white text-[11px] rounded-lg whitespace-nowrap shadow-lg z-50">
                              Fin: {(issue.financial_impact / 20).toFixed(1)} · Impact: {(issue.esg_impact / 20).toFixed(1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Axis labels */}
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
                    <p className="text-[11px] font-semibold text-blue-600 whitespace-nowrap tracking-wide">
                      ↑ {t('materiality.axisY', "Matérialité d'impact")}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                    <p className="text-[11px] font-semibold text-orange-600 tracking-wide">
                      {t('materiality.axisX', "Matérialité financière")} →
                    </p>
                  </div>

                  {/* Y-axis ticks */}
                  <div className="absolute left-10 top-[34px] bottom-[42px] flex flex-col justify-between pointer-events-none">
                    {[5, 4, 3, 2, 1, 0].map(v => (
                      <span key={v} className="text-[9px] text-gray-400 font-mono leading-none">{v}.0</span>
                    ))}
                  </div>
                  {/* X-axis ticks */}
                  <div className="absolute bottom-6 left-[54px] right-[34px] flex justify-between pointer-events-none">
                    {[0, 1, 2, 3, 4, 5].map(v => (
                      <span key={v} className="text-[9px] text-gray-400 font-mono">{v}.0</span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400 text-center">✦ {t('materiality.matrixDragHint')}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ QUESTIONNAIRE TAB ════════════════════════════════════════════════ */}
      {activeTab === 'questionnaire' && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[t('materiality.stepStakeholders'), t('materiality.stepIssues'), t('materiality.stepRatings'), t('materiality.stepResults')].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${i <= questStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < questStep ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i === questStep ? 'text-indigo-700' : 'text-gray-400'}`}>{label}</span>
                {i < 3 && <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Step 0: Add stakeholders */}
          {questStep === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" /> {t('materiality.step0HeadingFull')}</h3>
              <p className="text-sm text-gray-500 mb-5">{t('materiality.step0DescFull')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <input value={stakeholderForm.name} onChange={e => setStakeholderForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={t('materiality.stakeholderNamePlaceholder')} className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <select value={stakeholderForm.role} onChange={e => setStakeholderForm(p => ({ ...p, role: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
                  {STAKEHOLDER_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <select value={stakeholderForm.type} onChange={e => setStakeholderForm(p => ({ ...p, type: e.target.value as 'internal' | 'external' }))}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="internal">{t('materiality.stakeholderInternal')}</option>
                  <option value="external">{t('materiality.stakeholderExternal')}</option>
                </select>
              </div>
              <button onClick={addStakeholder} className="mb-5"><Plus className="h-4 w-4 mr-1" /> {t('materiality.addStakeholder')}</button>
              {stakeholders.length > 0 && (
                <div className="space-y-2 mb-5">
                  {stakeholders.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${s.type === 'internal' ? 'bg-indigo-500' : 'bg-purple-500'}`}>{s.name.charAt(0).toUpperCase()}</div>
                        <div><p className="text-sm font-semibold text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.role} · {s.type === 'internal' ? t('materiality.stakeholderInternal') : t('materiality.stakeholderExternal')}</p></div>
                      </div>
                      <button onClick={() => setStakeholders(p => p.filter(x => x.id !== s.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              {stakeholders.length === 0 && (
                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-5">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{t('materiality.noStakeholdersAdded')}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => setQuestStep(1)} disabled={stakeholders.length === 0}>{t('materiality.nextStep')} <ChevronRight className="h-4 w-4 ml-1" /></button>
              </div>
            </div>
          )}

          {/* Step 1: Select issues */}
          {questStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> {t('materiality.step1HeadingFull')}</h3>
              <p className="text-sm text-gray-500 mb-5">{t('materiality.step1DescFull')}</p>
              {issues.length === 0 ? (
                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-5">
                  <p className="text-sm">{t('materiality.noIssuesInMatrix')}</p>
                </div>
              ) : (
                <div className="space-y-2 mb-5">
                  <label className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-xl cursor-pointer border border-indigo-100">
                    <input type="checkbox" checked={selectedIssueIds.length === issues.length}
                      onChange={e => setSelectedIssueIds(e.target.checked ? issues.map(i => i.id) : [])}
                      className="w-4 h-4 rounded text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">{t('materiality.selectAllCount', { count: issues.length })}</span>
                  </label>
                  {issues.map(issue => (
                    <label key={issue.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all">
                      <input type="checkbox" checked={selectedIssueIds.includes(issue.id)}
                        onChange={e => setSelectedIssueIds(p => e.target.checked ? [...p, issue.id] : p.filter(id => id !== issue.id))}
                        className="w-4 h-4 rounded text-indigo-600 flex-shrink-0" />
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catDot(issue.category)}`} />
                      <span className="text-sm text-gray-800 font-medium">{issue.name}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${catBadge(issue.category)}`}>{catLabel(issue.category)}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <button onClick={() => setQuestStep(0)}><ChevronLeft className="h-4 w-4 mr-1" /> {t('materiality.prevStep')}</button>
                <button onClick={() => { setQuestStep(2); setRatings(stakeholders.flatMap(s => selectedIssueIds.map(iId => ({ stakeholderId: s.id, issueId: iId, financial: 5, esg: 5 })))); }} disabled={selectedIssueIds.length === 0}>
                  {t('materiality.nextStep')} <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter ratings */}
          {questStep === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2"><Target className="h-5 w-5 text-indigo-500" /> {t('materiality.step2HeadingFull')}</h3>
                <p className="text-sm text-gray-500">{t('materiality.step2DescFull')}</p>
              </div>
              {stakeholders.map(s => (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" key={s.id}>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${s.type === 'internal' ? 'bg-indigo-500' : 'bg-purple-500'}`}>{s.name.charAt(0).toUpperCase()}</div>
                    <div><p className="font-bold text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.role}</p></div>
                  </div>
                  <div className="space-y-4">
                    {selectedIssueIds.map(iId => {
                      const issue = issues.find(i => i.id === iId);
                      if (!issue) return null;
                      return (
                        <div key={iId} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${catDot(issue.category)}`} />
                            <span className="text-sm font-medium text-gray-800">{issue.name}</span>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">{t('materiality.ratingFinancial')}: <span className="font-bold text-orange-600">{getRating(s.id, iId, 'financial')}/10</span></label>
                            <input type="range" min="1" max="10" value={getRating(s.id, iId, 'financial')}
                              onChange={e => setRating(s.id, iId, 'financial', Number(e.target.value))}
                              className="w-full accent-orange-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">{t('materiality.ratingEsg')}: <span className="font-bold text-blue-600">{getRating(s.id, iId, 'esg')}/10</span></label>
                            <input type="range" min="1" max="10" value={getRating(s.id, iId, 'esg')}
                              onChange={e => setRating(s.id, iId, 'esg', Number(e.target.value))}
                              className="w-full accent-blue-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-between">
                <button onClick={() => setQuestStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> {t('materiality.prevStep')}</button>
                <button onClick={() => setQuestStep(3)}>{t('materiality.viewResults')} <ChevronRight className="h-4 w-4 ml-1" /></button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {questStep === 3 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> {t('materiality.step3HeadingFull')}</h3>
                <p className="text-sm text-gray-500 mb-5">{t('materiality.step3DescFull', { count: stakeholders.length })}</p>
                <div className="space-y-3">
                  {selectedIssueIds.map(iId => {
                    const issue = issues.find(i => i.id === iId);
                    if (!issue) return null;
                    const issueRatings = ratings.filter(r => r.issueId === iId);
                    const avgFin = issueRatings.length > 0 ? Math.round((issueRatings.reduce((s, r) => s + r.financial, 0) / issueRatings.length) * 10) : issue.financial_impact;
                    const avgEsg = issueRatings.length > 0 ? Math.round((issueRatings.reduce((s, r) => s + r.esg, 0)      / issueRatings.length) * 10) : issue.esg_impact;
                    const q = quadrant(avgFin, avgEsg);
                    return (
                      <div key={iId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catDot(issue.category)}`} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{issue.name}</p>
                          <p className={`text-xs mt-0.5 font-medium ${q.text}`}>{t(q.labelKey)}</p>
                        </div>
                        <div className="flex gap-3 text-center">
                          <div className="bg-orange-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-500">{t('materiality.resultFinancial')}</p>
                            <p className="text-sm font-bold text-orange-600">{avgFin}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-500">{t('materiality.resultEsg')}</p>
                            <p className="text-sm font-bold text-blue-600">{avgEsg}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setQuestStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> {t('materiality.prevStep')}</button>
                {questApplied ? (
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    <CheckCircle className="h-5 w-5" /> {t('materiality.matrixUpdated')}
                  </div>
                ) : (
                  <button onClick={applyQuestionnaire} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-1" /> {t('materiality.applyToMatrix')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SUGGESTIONS IA TAB ═══════════════════════════════════════════════ */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">{t('materiality.iaTabSectorTitle')}</h3>
                <p className="text-sm text-gray-500">{t('materiality.iaTabSectorDesc')}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(SECTORS).map(s => (
                <button key={s} onClick={() => setSelectedSector(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedSector === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTORS[selectedSector].map((s, idx) => {
              const already  = issues.some(i => i.name === s.name);
              const justAdded = addedSuggestions.has(s.name);
              const q = quadrant(s.financial_impact, s.esg_impact);
              return (
                <div key={idx} className={`flex flex-col p-5 bg-white rounded-2xl border-2 transition-all ${already || justAdded ? 'border-green-200 bg-green-50/30' : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${catDot(s.category)}`} />
                      <h4 className="text-sm font-bold text-gray-900">{s.name}</h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${catBadge(s.category)}`}>{catLabel(s.category)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 flex-1">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="bg-orange-50 rounded-lg px-2.5 py-1.5 text-center">
                        <p className="text-[10px] text-gray-500">{t('materiality.tooltipFin')}</p>
                        <p className="text-xs font-bold text-orange-600">{s.financial_impact}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg px-2.5 py-1.5 text-center">
                        <p className="text-[10px] text-gray-500">ESG</p>
                        <p className="text-xs font-bold text-blue-600">{s.esg_impact}</p>
                      </div>
                      <div className={`rounded-lg px-2.5 py-1.5 text-center ${q.bg}`}>
                        <p className="text-[10px] text-gray-500">{t('materiality.suggZone')}</p>
                        <p className={`text-[10px] font-bold ${q.text}`}>{t(q.labelKey)}</p>
                      </div>
                    </div>
                    {already || justAdded ? (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
                        <CheckCircle className="h-4 w-4" /> {t('materiality.iaSuggAdded')}
                      </div>
                    ) : (
                      <button onClick={() => addSuggestion(s)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200 hover:shadow-indigo-300">
                        <Plus className="h-3.5 w-3.5" /> {t('common.add')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('materiality.iaBenchmarkTitle')}</p>
                <p className="text-xs text-amber-700 mt-1">{t('materiality.iaBenchmarkDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RISKS TAB ════════════════════════════════════════════════════════ */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          {risks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">{t('materiality.riskEmptyTitle')}</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">{t('materiality.riskEmptyDescFull')}</p>
              <button onClick={() => setShowRiskModal(true)}><Plus className="h-4 w-4 mr-2" />{t('materiality.riskEmptyAddFirst')}</button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" />{t('materiality.riskOverviewTitle')}</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(SEV).map(([key, cfg]) => (
                    <div key={key} className={`rounded-lg p-3 border ${cfg.bg} ${cfg.border}`}>
                      <p className={`text-xs font-medium ${cfg.color}`}>{t(cfg.labelKey)}</p>
                      <p className={`text-2xl font-bold ${cfg.color}`}>{risks.filter(r => r.severity === key).length}</p>
                    </div>
                  ))}
                </div>
              </div>
              {risks.sort((a, b) => b.risk_score - a.risk_score).map(risk => {
                const sev = (SEV as any)[risk.severity] || SEV.low;
                return (
                  <div key={risk.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${sev.border} hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sev.bg} ${sev.color} border ${sev.border}`}>{t(sev.labelKey)}</span>
                          <h3 className="text-base font-semibold text-gray-900">{risk.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catBadge(risk.category)}`}>{catLabel(risk.category)}</span>
                        </div>
                        {risk.description && <p className="text-sm text-gray-500 mb-3">{risk.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
                            {t('materiality.riskProbabilityLabel')} <div className="flex gap-0.5 mx-1">{[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= risk.probability ? 'bg-indigo-500' : 'bg-gray-200'}`} />)}</div>
                            <span className="font-bold text-indigo-600">{risk.probability}/5</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
                            {t('materiality.riskImpactLabel')} <div className="flex gap-0.5 mx-1">{[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= risk.impact ? 'bg-orange-500' : 'bg-gray-200'}`} />)}</div>
                            <span className="font-bold text-orange-600">{risk.impact}/5</span>
                          </div>
                          <div className="bg-gray-50 rounded px-2.5 py-1.5 font-semibold">{t('materiality.riskScoreLabel')} <span className={sev.color}>{risk.risk_score}/25</span></div>
                          {risk.responsible_person && <div className="text-gray-500">{t('materiality.riskOwnerLabel')} <span className="font-medium text-gray-700">{risk.responsible_person}</span></div>}
                        </div>
                        {risk.mitigation_plan && (
                          <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-xs font-semibold text-indigo-700 mb-0.5">{t('materiality.riskMitigationPlan')}</p>
                            <p className="text-xs text-indigo-600">{risk.mitigation_plan}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleRiskEdit(risk)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleRiskDelete(risk.id, risk.title)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ ESRS GAP ANALYSIS TAB ═══════════════════════════════════════════ */}
      {activeTab === 'esrs' && (() => {
        const ESRS_TOPICS = [
          {
            code: 'E1', name: 'Changement climatique', pillar: 'environmental',
            kws: ['co2','carbone','ges','ghg','scope','émission','énergie','climat','transition'],
            disclosures: ['E1-1 : Plan de transition vers une économie bas-carbone', 'E1-4 : Objectifs de réduction des émissions GES', 'E1-5 : Consommation & mix énergétique (EnR)', 'E1-6 : Émissions Scope 1, Scope 2 & Scope 3', 'E1-9 : Effets financiers des risques et opportunités climatiques'],
          },
          {
            code: 'E2', name: 'Pollution', pillar: 'environmental',
            kws: ['pollution','polluant','rejet','atmosphérique','contamination','sol','substance'],
            disclosures: ['E2-1 : Politiques relatives à la pollution', 'E2-3 : Cibles de réduction des émissions polluantes', 'E2-4 : Pollution de l\'air, de l\'eau et des sols', 'E2-6 : Effets financiers potentiels des incidents de pollution'],
          },
          {
            code: 'E3', name: 'Ressources hydriques & marines', pillar: 'environmental',
            kws: ['eau','hydrique','water','marine','ressource','prélèvement'],
            disclosures: ['E3-1 : Politiques de gestion de l\'eau et des ressources marines', 'E3-4 : Consommation d\'eau par source et zone de stress hydrique', 'E3-5 : Effets financiers potentiels des risques liés à l\'eau'],
          },
          {
            code: 'E4', name: 'Biodiversité & écosystèmes', pillar: 'environmental',
            kws: ['biodiversité','écosystème','faune','flore','sol','protégé','artificialisé'],
            disclosures: ['E4-1 : Plan de transition & politiques biodiversité', 'E4-2 : Impacts et dépendances sur les écosystèmes', 'E4-4 : Indicateurs de biodiversité (alignés TNFD)', 'E4-6 : Effets financiers des risques liés à la biodiversité'],
          },
          {
            code: 'E5', name: 'Utilisation des ressources & économie circulaire', pillar: 'environmental',
            kws: ['déchet','recyclage','circulaire','réemploi','emballage','matière'],
            disclosures: ['E5-1 : Politiques d\'économie circulaire', 'E5-3 : Cibles de réduction des déchets', 'E5-4 : Flux de matières (intrants / extrants)', 'E5-5 : Déchets générés, valorisés et éliminés'],
          },
          {
            code: 'S1', name: 'Effectifs de l\'entreprise', pillar: 'social',
            kws: ['effectif','salarié','employé','accident','turnover','formation','parité','diversité','rémunération','santé','sécurité'],
            disclosures: ['S1-6 : Caractéristiques des effectifs (CDI, CDD, temps partiel)', 'S1-9 : Taux de diversité — genre, âge, handicap', 'S1-14 : Santé & sécurité (accidents, maladies pro)', 'S1-16 : Indicateurs d\'écarts de rémunération (gender pay gap)'],
          },
          {
            code: 'S2', name: 'Travailleurs de la chaîne de valeur', pillar: 'social',
            kws: ['fournisseur','chaîne','supply','sous-traitant','vigilance','prestataire'],
            disclosures: ['S2-1 : Politiques de diligence raisonnable fournisseurs', 'S2-2 : Processus d\'engagement avec les travailleurs de la chaîne', 'S2-4 : Mesures correctives prises sur les impacts négatifs', 'S2-5 : Objectifs relatifs à la chaîne de valeur'],
          },
          {
            code: 'S3', name: 'Communautés affectées', pillar: 'social',
            kws: ['communauté','local','territoire','riverain','mécénat','ancrage'],
            disclosures: ['S3-1 : Politiques relatives aux communautés locales', 'S3-2 : Processus de consultation et d\'engagement', 'S3-4 : Actions visant à supprimer les impacts négatifs sur les communautés'],
          },
          {
            code: 'S4', name: 'Consommateurs & utilisateurs finaux', pillar: 'social',
            kws: ['consommateur','client','satisfaction','réclamation','qualité','produit'],
            disclosures: ['S4-1 : Politiques de protection des consommateurs', 'S4-2 : Mécanismes de recours et de réclamation', 'S4-4 : Mesures relatives à la sécurité des produits & services'],
          },
          {
            code: 'G1', name: 'Conduite des affaires', pillar: 'governance',
            kws: ['gouvernance','éthique','anticorruption','conformité','fiscalité','transparence','alerte','whistleblowing'],
            disclosures: ['G1-1 : Culture d\'entreprise & politiques anticorruption', 'G1-2 : Gestion des relations avec les fournisseurs', 'G1-3 : Incidents de corruption avérés ou allégués', 'G1-4 : Amendes & sanctions pour infractions légales', 'G1-6 : Transparence des paiements aux administrations fiscales'],
          },
        ];

        const covered = ESRS_TOPICS.map(topic => {
          const matchingIssues = issues.filter(issue => {
            const text = ((issue.name || '') + ' ' + (issue.description || '')).toLowerCase();
            const catMatch = issue.category === topic.pillar;
            const kwMatch = topic.kws.some(kw => text.includes(kw));
            return catMatch && (kwMatch || issues.filter(i => i.category === topic.pillar).some(i => topic.kws.some(kw => ((i.name || '') + ' ' + (i.description || '')).toLowerCase().includes(kw))));
          });
          const directMatch = issues.filter(issue => {
            const text = ((issue.name || '') + ' ' + (issue.description || '')).toLowerCase();
            return topic.kws.some(kw => text.includes(kw));
          });
          return { ...topic, covered: directMatch.length > 0, matchCount: directMatch.length, material: directMatch.some(i => i.is_material) };
        });

        const coveredCount = covered.filter(t => t.covered).length;
        const materialCount = covered.filter(t => t.material).length;
        const coveragePct = Math.round((coveredCount / ESRS_TOPICS.length) * 100);

        const pillarGroups = [
          { label: 'Environnement (E1–E5)', topics: covered.filter(t => t.pillar === 'environmental'), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
          { label: 'Social (S1–S4)',        topics: covered.filter(t => t.pillar === 'social'),        color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-500'  },
          { label: 'Gouvernance (G1)',      topics: covered.filter(t => t.pillar === 'governance'),    color: 'text-purple-700',bg: 'bg-purple-50',border: 'border-purple-200',dot: 'bg-purple-500'},
        ];

        const exportDMA = () => {
          const rows = ['Section ESRS,Thématique,Couverte,Matérielle,Issues identifiées'];
          covered.forEach(t => rows.push(`${t.code},"${t.name}",${t.covered ? 'Oui' : 'Non'},${t.material ? 'Oui' : 'Non'},${t.matchCount}`));
          const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'analyse_esrs_dma.csv'; a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="space-y-6">
            {/* KPIs DMA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border-2 bg-indigo-50 border-indigo-200 p-5">
                <div className="text-3xl font-extrabold text-indigo-700">{coveredCount}<span className="text-lg font-bold text-indigo-400">/{ESRS_TOPICS.length}</span></div>
                <div className="text-sm font-semibold text-gray-700 mt-1">Topics ESRS couverts</div>
                <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-1.5 bg-indigo-500 rounded-full transition-all" style={{ width: `${coveragePct}%` }} />
                </div>
              </div>
              <div className={`rounded-2xl border-2 p-5 ${coveragePct >= 80 ? 'bg-green-50 border-green-200' : coveragePct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`text-3xl font-extrabold ${coveragePct >= 80 ? 'text-green-700' : coveragePct >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{coveragePct}%</div>
                <div className="text-sm font-semibold text-gray-700 mt-1">{t('materiality.dmaCoverageRate', 'Taux de couverture DMA')}</div>
                <div className={`mt-2 text-xs font-medium ${coveragePct >= 80 ? 'text-green-600' : coveragePct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {coveragePct >= 80 ? t('materiality.csrdReady', '✅ Prêt pour CSRD') : coveragePct >= 60 ? t('materiality.csrdToComplete', '⚠️ À compléter') : t('materiality.csrdInsufficient', '❌ Insuffisant')}
                </div>
              </div>
              <div className="rounded-2xl border-2 bg-red-50 border-red-200 p-5">
                <div className="text-3xl font-extrabold text-red-700">{materialCount}</div>
                <div className="text-sm font-semibold text-gray-700 mt-1">{t('materiality.doublyMaterialTopics', 'Topics doublement matériels')}</div>
                <div className="mt-2 text-xs text-red-500 font-medium">{materialCount > 0 ? t('materiality.csrdMandatory', 'Divulgation obligatoire CSRD') : t('materiality.noneYet', 'Aucun encore identifié')}</div>
              </div>
              <div className="rounded-2xl border-2 bg-gray-50 border-gray-200 p-5">
                <div className="text-3xl font-extrabold text-gray-600">{ESRS_TOPICS.length - coveredCount}</div>
                <div className="text-sm font-semibold text-gray-700 mt-1">{t('materiality.topicsToComplete', 'Topics à compléter')}</div>
                <div className="mt-2 text-xs text-gray-400 font-medium">{ESRS_TOPICS.length - coveredCount === 0 ? t('materiality.allCovered', '🎉 Tous couverts !') : t('materiality.seeActionPlan', "Voir plan d'action ci-dessous")}</div>
              </div>
            </div>

            {/* Coverage bar */}
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{t('materiality.globalCsrdCoverage', 'Couverture CSRD globale')}</h3>
                <button onClick={exportDMA} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Export DMA CSV
                </button>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className="h-3 bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${coveragePct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>0%</span><span className="font-semibold text-indigo-700">{t('materiality.coveredPct', '{{pct}}% couverts', { pct: coveragePct })}</span><span>100%</span>
              </div>
              <div className={`mt-3 p-3 rounded-xl text-sm border flex items-start gap-2 ${
                coveragePct >= 80 ? 'bg-green-50 border-green-200 text-green-800'
                : coveragePct >= 60 ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <span className="text-base leading-none flex-shrink-0">{coveragePct >= 80 ? '✅' : coveragePct >= 60 ? '⚠️' : '❌'}</span>
                <div>
                  {coveragePct >= 80
                    ? t('materiality.coverageSolid', 'Couverture ESRS solide — votre DMA couvre les principales thématiques pour un rapport CSRD de première divulgation.')
                    : coveragePct >= 60
                    ? t('materiality.coveragePartial', 'Couverture partielle — complétez les topics manquants avant la soumission de votre CSRD.')
                    : t('materiality.coverageInsufficient', 'Couverture insuffisante — au moins 6/10 topics ESRS doivent être couverts. Utilisez Suggestions IA ou le Questionnaire pour identifier vos enjeux matériels.')
                  }
                </div>
              </div>
            </div>

            {/* Topic breakdown by pillar */}
            {pillarGroups.map(pg => (
              <div key={pg.label} className={`bg-white border-2 ${pg.border} rounded-2xl overflow-hidden`}>
                <div className={`px-5 py-3 ${pg.bg} border-b ${pg.border}`}>
                  <h3 className={`font-bold ${pg.color}`}>{pg.label}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {pg.topics.map(topic => (
                    <details key={topic.code} className="group">
                      <summary className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-50/70 transition-colors list-none select-none">
                        {/* Code badge */}
                        <div className="flex items-center gap-2 w-16 flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pg.bg} ${pg.color}`}>{topic.code}</span>
                        </div>
                        {/* Name + match count */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-900">{topic.name}</span>
                          {topic.matchCount > 0 && (
                            <span className="ml-2 text-xs text-gray-400">{topic.matchCount} enjeu{topic.matchCount > 1 ? 'x' : ''} identifié{topic.matchCount > 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {/* Badges + expand hint */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {topic.material && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold border border-red-200">{t('materiality.material', 'Matériel')}</span>}
                          {topic.covered
                            ? <span className="flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-100 px-2.5 py-1 rounded-full border border-green-200"><CheckCircle className="h-3.5 w-3.5" /> {t('materiality.covered', 'Couvert')}</span>
                            : <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200"><AlertCircle className="h-3.5 w-3.5" /> {t('materiality.toComplete', 'À compléter')}</span>
                          }
                          <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-open:rotate-90 transition-transform flex-shrink-0" />
                        </div>
                      </summary>

                      {/* Disclosure requirements */}
                      <div className={`px-5 pb-4 pt-2 border-t ${pg.border} ${pg.bg} bg-opacity-30`}>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('materiality.csrdDisclosures', 'Divulgations requises par la CSRD')}</p>
                        <div className="space-y-1.5">
                          {(topic as any).disclosures?.map((d: string, di: number) => (
                            <div key={di} className="flex items-start gap-2">
                              <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${pg.dot}`} />
                              <span className="text-xs text-gray-600">{d}</span>
                            </div>
                          ))}
                        </div>
                        {!topic.covered && (
                          <button
                            onClick={() => setActiveTab('suggestions')}
                            className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${pg.bg} ${pg.color} border ${pg.border} hover:opacity-80 transition-opacity`}
                          >
                            <Plus className="h-3 w-3" /> {t('materiality.addIssueViaSuggestions', 'Ajouter un enjeu {{code}} via les suggestions', { code: topic.code })}
                          </button>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}

            {/* Plan d'action — topics à compléter */}
            {coveredCount < ESRS_TOPICS.length && (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-indigo-900">{t('materiality.actionPlanTitle', "Plan d'action — Topics ESRS à compléter")}</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-600 text-white rounded-full">{ESRS_TOPICS.length - coveredCount} restant{ESRS_TOPICS.length - coveredCount > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {covered.filter(tp => !tp.covered).map(tp => (
                    <div key={tp.code} className="flex items-center justify-between px-4 py-2.5 bg-white border border-indigo-100 rounded-xl hover:border-indigo-300 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          tp.pillar === 'environmental' ? 'bg-emerald-100 text-emerald-700'
                          : tp.pillar === 'social' ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                        }`}>{tp.code}</span>
                        <span className="text-sm font-medium text-gray-800">{tp.name}</span>
                      </div>
                      <button onClick={() => setActiveTab('suggestions')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors opacity-0 group-hover:opacity-100">
                        <Plus className="h-3 w-3" /> {t('materiality.suggestIssues', 'Suggérer des enjeux')}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-indigo-500 mt-3 flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" /> {t('materiality.hoverTopicHint', 'Survolez un topic et cliquez pour accéder aux suggestions IA sectorielles correspondantes.')}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ IROs CSRD TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'iros' && (
        <div className="space-y-6">
          {/* IRO KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { label: t('materiality.iroImpactLabel', 'Impact') + 's', count: stats.impacts,       icon: '⚡', color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-300' },
              { label: t('materiality.iroRiskLabel', 'Risque') + 's',   count: stats.risksIRO,      icon: '⚠️', color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-300'   },
              { label: t('materiality.iroOpportunityLabel', 'Opportunité') + 's', count: stats.opportunities, icon: '🚀', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
              { label: t('materiality.esrsLinkedLabel', 'Liés à un topic ESRS'), count: stats.esrsLinked, icon: '🔗', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300' },
            ]).map(k => (
              <div key={k.label} className={`rounded-2xl border-2 p-5 ${k.bg} ${k.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{k.icon}</span>
                  <span className={`text-3xl font-extrabold ${k.color}`}>{k.count}</span>
                </div>
                <div className="text-sm font-semibold text-gray-700">{k.label}</div>
                <div className="text-xs text-gray-500 mt-1">{t('materiality.outOfIssues', 'sur {{n}} enjeux', { n: stats.total })}</div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <span className="text-base mt-0.5">ℹ️</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              {t('materiality.iroDisclaimerFull', "Double matérialité CSRD (ESRS 1 §43) — Chaque enjeu matériel doit être qualifié comme Impact (avéré ou potentiel, positif ou négatif), Risque financier et/ou Opportunité financière. Classifiez vos enjeux ci-dessous, puis liez-les au topic ESRS correspondant pour générer votre DMA.")}
            </p>
          </div>

          {/* IRO by ESRS topic */}
          {ESRS_TOPICS_LIST.map(code => {
            const topicIssues = issues.filter(i => i.esrs_topic === code);
            const unlinked = issues.filter(i => !i.esrs_topic);
            if (code === ESRS_TOPICS_LIST[0] && unlinked.length === 0 && topicIssues.length === 0) return null;
            return (
              <div key={code} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-wide bg-indigo-600 text-white">{code}</span>
                    <span className="font-semibold text-gray-900">{esrsTopicLabel(code)}</span>
                    <span className="text-xs text-gray-400">{topicIssues.length} enjeu{topicIssues.length !== 1 ? 'x' : ''}</span>
                  </div>
                  <button onClick={() => { setFormData(f => ({ ...f, esrs_topic: code })); setShowModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors">
                    <Plus className="h-3 w-3" /> {t('materiality.addIssue', 'Ajouter un enjeu')}
                  </button>
                </div>
                {topicIssues.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-400">{t('materiality.noIssueForTopic', 'Aucun enjeu lié à {{code}} — cliquez sur « Ajouter » ou modifiez un enjeu existant.', { code })}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {topicIssues.map(issue => (
                      <div key={issue.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`w-2 h-2 rounded-full ${catDot(issue.category)}`} />
                          <span className="text-sm font-medium text-gray-900">{issue.name}</span>
                          {issue.iro_type && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${IRO_CFG[issue.iro_type].bg} ${IRO_CFG[issue.iro_type].border} ${IRO_CFG[issue.iro_type].color}`}>
                              {IRO_CFG[issue.iro_type].icon} {iroLabel(issue.iro_type)}
                            </span>
                          )}
                          {!issue.iro_type && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-gray-50 border-gray-300 text-gray-400">{t('materiality.unclassified', 'Non classifié')}</span>
                          )}
                        </div>
                        <button onClick={() => handleEdit(issue)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unclassified issues */}
          {issues.filter(i => !i.esrs_topic).length > 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-dashed border-gray-200">
                <span className="font-semibold text-gray-600">{t('materiality.issuesWithoutTopic', 'Enjeux sans topic ESRS lié')}</span>
                <span className="ml-2 text-xs text-gray-400">{t('materiality.issueCount', '{{n}} enjeu{{x}} à classifier', { n: issues.filter(i => !i.esrs_topic).length, x: issues.filter(i => !i.esrs_topic).length !== 1 ? 'x' : '' })}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {issues.filter(i => !i.esrs_topic).map(issue => (
                  <div key={issue.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`w-2 h-2 rounded-full ${catDot(issue.category)}`} />
                      <span className="text-sm font-medium text-gray-900">{issue.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 border border-orange-200 text-orange-600 font-medium">⚠ {t('materiality.esrsTopicMissing', 'Topic ESRS manquant')}</span>
                    </div>
                    <button onClick={() => handleEdit(issue)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ISSUE MODAL ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{selectedIssue ? t('materiality.issueModalEditTitle') : t('materiality.issueModalNewTitle')}</h2>
              <button onClick={closeIssueModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.issueModalNameLabel')}</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" placeholder={t('materiality.issueNamePlaceholder')} disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.issueModalDescLabel')}</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.issueModalCatLabel')}</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                  <option value="environmental">🌿 {t('materiality.catEnvironmental')}</option>
                  <option value="social">👥 {t('materiality.catSocial')}</option>
                  <option value="governance">⚖️ {t('materiality.catGovernance')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.issueModalFinancialLabel')} <span className="font-bold text-orange-600">{formData.financial_impact}/100</span></label>
                <input type="range" min="0" max="100" value={formData.financial_impact} onChange={e => setFormData({ ...formData, financial_impact: Number(e.target.value) })} className="w-full accent-orange-500" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.issueModalEsgLabel')} <span className="font-bold text-blue-600">{formData.esg_impact}/100</span></label>
                <input type="range" min="0" max="100" value={formData.esg_impact} onChange={e => setFormData({ ...formData, esg_impact: Number(e.target.value) })} className="w-full accent-blue-500" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.issueModalStakeholders')}</label>
                <input type="text" value={formData.stakeholders} onChange={e => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" placeholder={t('materiality.issueStakeholdersPlaceholder')} disabled={submitting} />
              </div>

              {/* ── IRO Classification (CSRD required) ── */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t('materiality.iroClassification', 'Classification IRO — CSRD')}</span>
                  <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-bold text-indigo-600">ESRS 1 §43</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['impact','risk','opportunity'] as IROType[]).map(iro => (
                    <button key={iro} type="button" onClick={() => setFormData({ ...formData, iro_type: formData.iro_type === iro ? '' : iro })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${formData.iro_type === iro ? `${IRO_CFG[iro].bg} ${IRO_CFG[iro].border} ${IRO_CFG[iro].color}` : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <span className="text-lg">{IRO_CFG[iro].icon}</span>
                      {iroLabel(iro)}
                    </button>
                  ))}
                </div>
                {formData.iro_type === 'impact' && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('materiality.impactType', "Type d'impact")}</label>
                    <div className="flex gap-2">
                      {(['actual','potential'] as const).map(v => (
                        <button key={v} type="button" onClick={() => setFormData({ ...formData, iro_actual_or_potential: v })}
                          className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${formData.iro_actual_or_potential === v ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                          {v === 'actual' ? `⚡ ${t('materiality.iroActual', 'Avéré')}` : `🔮 ${t('materiality.iroPotential', 'Potentiel')}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('materiality.linkedEsrsTopic', 'Topic ESRS lié')} <span className="text-gray-400">({t('materiality.optional', 'optionnel')})</span></label>
                  <select value={formData.esrs_topic} onChange={e => setFormData({ ...formData, esrs_topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                    <option value="">{t('materiality.noTopicLinked', '— Aucun topic lié —')}</option>
                    {ESRS_TOPICS_LIST.map(code => (
                      <option key={code} value={code}>{esrsTopicLabel(code)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1" disabled={submitting}>{submitting ? <Spinner className="mr-2" /> : null}{selectedIssue ? t('materiality.issueModalUpdate') : t('materiality.issueModalCreate')}</button>
                <button type="button" onClick={closeIssueModal} className="flex-1" disabled={submitting}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ RISK MODAL ═══════════════════════════════════════════════════════ */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{selectedRisk ? t('materiality.riskModalEditTitle') : t('materiality.riskModalNewTitle')}</h2>
              <button onClick={closeRiskModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleRiskSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalTitleLabel')}</label>
                <input type="text" required value={riskForm.title} onChange={e => setRiskForm({ ...riskForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" placeholder={t('materiality.riskTitlePlaceholder')} disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalDescLabel')}</label>
                <textarea rows={3} value={riskForm.description} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalCatLabel')}</label>
                <select value={riskForm.category} onChange={e => setRiskForm({ ...riskForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                  <option value="environmental">🌿 {t('materiality.catEnvironmental')}</option>
                  <option value="social">👥 {t('materiality.catSocial')}</option>
                  <option value="governance">⚖️ {t('materiality.catGovernance')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalProbLabel')} <span className="font-bold text-indigo-600">{riskForm.probability}/5</span></label>
                  <input type="range" min="1" max="5" value={riskForm.probability} onChange={e => setRiskForm({ ...riskForm, probability: Number(e.target.value) })} className="w-full accent-indigo-500" disabled={submitting} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalImpactLabel')} <span className="font-bold text-orange-600">{riskForm.impact}/5</span></label>
                  <input type="range" min="1" max="5" value={riskForm.impact} onChange={e => setRiskForm({ ...riskForm, impact: Number(e.target.value) })} className="w-full accent-orange-500" disabled={submitting} />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-center text-sm">
                {t('materiality.riskModalScoreLabel')} <span className={`ml-2 text-lg font-bold ${riskForm.probability * riskForm.impact >= 20 ? 'text-red-600' : riskForm.probability * riskForm.impact >= 12 ? 'text-orange-600' : riskForm.probability * riskForm.impact >= 6 ? 'text-yellow-600' : 'text-green-600'}`}>{riskForm.probability * riskForm.impact}/25</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalMitigLabel')}</label>
                <textarea rows={2} value={riskForm.mitigation_plan} onChange={e => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none" placeholder={t('materiality.riskModalMitigPlaceholder')} disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('materiality.riskModalOwnerLabel')}</label>
                <input type="text" value={riskForm.responsible_person} onChange={e => setRiskForm({ ...riskForm, responsible_person: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" placeholder={t('materiality.riskModalOwnerPlaceholder')} disabled={submitting} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1" disabled={submitting}>{submitting ? <Spinner className="mr-2" /> : null}{selectedRisk ? t('materiality.riskModalUpdate') : t('materiality.riskModalCreate')}</button>
                <button type="button" onClick={closeRiskModal} className="flex-1" disabled={submitting}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
