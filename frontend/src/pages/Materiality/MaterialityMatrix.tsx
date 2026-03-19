import { useState, useEffect, useRef } from 'react';
import {
  Grid, Plus, RefreshCw, AlertCircle, CheckCircle, Edit, Trash2, X,
  List, ShieldAlert, Target, Activity, Zap, Sparkles, Users, Download,
  ChevronRight, ChevronLeft, Building2, BarChart3, FileText, Check,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MaterialityIssue {
  id: string; name: string; description?: string; category: string;
  financial_impact: number; esg_impact: number; is_material: boolean;
  priority: string; stakeholders?: string;
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
  environmental: { label: 'Environnemental', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  social:        { label: 'Social',          color: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-500'    },
  governance:    { label: 'Gouvernance',     color: 'bg-purple-100 text-purple-800',   dot: 'bg-purple-500'  },
} as const;

const SEV = {
  critical: { label: 'Critique', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400'    },
  high:     { label: 'Élevé',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400' },
  medium:   { label: 'Modéré',   color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-400' },
  low:      { label: 'Faible',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400'  },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const catDot   = (c: string) => (CAT as any)[c]?.dot   ?? 'bg-gray-400';
const catBadge = (c: string) => (CAT as any)[c]?.color ?? 'bg-gray-100 text-gray-600';
const catLabel = (c: string) => (CAT as any)[c]?.label ?? c;
const quadrant = (x: number, y: number) => {
  if (x > 60 && y > 60) return { label: 'Double matériel',     bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700'    };
  if (x > 60)           return { label: 'Impact financier',    bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700' };
  if (y > 60)           return { label: 'Impact ESG',          bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-700'   };
  return                       { label: 'Non matériel',        bg: 'bg-gray-50',   border: 'border-gray-300',   text: 'text-gray-500'   };
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function MaterialityMatrix() {
  const [issues, setIssues]     = useState<MaterialityIssue[]>([]);
  const [risks, setRisks]       = useState<ESGRisk[]>([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // tabs: 'matrix' | 'questionnaire' | 'suggestions' | 'risks'
  const [activeTab, setActiveTab] = useState<'matrix' | 'questionnaire' | 'suggestions' | 'risks'>('matrix');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  // Issue modal
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaterialityIssue | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', category: 'environmental', financial_impact: 50, esg_impact: 50, stakeholders: '' });

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
      toast.error(err.response?.data?.detail || 'Erreur lors du chargement');
    } finally { setLoading(false); }
  };

  // ── Issue CRUD ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (selectedIssue) { await api.put(`/materiality/issues/${selectedIssue.id}`, formData); toast.success('Enjeu mis à jour'); }
      else               { await api.post('/materiality/issues', formData);                     toast.success('Enjeu créé');       }
      closeIssueModal(); await loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleEdit   = (issue: MaterialityIssue) => { setSelectedIssue(issue); setFormData({ name: issue.name, description: issue.description || '', category: issue.category, financial_impact: issue.financial_impact, esg_impact: issue.esg_impact, stakeholders: issue.stakeholders || '' }); setShowModal(true); };
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'enjeu "${name}" ?`)) return;
    try { await api.delete(`/materiality/issues/${id}`); toast.success('Enjeu supprimé'); await loadAll(); }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };
  const closeIssueModal = () => { setShowModal(false); setSelectedIssue(null); setFormData({ name: '', description: '', category: 'environmental', financial_impact: 50, esg_impact: 50, stakeholders: '' }); };

  // ── Risk CRUD ────────────────────────────────────────────────────────────────
  const handleRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (selectedRisk) { await api.put(`/materiality/risks/${selectedRisk.id}`, riskForm); toast.success('Risque mis à jour'); }
      else              { await api.post('/materiality/risks', riskForm);                    toast.success('Risque créé');       }
      closeRiskModal(); await loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSubmitting(false); }
  };
  const handleRiskEdit   = (risk: ESGRisk) => { setSelectedRisk(risk); setRiskForm({ title: risk.title, description: risk.description || '', category: risk.category, probability: risk.probability, impact: risk.impact, mitigation_plan: risk.mitigation_plan || '', responsible_person: risk.responsible_person || '' }); setShowRiskModal(true); };
  const handleRiskDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer le risque "${title}" ?`)) return;
    try { await api.delete(`/materiality/risks/${id}`); toast.success('Risque supprimé'); await loadAll(); }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur'); }
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
      toast.success('Position sauvegardée');
    } catch { toast.error('Erreur de sauvegarde'); await loadAll(); }
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
      toast.success(`${updates.length} enjeux mis à jour depuis le questionnaire`);
      setQuestApplied(true); await loadAll();
    } catch { toast.error('Erreur lors de l\'application des résultats'); }
  };

  // ── Suggestions IA ───────────────────────────────────────────────────────────
  const addSuggestion = async (s: typeof SECTORS[string][number]) => {
    try {
      await api.post('/materiality/issues', { name: s.name, description: s.description, category: s.category, financial_impact: s.financial_impact, esg_impact: s.esg_impact, stakeholders: '' });
      setAddedSuggestions(prev => new Set([...prev, s.name]));
      toast.success(`"${s.name}" ajouté à la matrice`);
      await loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = 'Enjeu,Catégorie,Impact Financier,Impact ESG,Quadrant,Matériel,Priorité,Parties prenantes\n';
    const rows = issues.map(i => {
      const q = quadrant(i.financial_impact, i.esg_impact);
      return `"${i.name}","${catLabel(i.category)}",${i.financial_impact},${i.esg_impact},"${q.label}",${i.is_material ? 'Oui' : 'Non'},"${i.priority}","${i.stakeholders || ''}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'matrice-materialite.csv'; a.click();
    URL.revokeObjectURL(url); toast.success('Export CSV téléchargé');
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total:         issues.length,
    material:      issues.filter(i => i.is_material).length,
    highPriority:  issues.filter(i => i.priority === 'high').length,
    env:           issues.filter(i => i.category === 'environmental').length,
    criticalRisks: risks.filter(r => r.severity === 'critical' || r.severity === 'high').length,
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">

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
              Double Matérialité · CSRD / ESRS
            </div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Grid className="h-9 w-9 opacity-90" />
              Analyse de Matérialité
            </h1>
            <p className="mt-2 text-indigo-200 max-w-xl">
              Questionnaire parties prenantes, matrice interactive drag &amp; drop, suggestions IA sectorielles.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-sm font-medium transition-all">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <Button variant="secondary" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            {activeTab === 'matrix' && (
              <Button variant="secondary" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter un enjeu
              </Button>
            )}
            {activeTab === 'risks' && (
              <Button variant="secondary" onClick={() => setShowRiskModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter un risque
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total enjeux',      value: stats.total,         icon: Grid,        color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-400' },
          { label: 'Matériels',         value: stats.material,      icon: Target,      color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-400'    },
          { label: 'Haute priorité',    value: stats.highPriority,  icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-400' },
          { label: 'Environnemental',   value: stats.env,           icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-400'  },
          { label: 'Risques critiques', value: stats.criticalRisks, icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-400' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`border-l-4 ${border} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 font-medium">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p></div>
              <div className={`p-2.5 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          { key: 'matrix',        label: 'Matrice',            icon: Grid       },
          { key: 'questionnaire', label: 'Questionnaire',      icon: Users      },
          { key: 'suggestions',   label: 'Suggestions IA',     icon: Sparkles   },
          { key: 'risks',         label: 'Registre des risques', icon: ShieldAlert },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
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
                <Grid className="h-4 w-4 inline mr-1.5" />Matrice
              </button>
              <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                <List className="h-4 w-4 inline mr-1.5" />Liste
              </button>
            </div>
          </div>

          {/* List view */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <Card className="py-16 text-center"><Grid className="mx-auto h-12 w-12 text-gray-300 mb-3" /><p className="font-semibold text-gray-700">Aucun enjeu enregistré</p></Card>
              ) : issues.map(issue => {
                const q = quadrant(issue.financial_impact, issue.esg_impact);
                return (
                  <Card key={issue.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${catDot(issue.category)}`} />
                          <h3 className="text-base font-semibold text-gray-900">{issue.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${q.bg} ${q.border} ${q.text}`}>{q.label}</span>
                        </div>
                        {issue.description && <p className="text-sm text-gray-500 mb-3">{issue.description}</p>}
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-gray-600">Impact financier</span>
                            <span className="text-sm font-bold text-orange-600">{issue.financial_impact}/100</span>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-gray-600">Impact ESG</span>
                            <span className="text-sm font-bold text-blue-600">{issue.esg_impact}/100</span>
                          </div>
                          <span className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${catBadge(issue.category)}`}>{catLabel(issue.category)}</span>
                        </div>
                        {issue.stakeholders && <p className="mt-2 text-xs text-gray-400">Parties prenantes : {issue.stakeholders}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleEdit(issue)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(issue.id, issue.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Matrix view with drag & drop */}
          {viewMode === 'matrix' && (
            <Card className="overflow-hidden">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Matrice de Double Matérialité</h2>
                  <p className="text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">✦ Glissez-déposez</span> les points pour repositionner · Survolez pour les détails · Cliquez pour modifier
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  {Object.entries(CAT).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${v.dot}`} />{v.label}</div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-xl border-2 border-gray-200 bg-gradient-to-br from-slate-50 to-gray-100" style={{ height: 640, padding: '48px 48px 48px 64px' }}>
                {/* Quadrant backgrounds */}
                <div className="absolute rounded-xl overflow-hidden pointer-events-none" style={{ inset: '40px 40px 40px 56px' }}>
                  <div className="absolute top-0 left-0 w-[60%] h-[40%] bg-blue-50/40" />
                  <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-100/60 border-b border-l border-dashed border-blue-300" />
                  <div className="absolute bottom-0 right-0 w-[40%] h-[60%] bg-red-100/60 border-t border-l border-dashed border-red-300" />
                  <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-gray-50/30" />
                </div>

                {/* Threshold lines */}
                <div className="absolute pointer-events-none" style={{ inset: '40px 40px 40px 56px' }}>
                  <div className="absolute w-px bg-orange-400/70 top-0 bottom-0 border-l border-dashed border-orange-400" style={{ left: '60%' }} />
                  <div className="absolute h-px bg-blue-400/70 left-0 right-0 border-t border-dashed border-blue-400" style={{ bottom: '60%' }} />
                </div>

                {/* Quadrant labels */}
                <div className="absolute top-11 right-11 px-2 py-1 bg-blue-100/90 rounded text-[11px] font-bold text-blue-700 shadow-sm pointer-events-none">Impact ESG Élevé</div>
                <div className="absolute bottom-11 right-11 px-2 py-1 bg-red-100/90 rounded text-[11px] font-bold text-red-700 shadow-sm pointer-events-none">⚠ DOUBLE MATÉRIEL</div>
                <div className="absolute top-11 left-16 px-2 py-1 bg-white/80 rounded text-[11px] text-gray-400 shadow-sm pointer-events-none">Impact ESG ↑</div>
                <div className="absolute bottom-11 left-16 px-2 py-1 bg-white/80 rounded text-[11px] text-gray-400 shadow-sm pointer-events-none">Impact Financier →</div>

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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Grid className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-gray-400 text-sm">Ajoutez des enjeux pour les voir apparaître</p>
                        <p className="text-gray-300 text-xs mt-1">Utilisez "Suggestions IA" pour démarrer rapidement</p>
                      </div>
                    </div>
                  ) : issues.map((issue, idx) => (
                    <div
                      key={issue.id}
                      className="absolute group"
                      style={{ left: `${issue.financial_impact}%`, bottom: `${issue.esg_impact}%`, transform: 'translate(-50%, 50%)', zIndex: draggingId === issue.id ? 50 : 20 }}
                      onMouseDown={e => handleDotMouseDown(e, issue.id)}
                      onClick={() => !draggingId && handleEdit(issue)}
                    >
                      <div className={`
                        w-5 h-5 rounded-full shadow-md transition-all duration-150
                        ${catDot(issue.category)}
                        ${issue.is_material ? 'ring-4 ring-red-400/70' : 'ring-2 ring-white'}
                        ${draggingId === issue.id ? 'scale-150 shadow-xl' : 'group-hover:scale-[2] group-hover:shadow-xl'}
                        cursor-grab active:cursor-grabbing
                      `} />
                      {/* Tooltip (hidden when dragging) */}
                      {draggingId !== issue.id && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-left">
                          <p className="font-bold text-gray-900 text-sm mb-1">{issue.name}</p>
                          {issue.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{issue.description}</p>}
                          <div className="grid grid-cols-2 gap-1.5 mb-2">
                            <div className="bg-orange-50 rounded p-1.5 text-center"><p className="text-[10px] text-gray-500">Fin.</p><p className="text-sm font-bold text-orange-600">{issue.financial_impact}</p></div>
                            <div className="bg-blue-50 rounded p-1.5 text-center"><p className="text-[10px] text-gray-500">ESG</p><p className="text-sm font-bold text-blue-600">{issue.esg_impact}</p></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${catBadge(issue.category)}`}>{catLabel(issue.category)}</span>
                            <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                          </div>
                        </div>
                      )}
                      {/* Drag tooltip */}
                      {draggingId === issue.id && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 px-2 py-1 bg-indigo-600 text-white text-[11px] rounded-lg whitespace-nowrap shadow-lg z-50">
                          Fin: {issue.financial_impact} · ESG: {issue.esg_impact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Axis labels */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90">
                  <p className="text-xs font-semibold text-gray-500 whitespace-nowrap tracking-wide">Impact Environnement &amp; Société →</p>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                  <p className="text-xs font-semibold text-gray-500 tracking-wide">Impact Performance Financière →</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400 text-center">
                ✦ Glissez-déposez les points pour repositionner · Sauvegarde automatique · Les enjeux matériels sont encadrés en rouge
              </p>
            </Card>
          )}
        </>
      )}

      {/* ══ QUESTIONNAIRE TAB ════════════════════════════════════════════════ */}
      {activeTab === 'questionnaire' && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {['Parties prenantes', 'Enjeux', 'Évaluations', 'Résultats'].map((label, i) => (
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
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" /> Étape 1 · Définir les parties prenantes</h3>
              <p className="text-sm text-gray-500 mb-5">Ajoutez les acteurs qui participeront à l'évaluation de la matérialité.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <input value={stakeholderForm.name} onChange={e => setStakeholderForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nom / Entité" className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <select value={stakeholderForm.role} onChange={e => setStakeholderForm(p => ({ ...p, role: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
                  {STAKEHOLDER_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <select value={stakeholderForm.type} onChange={e => setStakeholderForm(p => ({ ...p, type: e.target.value as 'internal' | 'external' }))}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="internal">Interne</option>
                  <option value="external">Externe</option>
                </select>
              </div>
              <Button onClick={addStakeholder} variant="secondary" className="mb-5"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
              {stakeholders.length > 0 && (
                <div className="space-y-2 mb-5">
                  {stakeholders.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${s.type === 'internal' ? 'bg-indigo-500' : 'bg-purple-500'}`}>{s.name.charAt(0).toUpperCase()}</div>
                        <div><p className="text-sm font-semibold text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.role} · {s.type === 'internal' ? 'Interne' : 'Externe'}</p></div>
                      </div>
                      <button onClick={() => setStakeholders(p => p.filter(x => x.id !== s.id))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              {stakeholders.length === 0 && (
                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-5">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Aucune partie prenante ajoutée</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setQuestStep(1)} disabled={stakeholders.length === 0}>Étape suivante <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </Card>
          )}

          {/* Step 1: Select issues */}
          {questStep === 1 && (
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> Étape 2 · Sélectionner les enjeux à évaluer</h3>
              <p className="text-sm text-gray-500 mb-5">Cochez les enjeux sur lesquels vous souhaitez recueillir l'avis des parties prenantes.</p>
              {issues.length === 0 ? (
                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-5">
                  <p className="text-sm">Aucun enjeu dans la matrice. Ajoutez des enjeux dans l'onglet "Matrice" ou via "Suggestions IA".</p>
                </div>
              ) : (
                <div className="space-y-2 mb-5">
                  <label className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-xl cursor-pointer border border-indigo-100">
                    <input type="checkbox" checked={selectedIssueIds.length === issues.length}
                      onChange={e => setSelectedIssueIds(e.target.checked ? issues.map(i => i.id) : [])}
                      className="w-4 h-4 rounded text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">Sélectionner tout ({issues.length})</span>
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
                <Button variant="secondary" onClick={() => setQuestStep(0)}><ChevronLeft className="h-4 w-4 mr-1" /> Retour</Button>
                <Button onClick={() => { setQuestStep(2); setRatings(stakeholders.flatMap(s => selectedIssueIds.map(iId => ({ stakeholderId: s.id, issueId: iId, financial: 5, esg: 5 })))); }} disabled={selectedIssueIds.length === 0}>
                  Étape suivante <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Enter ratings */}
          {questStep === 2 && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2"><Target className="h-5 w-5 text-indigo-500" /> Étape 3 · Saisir les évaluations</h3>
                <p className="text-sm text-gray-500">Pour chaque partie prenante, notez l'importance de chaque enjeu de 1 (faible) à 10 (critique).</p>
              </Card>
              {stakeholders.map(s => (
                <Card key={s.id}>
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
                            <label className="text-xs text-gray-500 block mb-1">Impact financier: <span className="font-bold text-orange-600">{getRating(s.id, iId, 'financial')}/10</span></label>
                            <input type="range" min="1" max="10" value={getRating(s.id, iId, 'financial')}
                              onChange={e => setRating(s.id, iId, 'financial', Number(e.target.value))}
                              className="w-full accent-orange-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Impact ESG: <span className="font-bold text-blue-600">{getRating(s.id, iId, 'esg')}/10</span></label>
                            <input type="range" min="1" max="10" value={getRating(s.id, iId, 'esg')}
                              onChange={e => setRating(s.id, iId, 'esg', Number(e.target.value))}
                              className="w-full accent-blue-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setQuestStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Retour</Button>
                <Button onClick={() => setQuestStep(3)}>Voir les résultats <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {questStep === 3 && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> Étape 4 · Résultats & Pondération</h3>
                <p className="text-sm text-gray-500 mb-5">Scores moyens calculés à partir des {stakeholders.length} évaluations. Cliquez sur "Appliquer" pour mettre à jour la matrice.</p>
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
                          <p className={`text-xs mt-0.5 font-medium ${q.text}`}>{q.label}</p>
                        </div>
                        <div className="flex gap-3 text-center">
                          <div className="bg-orange-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-500">Financier</p>
                            <p className="text-sm font-bold text-orange-600">{avgFin}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-500">ESG</p>
                            <p className="text-sm font-bold text-blue-600">{avgEsg}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setQuestStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> Retour</Button>
                {questApplied ? (
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    <CheckCircle className="h-5 w-5" /> Matrice mise à jour
                  </div>
                ) : (
                  <Button onClick={applyQuestionnaire} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-1" /> Appliquer à la matrice
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SUGGESTIONS IA TAB ═══════════════════════════════════════════════ */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Suggestions IA · Enjeux sectoriels</h3>
                <p className="text-sm text-gray-500">Sélectionnez votre secteur pour obtenir des enjeux ESG pré-configurés selon les standards CSRD/ESRS.</p>
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
          </Card>

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
                        <p className="text-[10px] text-gray-500">Fin.</p>
                        <p className="text-xs font-bold text-orange-600">{s.financial_impact}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg px-2.5 py-1.5 text-center">
                        <p className="text-[10px] text-gray-500">ESG</p>
                        <p className="text-xs font-bold text-blue-600">{s.esg_impact}</p>
                      </div>
                      <div className={`rounded-lg px-2.5 py-1.5 text-center ${q.bg}`}>
                        <p className="text-[10px] text-gray-500">Zone</p>
                        <p className={`text-[10px] font-bold ${q.text}`}>{q.label}</p>
                      </div>
                    </div>
                    {already || justAdded ? (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
                        <CheckCircle className="h-4 w-4" /> Ajouté
                      </div>
                    ) : (
                      <button onClick={() => addSuggestion(s)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200 hover:shadow-indigo-300">
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Note sur les scores pré-configurés</p>
                <p className="text-xs text-amber-700 mt-1">Les impacts financiers et ESG proposés sont des benchmarks sectoriels basés sur les référentiels ESRS, GRI et SASB. Ils sont personnalisables via le questionnaire parties prenantes ou directement dans la matrice.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══ RISKS TAB ════════════════════════════════════════════════════════ */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          {risks.length === 0 ? (
            <Card className="py-16 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Aucun risque enregistré</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Identifiez et documentez vos risques ESG pour mieux les piloter.</p>
              <Button onClick={() => setShowRiskModal(true)}><Plus className="h-4 w-4 mr-2" />Ajouter le premier risque</Button>
            </Card>
          ) : (
            <>
              <Card className="border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" />Vue d'ensemble des risques</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(SEV).map(([key, cfg]) => (
                    <div key={key} className={`rounded-lg p-3 border ${cfg.bg} ${cfg.border}`}>
                      <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                      <p className={`text-2xl font-bold ${cfg.color}`}>{risks.filter(r => r.severity === key).length}</p>
                    </div>
                  ))}
                </div>
              </Card>
              {risks.sort((a, b) => b.risk_score - a.risk_score).map(risk => {
                const sev = (SEV as any)[risk.severity] || SEV.low;
                return (
                  <Card key={risk.id} className={`border-l-4 ${sev.border} hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sev.bg} ${sev.color} border ${sev.border}`}>{sev.label}</span>
                          <h3 className="text-base font-semibold text-gray-900">{risk.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catBadge(risk.category)}`}>{catLabel(risk.category)}</span>
                        </div>
                        {risk.description && <p className="text-sm text-gray-500 mb-3">{risk.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
                            Probabilité : <div className="flex gap-0.5 mx-1">{[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= risk.probability ? 'bg-indigo-500' : 'bg-gray-200'}`} />)}</div>
                            <span className="font-bold text-indigo-600">{risk.probability}/5</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
                            Impact : <div className="flex gap-0.5 mx-1">{[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= risk.impact ? 'bg-orange-500' : 'bg-gray-200'}`} />)}</div>
                            <span className="font-bold text-orange-600">{risk.impact}/5</span>
                          </div>
                          <div className="bg-gray-50 rounded px-2.5 py-1.5 font-semibold">Score : <span className={sev.color}>{risk.risk_score}/25</span></div>
                          {risk.responsible_person && <div className="text-gray-500">Responsable : <span className="font-medium text-gray-700">{risk.responsible_person}</span></div>}
                        </div>
                        {risk.mitigation_plan && (
                          <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-xs font-semibold text-indigo-700 mb-0.5">Plan de mitigation</p>
                            <p className="text-xs text-indigo-600">{risk.mitigation_plan}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleRiskEdit(risk)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleRiskDelete(risk.id, risk.title)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ ISSUE MODAL ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{selectedIssue ? "Modifier l'enjeu" : 'Nouvel enjeu de matérialité'}</h2>
              <button onClick={closeIssueModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" placeholder="Ex : Émissions de CO₂" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                  <option value="environmental">🌿 Environnemental</option>
                  <option value="social">👥 Social</option>
                  <option value="governance">⚖️ Gouvernance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Impact Financier : <span className="font-bold text-orange-600">{formData.financial_impact}/100</span></label>
                <input type="range" min="0" max="100" value={formData.financial_impact} onChange={e => setFormData({ ...formData, financial_impact: Number(e.target.value) })} className="w-full accent-orange-500" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Impact ESG : <span className="font-bold text-blue-600">{formData.esg_impact}/100</span></label>
                <input type="range" min="0" max="100" value={formData.esg_impact} onChange={e => setFormData({ ...formData, esg_impact: Number(e.target.value) })} className="w-full accent-blue-500" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Parties prenantes</label>
                <input type="text" value={formData.stakeholders} onChange={e => setFormData({ ...formData, stakeholders: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Ex : Investisseurs, ONG, Régulateurs" disabled={submitting} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? <Spinner size="sm" className="mr-2" /> : null}{selectedIssue ? 'Mettre à jour' : "Créer l'enjeu"}</Button>
                <Button type="button" variant="secondary" onClick={closeIssueModal} className="flex-1" disabled={submitting}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ RISK MODAL ═══════════════════════════════════════════════════════ */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{selectedRisk ? 'Modifier le risque' : 'Nouveau risque ESG'}</h2>
              <button onClick={closeRiskModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleRiskSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
                <input type="text" required value={riskForm.title} onChange={e => setRiskForm({ ...riskForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Ex : Risque de transition climatique" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea rows={3} value={riskForm.description} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none" disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
                <select value={riskForm.category} onChange={e => setRiskForm({ ...riskForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" disabled={submitting}>
                  <option value="environmental">🌿 Environnemental</option>
                  <option value="social">👥 Social</option>
                  <option value="governance">⚖️ Gouvernance</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Probabilité : <span className="font-bold text-indigo-600">{riskForm.probability}/5</span></label>
                  <input type="range" min="1" max="5" value={riskForm.probability} onChange={e => setRiskForm({ ...riskForm, probability: Number(e.target.value) })} className="w-full accent-indigo-500" disabled={submitting} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Impact : <span className="font-bold text-orange-600">{riskForm.impact}/5</span></label>
                  <input type="range" min="1" max="5" value={riskForm.impact} onChange={e => setRiskForm({ ...riskForm, impact: Number(e.target.value) })} className="w-full accent-orange-500" disabled={submitting} />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-center text-sm">
                Score de risque : <span className={`ml-2 text-lg font-bold ${riskForm.probability * riskForm.impact >= 20 ? 'text-red-600' : riskForm.probability * riskForm.impact >= 12 ? 'text-orange-600' : riskForm.probability * riskForm.impact >= 6 ? 'text-yellow-600' : 'text-green-600'}`}>{riskForm.probability * riskForm.impact}/25</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan de mitigation</label>
                <textarea rows={2} value={riskForm.mitigation_plan} onChange={e => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none" placeholder="Actions prévues..." disabled={submitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsable</label>
                <input type="text" value={riskForm.responsible_person} onChange={e => setRiskForm({ ...riskForm, responsible_person: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Nom ou fonction" disabled={submitting} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? <Spinner size="sm" className="mr-2" /> : null}{selectedRisk ? 'Mettre à jour' : 'Créer le risque'}</Button>
                <Button type="button" variant="secondary" onClick={closeRiskModal} className="flex-1" disabled={submitting}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
