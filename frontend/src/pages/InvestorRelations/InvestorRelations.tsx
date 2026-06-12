import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Plus, Download, FileText,
  ExternalLink, Star, Award, BarChart2, CheckCircle, Clock,
  AlertCircle, X, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

// ─── Types ────────────────────────────────────────────────────────────────────

type RatingProvider = 'MSCI' | 'SP_CSA' | 'Sustainalytics' | 'ISS' | 'EcoVadis' | 'CDP' | 'Gaïa_Index';
type QStatus = 'not_started' | 'in_progress' | 'submitted' | 'scored';
type Tab = 'ratings' | 'questionnaires' | 'dataroom' | 'factsheet';

interface ESGRating {
  id: string;
  provider: RatingProvider;
  score: string;
  date: string;
  trend: 'up' | 'stable' | 'down';
  previousScore: string;
  notes: string;
  url: string;
}

interface IRQuestionnaire {
  id: string;
  provider: RatingProvider;
  year: number;
  status: QStatus;
  deadline: string;
  score: string;
  completionPct: number;
  notes: string;
  contactEmail: string;
}

interface DataRoomDoc {
  id: string;
  name: string;
  category: 'rapport_esg' | 'politique' | 'donnees' | 'certification' | 'presentation' | 'autre';
  uploadDate: string;
  size: string;
  format: 'PDF' | 'Excel' | 'Word' | 'CSV' | 'Other';
  accessLevel: 'public' | 'restricted' | 'confidential';
  description: string;
}

interface IRFactsheetData {
  companyName: string;
  reportingYear: string;
  sector: string;
  employees: string;
  revenue: string;
  scope1: string;
  scope2: string;
  scope3: string;
  intensityCarbone: string;
  energieRenouvelable: string;
  eau: string;
  dechets: string;
  femmes: string;
  accidents: string;
  formationHeures: string;
  objectifSBTi: string;
  noteGlobale: string;
  engagementCDP: string;
  taxonomieAlignment: string;
}

// ─── Provider & category metadata ────────────────────────────────────────────

const getProviders = (t: TFunction): Record<RatingProvider, { name: string; scaleDesc: string; color: string; logo: string }> => ({
  MSCI:           { name: 'MSCI ESG Ratings',        scaleDesc: t('inv.prov.msciScale', 'AAA → CCC (7 niveaux)'),     color: '#1e40af', logo: '📊' },
  SP_CSA:         { name: 'S&P Global CSA',           scaleDesc: t('inv.prov.spScale', '0 → 100 (score industrie)'),   color: '#dc2626', logo: '📈' },
  Sustainalytics: { name: 'Sustainalytics',           scaleDesc: 'Low / Medium / High / Severe',      color: '#ea580c', logo: '🌿' },
  ISS:            { name: 'ISS ESG Corporate Rating', scaleDesc: t('inv.prov.issScale', 'A+ → D- (12 niveaux)'),       color: '#7c3aed', logo: '⚖️' },
  EcoVadis:       { name: 'EcoVadis',                 scaleDesc: 'Bronze / Silver / Gold / Platinum', color: '#d97706', logo: '🏅' },
  CDP:            { name: 'CDP Climate',              scaleDesc: 'A, A-, B, B-, C, C-, D, D-',        color: '#16a34a', logo: '🌍' },
  Gaïa_Index:     { name: 'Gaïa Index (ETI France)',  scaleDesc: t('inv.prov.gaiaScale', '0 → 100 (PME/ETI françaises)'), color: '#0891b2', logo: '🇫🇷' },
});

const getDocCategories = (t: TFunction): Record<DataRoomDoc['category'], { label: string; color: string }> => ({
  rapport_esg:   { label: t('inv.cat.reportEsg', 'Rapport ESG'),        color: '#16a34a' },
  politique:     { label: t('inv.cat.policy', 'Politique & Charte'),  color: '#2563eb' },
  donnees:       { label: t('inv.cat.verifiedData', 'Données vérifiées'),   color: '#7c3aed' },
  certification: { label: 'Certification',       color: '#d97706' },
  presentation:  { label: t('inv.cat.irPresentation', 'Présentation IR'),     color: '#dc2626' },
  autre:         { label: t('inv.cat.other', 'Autre'),               color: '#6b7280' },
});

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_RATINGS: ESGRating[] = [
  { id: '1', provider: 'MSCI',           score: 'AA',              date: '2024-09-15', trend: 'up',     previousScore: 'A',              notes: 'Amélioration gouvernance',                        url: '' },
  { id: '2', provider: 'SP_CSA',         score: '61/100',          date: '2024-11-01', trend: 'stable', previousScore: '60/100',          notes: 'Score dans le 3ème quartile sectoriel',          url: '' },
  { id: '3', provider: 'Sustainalytics', score: 'Medium (28.4)',   date: '2024-08-20', trend: 'down',   previousScore: 'Medium (24.1)',   notes: "Hausse exposition risque eau",                    url: '' },
  { id: '4', provider: 'CDP',            score: 'B',               date: '2024-07-10', trend: 'up',     previousScore: 'C',              notes: 'Premier B obtenu grâce au module CDP',            url: '' },
  { id: '5', provider: 'EcoVadis',       score: 'Silver (58/100)', date: '2024-06-01', trend: 'stable', previousScore: 'Silver (55/100)', notes: '',                                               url: '' },
];

const DEMO_QUESTS: IRQuestionnaire[] = [
  { id: '1', provider: 'CDP',            year: 2025, status: 'in_progress',  deadline: '2025-07-31', score: '', completionPct: 65,  notes: 'Section C6 à compléter',    contactEmail: '' },
  { id: '2', provider: 'MSCI',           year: 2025, status: 'not_started',  deadline: '2025-05-31', score: '', completionPct: 0,   notes: '',                           contactEmail: 'esg@msci.com' },
  { id: '3', provider: 'SP_CSA',         year: 2025, status: 'submitted',    deadline: '2025-04-30', score: '', completionPct: 100, notes: 'Soumis le 28/04/2025',       contactEmail: '' },
  { id: '4', provider: 'Sustainalytics', year: 2025, status: 'not_started',  deadline: '2025-09-15', score: '', completionPct: 0,   notes: '',                           contactEmail: '' },
];

const DEMO_DOCS: DataRoomDoc[] = [
  { id: '1', name: 'Rapport ESG 2024 — VF',              category: 'rapport_esg',   uploadDate: '2025-04-15', size: '4.2 MB', format: 'PDF',   accessLevel: 'public',       description: 'Rapport annuel de développement durable 2024' },
  { id: '2', name: 'Politique Climatique 2030',           category: 'politique',     uploadDate: '2025-01-10', size: '0.8 MB', format: 'PDF',   accessLevel: 'public',       description: 'Politique Net Zéro et décarbonation' },
  { id: '3', name: 'Données GES vérifiées 2024 (BV)',    category: 'donnees',       uploadDate: '2025-03-20', size: '1.1 MB', format: 'Excel', accessLevel: 'restricted',   description: 'Données Scope 1/2/3 avec rapport de vérification Bureau Veritas' },
  { id: '4', name: 'Certification ISO 14001 — 2024',     category: 'certification', uploadDate: '2024-12-01', size: '0.3 MB', format: 'PDF',   accessLevel: 'public',       description: "Certificat ISO 14001 valide jusqu'en 2027" },
  { id: '5', name: 'Présentation IR ESG — Mai 2025',     category: 'presentation',  uploadDate: '2025-05-01', size: '3.6 MB', format: 'PDF',   accessLevel: 'restricted',   description: 'Présentation roadshow ESG pour investisseurs institutionnels' },
];

const DEFAULT_FACTSHEET: IRFactsheetData = {
  companyName: 'Votre Entreprise SA', reportingYear: '2024', sector: 'Industrie manufacturière',
  employees: '1 250', revenue: '320 M€',
  scope1: '4 200 tCO₂e', scope2: '1 800 tCO₂e', scope3: '28 500 tCO₂e',
  intensityCarbone: '19,5 tCO₂e/M€', energieRenouvelable: '42%',
  eau: '85 000 m³', dechets: '78% recyclés',
  femmes: '34%', accidents: '2,1', formationHeures: '28h/ETP',
  objectifSBTi: 'Engagé', noteGlobale: 'B+', engagementCDP: 'B', taxonomieAlignment: '18%',
};

// ─── Helper utilities ─────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function fmtDate(iso: string): string {
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Normalise a score to 0–100 for the bar chart */
function normaliseScore(provider: RatingProvider, score: string): number {
  if (provider === 'MSCI') {
    const map: Record<string, number> = { AAA: 100, AA: 86, A: 71, BBB: 57, BB: 43, B: 29, CCC: 14 };
    return map[score.trim()] ?? 0;
  }
  if (provider === 'SP_CSA') { const n = parseFloat(score); return isNaN(n) ? 0 : n; }
  if (provider === 'Sustainalytics') {
    const m = score.match(/[\d.]+/); const v = m ? parseFloat(m[0]) : 50;
    return Math.max(0, 100 - v * 2); // lower risk = higher bar
  }
  if (provider === 'CDP') {
    const map: Record<string, number> = { A: 100, 'A-': 88, B: 75, 'B-': 63, C: 50, 'C-': 38, D: 25, 'D-': 13 };
    return map[score.trim()] ?? 0;
  }
  if (provider === 'EcoVadis') { const m = score.match(/(\d+)/); return m ? parseInt(m[1]) : 0; }
  if (provider === 'ISS') {
    const map: Record<string, number> = { 'A+': 100, A: 92, 'A-': 83, 'B+': 75, B: 67, 'B-': 58, 'C+': 50, C: 42, 'C-': 33, 'D+': 25, D: 17, 'D-': 8 };
    return map[score.trim()] ?? 0;
  }
  if (provider === 'Gaïa_Index') { const n = parseFloat(score); return isNaN(n) ? 0 : n; }
  return 0;
}

const getStatusMeta = (t: TFunction): Record<QStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> => ({
  not_started: { label: t('inv.st.notStarted', 'Non commencé'), bg: '#f3f4f6', text: '#374151', icon: <Clock size={12} /> },
  in_progress:  { label: t('inv.st.inProgress', 'En cours'),     bg: '#fef3c7', text: '#92400e', icon: <AlertCircle size={12} /> },
  submitted:    { label: t('inv.st.submitted', 'Soumis'),       bg: '#dbeafe', text: '#1e40af', icon: <CheckCircle size={12} /> },
  scored:       { label: t('inv.st.scored', 'Noté'),         bg: '#d1fae5', text: '#065f46', icon: <Star size={12} /> },
});

const FORMAT_COLORS: Record<DataRoomDoc['format'], string> = {
  PDF: '#dc2626', Excel: '#16a34a', Word: '#2563eb', CSV: '#7c3aed', Other: '#6b7280',
};

const getAccessMeta = (t: TFunction): Record<DataRoomDoc['accessLevel'], { label: string; bg: string; text: string }> => ({
  public:       { label: 'Public',       bg: '#d1fae5', text: '#065f46' },
  restricted:   { label: t('inv.acc.restricted', 'Restreint'),    bg: '#fef3c7', text: '#92400e' },
  confidential: { label: t('inv.acc.confidential', 'Confidentiel'), bg: '#fee2e2', text: '#991b1b' },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvestorRelations() {
  const { t } = useTranslation();
  const PROVIDERS = getProviders(t);
  const DOC_CATEGORIES = getDocCategories(t);
  const STATUS_META = getStatusMeta(t);
  const ACCESS_META = getAccessMeta(t);
  const [tab, setTab]                       = useState<Tab>('ratings');
  const [ratings, setRatings]               = useState<ESGRating[]>(() => {
    try { const s = localStorage.getItem('ir_dashboard'); return s ? JSON.parse(s).ratings ?? DEMO_RATINGS : DEMO_RATINGS; } catch { return DEMO_RATINGS; }
  });
  const [questionnaires, setQuestionnaires] = useState<IRQuestionnaire[]>(() => {
    try { const s = localStorage.getItem('ir_dashboard'); return s ? JSON.parse(s).questionnaires ?? DEMO_QUESTS : DEMO_QUESTS; } catch { return DEMO_QUESTS; }
  });
  const [docs, setDocs]                     = useState<DataRoomDoc[]>(() => {
    try { const s = localStorage.getItem('ir_dashboard'); return s ? JSON.parse(s).docs ?? DEMO_DOCS : DEMO_DOCS; } catch { return DEMO_DOCS; }
  });
  const [factsheet, setFactsheet]           = useState<IRFactsheetData>(() => {
    try { const s = localStorage.getItem('ir_dashboard'); return s ? JSON.parse(s).factsheet ?? DEFAULT_FACTSHEET : DEFAULT_FACTSHEET; } catch { return DEFAULT_FACTSHEET; }
  });

  const [saving, setSaving]             = useState(false);
  const [showAddRating, setShowAddRating] = useState(false);
  const [showAddDoc, setShowAddDoc]     = useState(false);
  const [showAddQuest, setShowAddQuest] = useState(false);
  const [docCatFilter, setDocCatFilter] = useState<'all' | DataRoomDoc['category']>('all');

  const [newRating, setNewRating] = useState<Partial<ESGRating>>({ trend: 'stable' });
  const [newDoc, setNewDoc]       = useState<Partial<DataRoomDoc>>({ category: 'rapport_esg', format: 'PDF', accessLevel: 'public' });
  const [newQuest, setNewQuest]   = useState<Partial<IRQuestionnaire>>({ status: 'not_started', year: 2025, completionPct: 0 });

  // ── Load from API on mount (authoritative), fallback to localStorage ──────
  useEffect(() => {
    api.get('/framework-data/investor_relations')
      .then(r => {
        const d = r.data?.data;
        if (d && Object.keys(d).length > 0) {
          if (d.ratings)        setRatings(d.ratings);
          if (d.questionnaires) setQuestionnaires(d.questionnaires);
          if (d.docs)           setDocs(d.docs);
          if (d.factsheet)      setFactsheet(d.factsheet);
        }
      })
      .catch(() => { /* localStorage already applied as initial state */ });
  }, []);

  // ── Persist to localStorage (cache) + API (durable) ───────────────────────
  const persist = useCallback(async (
    r: ESGRating[], q: IRQuestionnaire[], d: DataRoomDoc[], f: IRFactsheetData
  ) => {
    const payload = { ratings: r, questionnaires: q, docs: d, factsheet: f };
    localStorage.setItem('ir_dashboard', JSON.stringify(payload));
    try { await api.post('/framework-data/investor_relations', { data: payload }); } catch { /* silent */ }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await persist(ratings, questionnaires, docs, factsheet);
    setSaving(false);
    toast.success(t('inv.toast.saved', 'Données Relations Investisseurs sauvegardées'));
  }, [ratings, questionnaires, docs, factsheet, persist]);

  // Auto-save localStorage on any change (API save only on explicit save)
  useEffect(() => {
    localStorage.setItem('ir_dashboard', JSON.stringify({ ratings, questionnaires, docs, factsheet }));
  }, [factsheet, ratings, questionnaires, docs]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const urgentQuests = useMemo(() =>
    questionnaires.filter(q => daysUntil(q.deadline) <= 30 && q.status !== 'submitted' && q.status !== 'scored'),
  [questionnaires]);

  const msciScore  = ratings.find(r => r.provider === 'MSCI')?.score  ?? '—';
  const cdpScore   = ratings.find(r => r.provider === 'CDP')?.score   ?? '—';
  const activeQuestCount = questionnaires.filter(q => q.status === 'in_progress').length;

  // ── Add handlers ──────────────────────────────────────────────────────────
  const addRating = () => {
    if (!newRating.provider || !newRating.score || !newRating.date) {
      toast.error(t('inv.toast.fillRequired', 'Veuillez remplir les champs obligatoires')); return;
    }
    const r: ESGRating = { id: Date.now().toString(), provider: newRating.provider!, score: newRating.score!, date: newRating.date!, trend: newRating.trend ?? 'stable', previousScore: newRating.previousScore ?? '', notes: newRating.notes ?? '', url: newRating.url ?? '' };
    const updated = [...ratings.filter(x => x.provider !== r.provider), r];
    setRatings(updated);
    setNewRating({ trend: 'stable' });
    setShowAddRating(false);
    toast.success(t('inv.toast.ratingAdded', 'Notation {{provider}} ajoutée', { provider: PROVIDERS[r.provider].name }));
  };

  const addDoc = () => {
    if (!newDoc.name) { toast.error(t('inv.toast.enterDocName', 'Veuillez saisir un nom de document')); return; }
    const d: DataRoomDoc = { id: Date.now().toString(), name: newDoc.name!, category: newDoc.category ?? 'autre', uploadDate: new Date().toISOString().slice(0, 10), size: '—', format: newDoc.format ?? 'PDF', accessLevel: newDoc.accessLevel ?? 'public', description: newDoc.description ?? '' };
    setDocs(prev => [...prev, d]);
    setNewDoc({ category: 'rapport_esg', format: 'PDF', accessLevel: 'public' });
    setShowAddDoc(false);
    toast.success(t('inv.toast.docSaved', 'Document enregistré dans la Data Room'));
  };

  const addQuest = () => {
    if (!newQuest.provider || !newQuest.deadline) { toast.error(t('inv.toast.fillAll', 'Veuillez remplir tous les champs')); return; }
    const q: IRQuestionnaire = { id: Date.now().toString(), provider: newQuest.provider!, year: newQuest.year ?? 2025, status: newQuest.status ?? 'not_started', deadline: newQuest.deadline!, score: '', completionPct: 0, notes: newQuest.notes ?? '', contactEmail: newQuest.contactEmail ?? '' };
    setQuestionnaires(prev => [...prev, q]);
    setNewQuest({ status: 'not_started', year: 2025, completionPct: 0 });
    setShowAddQuest(false);
    toast.success(t('inv.toast.questAdded', 'Questionnaire ajouté'));
  };

  const markSubmitted = (id: string) => {
    setQuestionnaires(prev => prev.map(q => q.id === id ? { ...q, status: 'submitted', completionPct: 100 } : q));
    toast.success(t('inv.toast.questSubmitted', 'Questionnaire marqué comme soumis'));
  };

  const deleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    toast.success(t('inv.toast.docDeleted', 'Document supprimé'));
  };

  const exportPDF = () => {
    toast.success(t('inv.toast.printOpening', 'Ouverture de la boîte de dialogue impression…'));
    setTimeout(() => window.print(), 400);
  };

  const copyMarkdown = () => {
    const md = `# ${t('inv.md.title', 'Fiche Investisseur ESG')} — ${factsheet.companyName} (${factsheet.reportingYear})

**${t('inv.md.sector', 'Secteur')} :** ${factsheet.sector} | **${t('inv.md.headcount', 'Effectif')} :** ${factsheet.employees} | **${t('inv.md.revenue', 'CA')} :** ${factsheet.revenue}
**${t('inv.md.globalNote', 'Note ESG globale')} :** ${factsheet.noteGlobale}

## ${t('inv.md.environment', 'Environnement')}
| ${t('inv.md.indicator', 'Indicateur')} | ${t('inv.md.value', 'Valeur')} |
|---|---|
| Scope 1 | ${factsheet.scope1} |
| Scope 2 | ${factsheet.scope2} |
| Scope 3 | ${factsheet.scope3} |
| ${t('inv.md.carbonIntensity', 'Intensité carbone')} | ${factsheet.intensityCarbone} |
| ${t('inv.md.renewableEnergy', 'Énergie renouvelable')} | ${factsheet.energieRenouvelable} |
| ${t('inv.md.water', 'Eau')} | ${factsheet.eau} |
| ${t('inv.md.recycledWaste', 'Déchets recyclés')} | ${factsheet.dechets} |

## Social
| ${t('inv.md.indicator', 'Indicateur')} | ${t('inv.md.value', 'Valeur')} |
|---|---|
| ${t('inv.md.womenShare', 'Part femmes')} | ${factsheet.femmes} |
| ${t('inv.md.accidentRate', 'Taux accidents (TRIR)')} | ${factsheet.accidents} |
| ${t('inv.md.training', 'Formation')} | ${factsheet.formationHeures} |

## ${t('inv.md.governance', 'Gouvernance')}
| ${t('inv.md.indicator', 'Indicateur')} | ${t('inv.md.value', 'Valeur')} |
|---|---|
| ${t('inv.md.sbtiTarget', 'Objectif SBTi')} | ${factsheet.objectifSBTi} |
| ${t('inv.md.cdpEngagement', 'Engagement CDP')} | ${factsheet.engagementCDP} |
| ${t('inv.md.taxonomyAlign', 'Alignement Taxonomie')} | ${factsheet.taxonomieAlignment} |

## ${t('inv.md.ratings', 'Notations ESG')}
${ratings.map(r => `- **${PROVIDERS[r.provider].name}** : ${r.score} (${fmtDate(r.date)})`).join('\n')}
`;
    navigator.clipboard.writeText(md).then(
      () => toast.success(t('inv.toast.mdCopied', 'Fiche copiée en Markdown')),
      () => toast.error(t('inv.toast.copyFailed', 'Impossible de copier dans le presse-papier')),
    );
  };

  // ── Filtered docs ─────────────────────────────────────────────────────────
  const filteredDocs = useMemo(() =>
    docCatFilter === 'all' ? docs : docs.filter(d => d.category === docCatFilter),
  [docs, docCatFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#0a0e27 0%,#1e2562 50%,#1a237e 100%)', padding: '2.5rem 2rem 2rem', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t('inv.hero.title', 'Relations Investisseurs ESG')}</h1>
              <p style={{ margin: '6px 0 0', color: '#93c5fd', fontSize: 14 }}>
                {t('inv.hero.subtitle', 'Notations · Questionnaires · Data Room · Fiche investisseur — Pilotage de la notation ESG')}
              </p>
            </div>
            <button onClick={handleSave} disabled={saving} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <CheckCircle size={16} /> {saving ? t('inv.btn.saving', 'Sauvegarde…') : t('inv.btn.save', 'Sauvegarder')}
            </button>
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
            {[
              { icon: <Award size={15} />, label: t('inv.stat.agencies', 'Agences suivies'),    value: String(ratings.length) },
              { icon: <Clock size={15} />,  label: t('inv.stat.activeQuests', 'Quests. actifs'),    value: String(activeQuestCount) },
              { icon: <BarChart2 size={15} />, label: t('inv.stat.msci', 'Note MSCI'),      value: msciScore },
              { icon: <Star size={15} />,   label: t('inv.stat.cdp', 'Score CDP'),         value: cdpScore },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ opacity: 0.8 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 0.3 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab stepper ───────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0 }}>
          {([
            { id: 'ratings',        label: t('inv.tab.ratings', '1. Notations ESG'),        icon: <Award size={15} /> },
            { id: 'questionnaires', label: '2. Questionnaires',        icon: <FileText size={15} /> },
            { id: 'dataroom',       label: '3. Data Room',             icon: <Download size={15} /> },
            { id: 'factsheet',      label: t('inv.tab.factsheet', '4. Fiche Investisseur'),    icon: <Star size={15} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '14px 22px', border: 'none', borderBottom: tab === tb.id ? '2px solid #3b82f6' : '2px solid transparent', background: 'none', color: tab === tb.id ? '#1d4ed8' : '#6b7280', fontWeight: tab === tb.id ? 700 : 500, cursor: 'pointer', fontSize: 13, transition: 'all .15s' }}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ================================================================
            TAB 1 — Notations ESG
        ================================================================ */}
        {tab === 'ratings' && (
          <div>
            {/* Add rating button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button onClick={() => setShowAddRating(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                <Plus size={15} /> {t('inv.rt.add', 'Ajouter une notation')}
              </button>
            </div>

            {/* Add rating form */}
            {showAddRating && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{t('inv.rt.newTitle', 'Nouvelle notation')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                  <select value={newRating.provider ?? ''} onChange={e => setNewRating(p => ({ ...p, provider: e.target.value as RatingProvider }))} style={inputStyle}>
                    <option value="">{t('inv.rt.agency', 'Agence *')}</option>
                    {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                  </select>
                  <input placeholder={t('inv.rt.scorePh', 'Score * (ex: AA, 72/100)')} value={newRating.score ?? ''} onChange={e => setNewRating(p => ({ ...p, score: e.target.value }))} style={inputStyle} />
                  <input type="date" placeholder={t('inv.rt.datePh', 'Date *')} value={newRating.date ?? ''} onChange={e => setNewRating(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                  <select value={newRating.trend ?? 'stable'} onChange={e => setNewRating(p => ({ ...p, trend: e.target.value as ESGRating['trend'] }))} style={inputStyle}>
                    <option value="up">{t('inv.rt.trendUp', '▲ Hausse')}</option>
                    <option value="stable">{t('inv.rt.trendStable', '= Stable')}</option>
                    <option value="down">{t('inv.rt.trendDown', '▼ Baisse')}</option>
                  </select>
                  <input placeholder={t('inv.rt.prevScorePh', 'Score précédent')} value={newRating.previousScore ?? ''} onChange={e => setNewRating(p => ({ ...p, previousScore: e.target.value }))} style={inputStyle} />
                  <input placeholder={t('inv.rt.urlPh', 'URL portail agence')} value={newRating.url ?? ''} onChange={e => setNewRating(p => ({ ...p, url: e.target.value }))} style={inputStyle} />
                  <input placeholder="Notes" value={newRating.notes ?? ''} onChange={e => setNewRating(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, gridColumn: 'span 2' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={addRating} style={btnPrimary}>{t('inv.btn.add', 'Ajouter')}</button>
                  <button onClick={() => setShowAddRating(false)} style={btnSecondary}>{t('inv.btn.cancel', 'Annuler')}</button>
                </div>
              </div>
            )}

            {/* Rating cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18, marginBottom: 32 }}>
              {ratings.map(r => {
                const meta = PROVIDERS[r.provider];
                const TrendIcon = r.trend === 'up' ? TrendingUp : r.trend === 'down' ? TrendingDown : Minus;
                const trendColor = r.trend === 'up' ? '#16a34a' : r.trend === 'down' ? '#dc2626' : '#6b7280';
                return (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20, borderTop: `4px solid ${meta.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>{meta.logo}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{meta.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{meta.scaleDesc}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: meta.color, margin: '10px 0 4px' }}>{r.score}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: trendColor, fontSize: 13, marginBottom: 8 }}>
                      <TrendIcon size={15} />
                      <span>{r.trend === 'up' ? t('inv.rt.up', 'Hausse') : r.trend === 'down' ? t('inv.rt.down', 'Baisse') : t('inv.rt.stable', 'Stable')}</span>
                      {r.previousScore && <span style={{ color: '#9ca3af', fontSize: 12 }}>{t('inv.rt.prevInline', '| Précédent : {{score}}', { score: r.previousScore })}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{t('inv.rt.evaluation', 'Évaluation : {{date}}', { date: fmtDate(r.date) })}</div>
                    {r.notes && <div style={{ fontSize: 12, color: '#374151', background: '#f9fafb', borderRadius: 6, padding: '6px 8px', marginBottom: 10 }}>{r.notes}</div>}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>
                        <ExternalLink size={12} /> {t('inv.rt.portal', 'Portail agence')}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Visual score comparison bar chart */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={18} color="#1d4ed8" /> {t('inv.rt.compareTitle', 'Comparaison des scores normalisés')}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#6b7280' }}>{t('inv.rt.compareDesc', 'Scores ramenés sur 100 pour comparaison inter-agences. Pour Sustainalytics : score inversé (risque faible = barre haute).')}</p>
              {ratings.map(r => {
                const pct = normaliseScore(r.provider, r.score);
                const meta = PROVIDERS[r.provider];
                return (
                  <div key={r.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{meta.logo} {meta.name}</span>
                      <span style={{ color: meta.color, fontWeight: 700 }}>{r.score} ({pct}/100)</span>
                    </div>
                    <div style={{ height: 10, background: '#f3f4f6', borderRadius: 999 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 999, transition: 'width .4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Peer gap analysis */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{t('inv.rt.recoTitle', '💡 Recommandations pour progresser')}</div>
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
                {t('inv.rt.reco1pre', 'Pour améliorer votre score ')}<strong>{t('inv.rt.reco1strong', 'MSCI de AA à AAA')}</strong>{t('inv.rt.reco1post', ', les actions prioritaires sont : réduction Scope 3, reporting eau plus détaillé, objectifs SBTi validés.')}<br />
                {t('inv.rt.reco2pre', 'Pour progresser sur ')}<strong>{t('inv.rt.reco2strong', 'CDP de B à A')}</strong>{t('inv.rt.reco2post', " : mise en place d'un plan d'action climatique certifié, objectif SBTI validé 1,5°C et divulgation complète des risques climatiques physiques et de transition.")}
              </p>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2 — Questionnaires
        ================================================================ */}
        {tab === 'questionnaires' && (
          <div>
            {/* Urgent deadline banner */}
            {urgentQuests.length > 0 && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                {urgentQuests.map(q => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#991b1b', marginBottom: 4 }}>
                    <AlertCircle size={15} />
                    <strong>{t('inv.qu.urgentStrong', '⚠️ Questionnaire {{provider}} {{year}}', { provider: PROVIDERS[q.provider].name, year: q.year })}</strong>{t('inv.qu.urgentRest', ' à soumettre avant le {{date}} — {{pct}}% complété', { date: fmtDate(q.deadline), pct: q.completionPct })}
                  </div>
                ))}
              </div>
            )}

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Total',         value: questionnaires.length,                                               color: '#1d4ed8', bg: '#eff6ff' },
                { label: t('inv.qu.statSubmitted', 'Soumis'),        value: questionnaires.filter(q => q.status === 'submitted' || q.status === 'scored').length,  color: '#065f46', bg: '#d1fae5' },
                { label: t('inv.qu.statInProgress', 'En cours'),      value: questionnaires.filter(q => q.status === 'in_progress').length,       color: '#92400e', bg: '#fef3c7' },
                { label: t('inv.qu.statNotStarted', 'Non commencés'), value: questionnaires.filter(q => q.status === 'not_started').length,       color: '#6b7280', bg: '#f3f4f6' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 20px', textAlign: 'center', minWidth: 110 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 12, color, opacity: 0.8 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Add questionnaire toggle */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowAddQuest(v => !v)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Plus size={14} /> {t('inv.qu.add', 'Ajouter un questionnaire')}
              </button>
            </div>

            {showAddQuest && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                  <select value={newQuest.provider ?? ''} onChange={e => setNewQuest(p => ({ ...p, provider: e.target.value as RatingProvider }))} style={inputStyle}>
                    <option value="">{t('inv.rt.agency', 'Agence *')}</option>
                    {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                  </select>
                  <input type="number" placeholder={t('inv.qu.yearPh', 'Année')} value={newQuest.year ?? 2025} onChange={e => setNewQuest(p => ({ ...p, year: parseInt(e.target.value) }))} style={inputStyle} />
                  <input type="date" placeholder={t('inv.qu.deadlinePh', 'Échéance *')} value={newQuest.deadline ?? ''} onChange={e => setNewQuest(p => ({ ...p, deadline: e.target.value }))} style={inputStyle} />
                  <input placeholder={t('inv.qu.emailPh', 'Email contact')} value={newQuest.contactEmail ?? ''} onChange={e => setNewQuest(p => ({ ...p, contactEmail: e.target.value }))} style={inputStyle} />
                  <input placeholder="Notes" value={newQuest.notes ?? ''} onChange={e => setNewQuest(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={addQuest} style={btnPrimary}>{t('inv.btn.add', 'Ajouter')}</button>
                  <button onClick={() => setShowAddQuest(false)} style={btnSecondary}>{t('inv.btn.cancel', 'Annuler')}</button>
                </div>
              </div>
            )}

            {/* Questionnaire table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {[t('inv.qu.thAgency', 'Agence'), t('inv.qu.thYear', 'Année'), t('inv.qu.thStatus', 'Statut'), t('inv.qu.thDeadline', 'Échéance'), t('inv.qu.thCompletion', 'Complétude'), 'Score', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {questionnaires.map((q, i) => {
                    const days = daysUntil(q.deadline);
                    const dlColor = days < 30 ? '#dc2626' : days < 60 ? '#d97706' : '#374151';
                    const sm = STATUS_META[q.status];
                    return (
                      <tr key={q.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          <span style={{ marginRight: 6 }}>{PROVIDERS[q.provider].logo}</span>
                          {PROVIDERS[q.provider].name.split(' ')[0]}
                        </td>
                        <td style={{ padding: '12px 14px' }}>{q.year}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sm.bg, color: sm.text, borderRadius: 6, padding: '3px 8px', fontWeight: 600, fontSize: 12 }}>
                            {sm.icon} {sm.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: dlColor, fontWeight: 600 }}>{fmtDate(q.deadline)}</td>
                        <td style={{ padding: '12px 14px', minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 999 }}>
                              <div style={{ height: '100%', width: `${q.completionPct}%`, background: q.completionPct === 100 ? '#16a34a' : '#3b82f6', borderRadius: 999 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 30 }}>{q.completionPct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#6b7280' }}>{q.score || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {q.provider === 'CDP' && (
                              <a href="/app/compliance/cdp" style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ExternalLink size={12} /> {t('inv.qu.open', 'Ouvrir')}
                              </a>
                            )}
                            {(q.status === 'in_progress' || q.status === 'not_started') && (
                              <button onClick={() => markSubmitted(q.id)} style={{ fontSize: 12, background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                                {t('inv.qu.markSubmitted', 'Marquer soumis')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 3 — Data Room
        ================================================================ */}
        {tab === 'dataroom' && (
          <div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#1e40af' }}>
              <strong>{t('inv.dr.bannerStrong', 'Data Room ESG :')}</strong> {t('inv.dr.bannerText', "Votre Data Room regroupe tous les documents partagés avec vos investisseurs et analystes ESG. Gérez les niveaux d'accès et maintenez un historique de vos publications.")}
            </div>

            {/* Category filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {([['all', t('inv.dr.filterAll', 'Tous')]] as [string, string][]).concat(
                Object.entries(DOC_CATEGORIES).map(([k, v]) => [k, v.label])
              ).map(([k, label]) => (
                <button key={k} onClick={() => setDocCatFilter(k as typeof docCatFilter)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: docCatFilter === k ? '#1d4ed8' : '#e5e7eb', background: docCatFilter === k ? '#1d4ed8' : '#fff', color: docCatFilter === k ? '#fff' : '#374151', fontSize: 13, fontWeight: docCatFilter === k ? 700 : 500, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Add document toggle */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowAddDoc(v => !v)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Plus size={14} /> {t('inv.dr.add', 'Ajouter un document')}
              </button>
            </div>

            {showAddDoc && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                  <input placeholder={t('inv.dr.namePh', 'Nom du document *')} value={newDoc.name ?? ''} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, gridColumn: 'span 2' }} />
                  <select value={newDoc.category ?? 'rapport_esg'} onChange={e => setNewDoc(p => ({ ...p, category: e.target.value as DataRoomDoc['category'] }))} style={inputStyle}>
                    {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={newDoc.format ?? 'PDF'} onChange={e => setNewDoc(p => ({ ...p, format: e.target.value as DataRoomDoc['format'] }))} style={inputStyle}>
                    {['PDF', 'Excel', 'Word', 'CSV', 'Other'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={newDoc.accessLevel ?? 'public'} onChange={e => setNewDoc(p => ({ ...p, accessLevel: e.target.value as DataRoomDoc['accessLevel'] }))} style={inputStyle}>
                    <option value="public">Public</option>
                    <option value="restricted">{t('inv.acc.restricted', 'Restreint')}</option>
                    <option value="confidential">{t('inv.acc.confidential', 'Confidentiel')}</option>
                  </select>
                  <textarea placeholder="Description" value={newDoc.description ?? ''} onChange={e => setNewDoc(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, gridColumn: 'span 2', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={addDoc} style={btnPrimary}>{t('inv.btn.saveDoc', 'Enregistrer')}</button>
                  <button onClick={() => setShowAddDoc(false)} style={btnSecondary}>{t('inv.btn.cancel', 'Annuler')}</button>
                </div>
              </div>
            )}

            {/* Document table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {[t('inv.dr.thName', 'Nom'), t('inv.dr.thCategory', 'Catégorie'), 'Format', t('inv.dr.thSize', 'Taille'), 'Date', t('inv.dr.thAccess', 'Accès'), 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((d, i) => {
                    const cat = DOC_CATEGORIES[d.category];
                    const acc = ACCESS_META[d.accessLevel];
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <FileText size={14} color="#6b7280" /> {d.name}
                          </div>
                          {d.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{d.description}</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: cat.color + '20', color: cat.color, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: FORMAT_COLORS[d.format] + '20', color: FORMAT_COLORS[d.format], borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{d.format}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#6b7280' }}>{d.size}</td>
                        <td style={{ padding: '12px 14px', color: '#6b7280' }}>{fmtDate(d.uploadDate)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: acc.bg, color: acc.text, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>{acc.label}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={() => toast(t('inv.dr.enterpriseToast', 'Dans la version Enterprise, les documents sont hébergés sur votre espace sécurisé'), { icon: '🔒' })} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontWeight: 600 }}>
                              <Download size={12} /> {t('inv.dr.download', 'Télécharger')}
                            </button>
                            <button onClick={() => deleteDoc(d.id)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDocs.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>{t('inv.dr.empty', 'Aucun document dans cette catégorie')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 4 — Fiche Investisseur
        ================================================================ */}
        {tab === 'factsheet' && (
          <div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'flex-end' }}>
              <button onClick={copyMarkdown} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} /> {t('inv.fs.copyMd', 'Copier en Markdown')}
              </button>
              <button onClick={exportPDF} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Download size={14} /> {t('inv.fs.exportPdf', 'Exporter PDF')}
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              {/* Factsheet header */}
              <div style={{ background: 'linear-gradient(135deg,#0a0e27,#1e2562)', color: '#fff', padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{t('inv.fs.cardTitle', 'Fiche Investisseur ESG')}</div>
                  <input value={factsheet.companyName} onChange={e => setFactsheet(p => ({ ...p, companyName: e.target.value }))} style={{ fontSize: 22, fontWeight: 800, background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
                    <FSField label={t('inv.fs.sector', 'Secteur')}  value={factsheet.sector}        onChange={v => setFactsheet(p => ({ ...p, sector: v }))}        light />
                    <FSField label={t('inv.fs.employees', 'Effectif')} value={factsheet.employees}     onChange={v => setFactsheet(p => ({ ...p, employees: v }))}     light />
                    <FSField label={t('inv.fs.revenue', 'CA')}       value={factsheet.revenue}       onChange={v => setFactsheet(p => ({ ...p, revenue: v }))}       light />
                    <FSField label={t('inv.fs.year', 'Année')}    value={factsheet.reportingYear} onChange={v => setFactsheet(p => ({ ...p, reportingYear: v }))} light />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{t('inv.fs.globalNote', 'Note ESG Globale')}</div>
                  <input value={factsheet.noteGlobale} onChange={e => setFactsheet(p => ({ ...p, noteGlobale: e.target.value }))} style={{ fontSize: 48, fontWeight: 900, background: 'transparent', border: 'none', color: '#60a5fa', textAlign: 'right', width: 120, outline: 'none' }} />
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{t('inv.fs.compositeNote', 'Notation interne composite')}</div>
                </div>
              </div>

              {/* Body — two columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

                {/* Left — KPI sections */}
                <div style={{ padding: 24, borderRight: '1px solid #e5e7eb' }}>

                  {/* Environnement */}
                  <SectionTitle icon="🌍" label={t('inv.fs.envTitle', 'Environnement')} color="#16a34a" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <FSKpi label="Scope 1"              value={factsheet.scope1}            onChange={v => setFactsheet(p => ({ ...p, scope1: v }))} />
                    <FSKpi label="Scope 2"              value={factsheet.scope2}            onChange={v => setFactsheet(p => ({ ...p, scope2: v }))} />
                    <FSKpi label="Scope 3"              value={factsheet.scope3}            onChange={v => setFactsheet(p => ({ ...p, scope3: v }))} />
                    <FSKpi label={t('inv.fs.carbonIntensity', 'Intensité carbone')}    value={factsheet.intensityCarbone}  onChange={v => setFactsheet(p => ({ ...p, intensityCarbone: v }))} />
                    <FSKpi label={t('inv.fs.renewableEnergy', 'Énergie renouvelable')} value={factsheet.energieRenouvelable} onChange={v => setFactsheet(p => ({ ...p, energieRenouvelable: v }))} />
                    <FSKpi label={t('inv.fs.waterConsumed', 'Eau consommée')}        value={factsheet.eau}               onChange={v => setFactsheet(p => ({ ...p, eau: v }))} />
                    <FSKpi label={t('inv.fs.waste', 'Déchets')}              value={factsheet.dechets}           onChange={v => setFactsheet(p => ({ ...p, dechets: v }))} />
                  </div>

                  {/* Social */}
                  <SectionTitle icon="👥" label="Social" color="#2563eb" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <FSKpi label={t('inv.fs.womenShare', 'Part femmes')}       value={factsheet.femmes}         onChange={v => setFactsheet(p => ({ ...p, femmes: v }))} />
                    <FSKpi label="TRIR accidents"    value={factsheet.accidents}      onChange={v => setFactsheet(p => ({ ...p, accidents: v }))} />
                    <FSKpi label={t('inv.fs.training', 'Formation (h/ETP)')} value={factsheet.formationHeures} onChange={v => setFactsheet(p => ({ ...p, formationHeures: v }))} />
                  </div>

                  {/* Gouvernance */}
                  <SectionTitle icon="🏛️" label={t('inv.fs.govTitle', 'Gouvernance')} color="#7c3aed" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{t('inv.fs.sbtiTarget', 'Objectif SBTi')}</div>
                      <select value={factsheet.objectifSBTi} onChange={e => setFactsheet(p => ({ ...p, objectifSBTi: e.target.value }))} style={{ ...inputStyle, fontSize: 13 }}>
                        <option>Non</option>
                        <option>Engagé</option>
                        <option>Validé 2°C</option>
                        <option>Validé 1.5°C</option>
                      </select>
                    </div>
                    <FSKpi label={t('inv.fs.cdpEngagement', 'Engagement CDP')}        value={factsheet.engagementCDP}     onChange={v => setFactsheet(p => ({ ...p, engagementCDP: v }))} />
                    <FSKpi label={t('inv.fs.taxonomyAlign', 'Alignement Taxonomie')}  value={factsheet.taxonomieAlignment} onChange={v => setFactsheet(p => ({ ...p, taxonomieAlignment: v }))} />
                  </div>
                </div>

                {/* Right — Ratings summary */}
                <div style={{ padding: 24 }}>
                  <SectionTitle icon="📊" label={t('inv.fs.ratingsTitle', 'Notations ESG')} color="#1d4ed8" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ratings.map(r => {
                      const meta = PROVIDERS[r.provider];
                      const TrendIcon = r.trend === 'up' ? TrendingUp : r.trend === 'down' ? TrendingDown : Minus;
                      const trendColor = r.trend === 'up' ? '#16a34a' : r.trend === 'down' ? '#dc2626' : '#6b7280';
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: 10, borderLeft: `4px solid ${meta.color}` }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{meta.logo} {meta.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{fmtDate(r.date)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{r.score}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: trendColor, fontSize: 11 }}>
                              <TrendIcon size={11} /> {r.previousScore && `vs ${r.previousScore}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {ratings.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>{t('inv.fs.noRatings', "Aucune notation enregistrée — renseignez l'onglet Notations ESG.")}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SectionTitle({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${color}30` }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{label}</span>
    </div>
  );
}

function FSKpi({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }} />
    </div>
  );
}

function FSField({ label, value, onChange, light }: { label: string; value: string; onChange: (v: string) => void; light?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)', color: light ? '#fff' : '#111', fontSize: 13, outline: 'none', width: 120 }} />
    </div>
  );
}

// ─── Shared inline styles ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
};

const btnPrimary: React.CSSProperties = {
  background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13,
};

const btnSecondary: React.CSSProperties = {
  background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13,
};
