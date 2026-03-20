import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  RefreshCw, Sparkles, Activity, CheckCircle, ArrowRight, Zap,
  Target, Minus, MessageSquare, Send, FileText, Upload,
  Leaf, BarChart2, ChevronRight, Download, Loader2, Globe,
  Building2, Factory, Truck, Users, Package, Flame,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Anomaly {
  id: string; metric_name: string; value: number;
  expected_range: string; deviation: string;
  severity: 'high' | 'medium'; period: string;
  category: string; pillar: string; message: string;
}

interface Suggestion {
  category: string; priority: 'high' | 'medium' | 'low';
  title: string; description: string;
  action: string; impact: string; effort: string;
}

interface Prediction {
  indicator_id: string; indicator_name: string;
  indicator_code: string; unit: string;
  historical_points: number; r2_score: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  last_value: number;
  predicted_next_month: number | null;
  predicted_next_year: number | null;
  future_points: Array<{ date: string; predicted_value: number; confidence: number }>;
}

interface Insights {
  year: number;
  data_quality: { total_count: number; verified_count: number; completion_rate: number };
  trends: { improving_metrics: number; declining_metrics: number; stable_metrics: number };
  recommendations: Array<{ type: string; priority: string; message: string; action: string }>;
  achievements: Array<{ type: string; message: string }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', labelKey: 'ia.priorityHigh' },
  medium: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', labelKey: 'ia.priorityMedium' },
  low: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', labelKey: 'ia.priorityLow' },
};

const TREND_CONFIG = {
  increasing: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', labelKey: 'ia.trendUp' },
  decreasing: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', labelKey: 'ia.trendDown' },
  stable: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50', labelKey: 'ia.trendStable' },
};

const CURRENT_YEAR = new Date().getFullYear();

// ─── Chatbot responses ────────────────────────────────────────────────────────

const ESG_KB: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ['csrd', 'conformité', 'directive', 'réglementation'],
    response: `**Conformité CSRD** ✅\n\nLa Corporate Sustainability Reporting Directive (CSRD) impose depuis 2024 un reporting ESG standardisé selon les **European Sustainability Reporting Standards (ESRS)**.\n\n**Calendrier d'application :**\n- 2024 : Grandes entreprises >500 salariés (rapport 2025)\n- 2025 : Entreprises >250 salariés ou >40M€ CA\n- 2026 : PME cotées\n\n**Ce que nous couvrons :** 100+ indicateurs ESRS pré-configurés, double matérialité documentée, export rapport conforme.\n\nSouhaitez-vous un audit de votre complétude ESRS ?`,
  },
  {
    keywords: ['scope 3', 'scope3', 'émissions indirectes', 'chaîne de valeur'],
    response: `**Scope 3 — Émissions indirectes** 🌍\n\nLe Scope 3 représente **70 à 90% des émissions** d'une entreprise. Il couvre 15 catégories GHG Protocol :\n\n**Amont :**\n1. Achats de biens & services\n2. Biens d'équipement\n3. Activités liées à l'énergie\n4. Transport & distribution amont\n5. Déchets d'exploitation\n6. Déplacements professionnels\n7. Trajets domicile-travail\n8. Actifs en location-bail (amont)\n\n**Aval :**\n9. Transport & distribution aval\n10. Transformation des produits vendus\n11. Utilisation des produits vendus\n12. Fin de vie des produits vendus\n13. Actifs en location-bail (aval)\n14. Franchises\n15. Investissements\n\nAccédez au **Bilan Carbone** pour saisir vos données par catégorie avec les facteurs ADEME.`,
  },
  {
    keywords: ['score', 'notation', 'performance', 'kpi', 'indicateur'],
    response: `**Score ESG** 📊\n\nVotre score ESG est calculé automatiquement sur 3 piliers :\n\n- **E - Environnemental** : Émissions GES, énergie, eau, biodiversité\n- **S - Social** : Emploi, formation, diversité, santé-sécurité\n- **G - Gouvernance** : Éthique, transparence, lutte corruption\n\n**Méthodologie :** Chaque indicateur est pondéré selon son importance ESRS. Le score global est une moyenne pondérée de 0 à 100.\n\n**Améliorer votre score :**\n→ Complétez les données manquantes (impact direct +5 à +15 pts)\n→ Réduisez vos émissions Scope 1 & 2\n→ Mettez en place un programme de formation\n\nConsultez votre **Dashboard Exécutif** pour le détail complet.`,
  },
  {
    keywords: ['rapport', 'rapport', 'gri', 'tcfd', 'pdf', 'générer', 'publier'],
    response: `**Génération de rapports** 📄\n\nESGFlow génère automatiquement 3 types de rapports conformes :\n\n| Standard | Couverture | Usage |\n|---------|-----------|-------|
| **CSRD/ESRS** | Tous piliers E,S,G | Réglementaire EU |
| **GRI** | Universel | Parties prenantes |
| **TCFD** | Climat & risques | Investisseurs |

**Pour générer :** Allez dans **Rapports → Générer un rapport**, sélectionnez le standard et la période. Le PDF est prêt en moins d'1 minute.

💡 *Conseil IA :* Votre taux de complétude doit dépasser 70% pour un rapport de qualité. Vérifiez l'onglet **Données manquantes** ci-dessus.`,
  },
  {
    keywords: ['matérialité', 'double matérialité', 'enjeux', 'parties prenantes'],
    response: `**Double Matérialité CSRD** 🎯\n\nLa CSRD exige une analyse de double matérialité selon 2 dimensions :\n\n**1. Matérialité d'impact** (Outside-in)\nComment votre entreprise **impacte** l'environnement et la société ?\n→ Émissions CO₂, conditions de travail, droits humains...\n\n**2. Matérialité financière** (Inside-out)\nComment les enjeux ESG **affectent financièrement** votre entreprise ?\n→ Risques climatiques, transition énergétique, réputation...\n\n**Notre outil de matérialité :**\n✅ Questionnaire parties prenantes intégré\n✅ Matrice drag & drop\n✅ Suggestions d'enjeux par secteur\n✅ Export rapport de matérialité\n\nAccédez à la **Matrice de Matérialité** dans le menu Analyse.`,
  },
  {
    keywords: ['anomalie', 'erreur', 'incohérence', 'données incorrectes'],
    response: `**Détection d'anomalies IA** 🔍\n\nNotre moteur IA analyse vos données ESG en temps réel et détecte :\n\n**Types d'anomalies détectées :**\n- Valeurs hors plage normale (>2σ de la moyenne historique)\n- Données manquantes sur des indicateurs obligatoires ESRS\n- Incohérences entre indicateurs corrélés\n- Valeurs aberrantes vs benchmarks sectoriels\n\n**Sévérité :**\n🔴 **Critique** : Impact sur la conformité CSRD\n🟡 **Modéré** : Qualité des données à vérifier\n\nConsultez l'onglet **Anomalies** pour voir les alertes actives sur vos données.`,
  },
  {
    keywords: ['réduire', 'réduction', 'améliorer', 'optimiser', 'conseil'],
    response: `**Leviers de réduction ESG** ♻️\n\n**Quick wins (impact rapide) :**\n1. ⚡ Passer aux LED & éclairage intelligent → -15% conso électrique\n2. 🚗 Programme télétravail 2j/semaine → -30% émissions déplacements\n3. 💡 Optimisation HVAC & isolation → -20% énergie bâtiments\n\n**Actions structurelles :**\n4. 🌱 Approvisionnement fournisseurs locaux → Scope 3 cat.1 -25%\n5. 🔋 Installation panneaux solaires → Scope 2 -40 à -80%\n6. 🚛 Optimisation logistique → Scope 3 cat.4 -20%\n\n**Impact formation :**\n7. 📚 Programmes formation ESG → +8 pts score Social\n8. 👥 Politique diversité & inclusion → +6 pts score Social\n\nConsultez l'onglet **Réduction Carbone** pour une analyse personnalisée avec benchmarks sectoriels.`,
  },
];

function getESGResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of ESG_KB) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.response;
    }
  }
  return `**Bonne question !** 🤖\n\nJe suis l'assistant ESG d'ESGFlow. Je peux vous aider sur :\n\n- 📋 **Conformité CSRD/ESRS** — indicateurs requis, calendrier\n- 🌍 **Bilan carbone** — Scope 1, 2, 3 et catégories GHG Protocol\n- 📊 **Score ESG** — méthodologie et amélioration\n- 📄 **Rapports** — GRI, CSRD, TCFD\n- 🎯 **Matérialité** — double matérialité, parties prenantes\n- 🔍 **Anomalies** — interprétation des alertes\n- ♻️ **Réduction** — leviers d'action concrets\n\nPosez-moi une question plus précise ou utilisez les suggestions ci-dessus.`;
}

// ─── Reduction levers data ────────────────────────────────────────────────────

const REDUCTION_LEVERS = [
  { icon: Flame, category: 'Énergie', label: 'Passage énergies renouvelables', impact: 85, effort: 'Élevé', saving: '-45% Scope 2', color: 'orange', timeframe: '12-24 mois', roi: '4-7 ans' },
  { icon: Leaf, category: 'Bâtiment', label: 'Isolation & optimisation HVAC', impact: 72, effort: 'Moyen', saving: '-20% conso bâtiment', color: 'green', timeframe: '6-12 mois', roi: '3-5 ans' },
  { icon: Truck, category: 'Logistique', label: 'Optimisation des tournées', impact: 65, effort: 'Faible', saving: '-18% Scope 3 cat.4', color: 'blue', timeframe: '1-3 mois', roi: '< 1 an' },
  { icon: Users, category: 'Mobilité', label: 'Politique télétravail 2j/sem', saving: '-30% déplacements', impact: 60, effort: 'Faible', color: 'purple', timeframe: '1 mois', roi: 'Immédiat' },
  { icon: Package, category: 'Achats', label: 'Sourcing fournisseurs locaux', impact: 55, effort: 'Moyen', saving: '-25% Scope 3 cat.1', color: 'teal', timeframe: '6-18 mois', roi: 'Variable' },
  { icon: Globe, category: 'Déplacements', label: 'Politique voyages d\'affaires', impact: 48, effort: 'Faible', saving: '-35% déplacements pro', color: 'indigo', timeframe: '1 mois', roi: 'Immédiat' },
  { icon: Building2, category: 'Bâtiment', label: 'Panneaux solaires sur site', impact: 78, effort: 'Élevé', saving: '-40 à -80% Scope 2', color: 'yellow', timeframe: '12-18 mois', roi: '5-8 ans' },
  { icon: Factory, category: 'Production', label: 'Efficience process industriels', impact: 70, effort: 'Élevé', saving: '-15% Scope 1', color: 'red', timeframe: '12-36 mois', roi: '3-6 ans' },
];

const SECTOR_BENCHMARKS = [
  { sector: 'Industrie', score: 42, color: '#ef4444' },
  { sector: 'Services', score: 61, color: '#f59e0b' },
  { sector: 'Distribution', score: 54, color: '#f59e0b' },
  { sector: 'Tech', score: 73, color: '#22c55e' },
  { sector: 'Finance', score: 68, color: '#22c55e' },
  { sector: 'Votre score', score: 78, color: '#7c3aed' },
];

const MISSING_DATA_EXAMPLES = [
  { category: 'Environnement', indicator: 'Consommation d\'eau (m³)', priority: 'high', esrs: 'E3-4' },
  { category: 'Social', indicator: 'Heures de formation par salarié', priority: 'high', esrs: 'S1-13' },
  { category: 'Gouvernance', indicator: 'Politique anti-corruption', priority: 'medium', esrs: 'G1-3' },
  { category: 'Environnement', indicator: 'Déchets valorisés (%)', priority: 'medium', esrs: 'E5-5' },
  { category: 'Social', indicator: 'Écart de rémunération H/F', priority: 'medium', esrs: 'S1-16' },
];

// ─── Component ────────────────────────────────────────────────────────────────

type TabId = 'predictions' | 'anomalies' | 'insights' | 'suggestions' | 'chatbot' | 'generation' | 'reduction';

export default function IntelligenceDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('predictions');

  // Existing state
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [horizon, setHorizon] = useState(12);
  const [totalPredictions, setTotalPredictions] = useState(0);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Bonjour ! 👋 Je suis votre **assistant ESG intelligent**.\n\nJe peux vous aider sur la conformité CSRD, le bilan carbone, vos scores ESG, la génération de rapports, ou vous donner des conseils de réduction.\n\nQue puis-je faire pour vous aujourd'hui ?`,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generation state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [ocrUploading, setOcrUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ vendor: string; amount: number; category: string; co2: number } | null>(null);

  // Reduction state
  const [selectedSector, setSelectedSector] = useState('Services');

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadPredictions(); }, [horizon]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadAnomalies(), loadInsights(), loadSuggestions(), loadPredictions()]);
    setLoading(false);
  };

  const loadAnomalies = async () => {
    try { const r = await api.get('/analytics/anomalies'); setAnomalies(r.data?.anomalies || []); }
    catch { setAnomalies([]); }
  };

  const loadInsights = async () => {
    try { const r = await api.get(`/analytics/insights?year=${CURRENT_YEAR}`); setInsights(r.data); }
    catch { setInsights(null); }
  };

  const loadSuggestions = async () => {
    try { const r = await api.get(`/analytics/suggestions?year=${CURRENT_YEAR}`); setSuggestions(r.data?.suggestions || []); }
    catch { setSuggestions([]); }
  };

  const loadPredictions = async () => {
    try {
      const r = await api.get(`/analytics/predictions?horizon=${horizon}`);
      const preds = r.data?.predictions || [];
      setPredictions(preds);
      setTotalPredictions(r.data?.total_indicators || 0);
      if (preds.length > 0) setSelectedPrediction(preds[0]);
    } catch { setPredictions([]); }
  };

  const buildChartData = (pred: Prediction) =>
    pred.future_points.slice(0, horizon).map((p) => ({
      date: format(new Date(p.date), 'MMM yy', { locale: fr }),
      Prévision: p.predicted_value,
      'Borne haute': p.predicted_value * (1 + (1 - p.confidence) * 0.12),
      'Borne basse': p.predicted_value * (1 - (1 - p.confidence) * 0.12),
    }));

  // ── Chatbot ──
  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    const response = getESGResponse(text);
    setChatMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
    setChatLoading(false);
  };

  const quickPrompts = [
    'Qu\'est-ce que la conformité CSRD ?',
    'Comment améliorer mon score ESG ?',
    'Expliquez le Scope 3',
    'Quels rapports puis-je générer ?',
    'Qu\'est-ce que la double matérialité ?',
    'Quels leviers de réduction carbone ?',
  ];

  // ── OCR simulation ──
  const simulateOCR = async () => {
    setOcrUploading(true);
    setOcrResult(null);
    await new Promise(r => setTimeout(r, 2200));
    setOcrResult({
      vendor: 'Transport Express SA',
      amount: 12450,
      category: 'Transport & distribution amont (Cat. 4)',
      co2: 3.8,
    });
    setOcrUploading(false);
  };

  // ── Report generation simulation ──
  const simulateGeneration = async () => {
    setGeneratingReport(true);
    setReportGenerated(false);
    await new Promise(r => setTimeout(r, 2800));
    setGeneratingReport(false);
    setReportGenerated(true);
  };

  // ── Render markdown-ish ──
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-gray-900 mb-1">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('→ ')) {
          return <p key={i} className="ml-3 text-sm text-gray-700">{line}</p>;
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="ml-3 text-sm text-gray-700">{line}</p>;
        }
        if (line.startsWith('#')) {
          return null;
        }
        // inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-sm text-gray-700 mb-0.5">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </p>
        );
      });
  };

  const TABS: Array<{ id: TabId; label: string; icon: React.FC<{ className?: string }>; count?: number; isNew?: boolean }> = [
    { id: 'predictions', label: t('ia.tabPredictive'), icon: Brain, count: totalPredictions },
    { id: 'anomalies', label: t('ia.tabAnomalies'), icon: AlertTriangle, count: anomalies.length },
    { id: 'insights', label: t('ia.tabInsights'), icon: Lightbulb, count: insights?.recommendations?.length ?? 0 },
    { id: 'suggestions', label: t('ia.tabSuggestions'), icon: Sparkles, count: suggestions.length },
    { id: 'chatbot', label: t('ia.tabAssistant'), icon: MessageSquare, isNew: true },
    { id: 'generation', label: t('ia.tabGeneration'), icon: FileText, isNew: true },
    { id: 'reduction', label: t('ia.tabReduction'), icon: Leaf, isNew: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">{t('ia.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-800 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              <Brain className="h-3.5 w-3.5" />
              Intelligence Artificielle — niveau Sweep & Greenly
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-4xl font-bold tracking-tight">
              <Zap className="h-10 w-10 text-violet-300" />
              {t('ia.title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
              {t('ia.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('ia.heroStatPredictions'), value: totalPredictions },
              { label: t('ia.heroStatAnomalies'), value: anomalies.length },
              { label: t('ia.heroStatSuggestions'), value: suggestions.length },
              { label: t('ia.heroStatLevers'), value: REDUCTION_LEVERS.length },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      {insights && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600">{t('ia.kpiCompleteness')}</p>
              <span className="text-2xl font-bold text-teal-600">{insights.data_quality.completion_rate.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full">
              <div className="h-2 bg-teal-500 rounded-full" style={{ width: `${insights.data_quality.completion_rate}%` }} />
            </div>
          </Card>
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{t('ia.kpiRising')}</p>
              <span className="text-2xl font-bold text-green-600">{insights.trends.improving_metrics}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">↑ {insights.trends.improving_metrics} {t('ia.kpiImproved')}</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">↓ {insights.trends.declining_metrics} {t('ia.kpiDeclining')}</span>
            </div>
          </Card>
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">{t('ia.kpiVerified')}</p>
              <span className="text-2xl font-bold text-purple-600">{insights.data_quality.verified_count}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('ia.kpiOnPoints', { count: insights.data_quality.total_count })}</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  active ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.isNew && (
                  <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>
                )}
                {!tab.isNew && tab.count !== undefined && tab.count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── PREDICTIONS ── */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('ia.predictionsTitle')}</h2>
              <p className="text-sm text-gray-500">{t('ia.predictionsDesc')}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value={3}>{t('ia.horizon3m')}</option>
                <option value={6}>{t('ia.horizon6m')}</option>
                <option value={12}>{t('ia.horizon12m')}</option>
                <option value={24}>{t('ia.horizon12m')}</option>
              </select>
              <button onClick={loadPredictions} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition">
                <Brain className="h-4 w-4" /> {t('ia.recalculate')}
              </button>
            </div>
          </div>

          {predictions.length === 0 ? (
            <Card className="border border-gray-200">
              <div className="py-16 text-center">
                <Brain className="mx-auto mb-4 h-16 w-16 text-gray-200" />
                <p className="text-xl font-semibold text-gray-900">{t('ia.noPredictions')}</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                {predictions.map((pred) => {
                  const T = TREND_CONFIG[pred.trend];
                  const TIcon = T.icon;
                  const active = selectedPrediction?.indicator_id === pred.indicator_id;
                  return (
                    <button key={pred.indicator_id} onClick={() => setSelectedPrediction(pred)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-violet-300 bg-violet-50 shadow-sm' : 'border-gray-200 bg-white hover:border-violet-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono text-gray-400">{pred.indicator_code}</p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{pred.indicator_name}</p>
                          <p className="mt-1 text-xs text-gray-500">R² = {pred.r2_score.toFixed(2)} · {pred.historical_points} pts</p>
                        </div>
                        <div className={`rounded-xl p-1.5 ${T.bg}`}><TIcon className={`h-4 w-4 ${T.color}`} /></div>
                      </div>
                      {pred.predicted_next_month !== null && (
                        <p className="mt-2 text-xs text-gray-500">{t('ia.in1Month')} <span className="font-bold text-violet-700">{pred.predicted_next_month.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {pred.unit}</span></p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="lg:col-span-2">
                {selectedPrediction && (
                  <Card className="border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-xs font-mono text-gray-400">{selectedPrediction.indicator_code}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedPrediction.indicator_name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('ia.tabPredictive')} : <span className={`font-medium ${TREND_CONFIG[selectedPrediction.trend].color}`}>{t(TREND_CONFIG[selectedPrediction.trend].labelKey)}</span> · R² = {selectedPrediction.r2_score.toFixed(3)}</p>
                      </div>
                      {selectedPrediction.predicted_next_year !== null && (
                        <div className="rounded-2xl bg-violet-50 p-4 text-right">
                          <p className="text-xs text-violet-600">{t('ia.in12Months')}</p>
                          <p className="text-2xl font-bold text-violet-700">{selectedPrediction.predicted_next_year.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</p>
                          <p className="text-xs text-violet-500">{selectedPrediction.unit}</p>
                        </div>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={buildChartData(selectedPrediction)}>
                        <defs>
                          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                        <Legend />
                        <Area type="monotone" dataKey="Borne haute" stroke="none" fill="#ede9fe" fillOpacity={0.4} />
                        <Area type="monotone" dataKey="Prévision" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 3" fill="url(#predGrad)" dot={false} />
                        <Area type="monotone" dataKey="Borne basse" stroke="none" fill="white" fillOpacity={1} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-700">
                      <Brain className="h-4 w-4 flex-shrink-0" />
                      {t('ia.confidenceInfo')}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANOMALIES ── */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('ia.anomaliesTitle')}</h2>
              <p className="text-sm text-gray-500">{t('ia.anomaliesDesc')}</p>
            </div>
            <button onClick={loadAnomalies} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
              <RefreshCw className="h-4 w-4" /> {t('ia.refreshData')}
            </button>
          </div>
          {anomalies.length === 0 ? (
            <Card className="border border-gray-200">
              <div className="py-16 text-center">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-300" />
                <p className="text-xl font-semibold text-gray-900">{t('ia.noAnomalies')}</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a) => (
                <div key={a.id} className={`rounded-2xl border p-5 ${a.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-2 ${a.severity === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <AlertTriangle className={`h-5 w-5 ${a.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{a.metric_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{a.message}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${a.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {a.severity === 'high' ? t('ia.severityCritical') : t('ia.severityModerate')}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{a.deviation}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Valeur : <strong className="text-gray-900">{a.value}</strong></span>
                        <span>Plage normale : <strong className="text-gray-900">{a.expected_range}</strong></span>
                        <span>Pilier : <strong className="text-gray-900 capitalize">{a.pillar}</strong></span>
                        {a.period && <span>Période : {new Date(a.period).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS ── */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('ia.insightsTitle')}</h2>
          {!insights ? (
            <Card className="border border-gray-200"><div className="py-12 text-center text-gray-500">{t('ia.noInsights')}</div></Card>
          ) : (
            <>
              {insights.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('ia.recommendations')}</h3>
                  {insights.recommendations.map((rec, i) => {
                    const p = PRIORITY_CONFIG[rec.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.low;
                    return (
                      <div key={i} className={`rounded-2xl border p-5 ${p.bg} ${p.border}`}>
                        <div className="flex items-start gap-3">
                          <Lightbulb className={`h-5 w-5 flex-shrink-0 mt-0.5 ${p.color}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{rec.message}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.badge}`}>{t(p.labelKey)}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{rec.action}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {insights.achievements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('ia.achievements')}</h3>
                  {insights.achievements.map((a, i) => (
                    <div key={i} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <p className="font-medium text-emerald-900">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {insights.recommendations.length === 0 && insights.achievements.length === 0 && (
                <Card className="border border-gray-200"><div className="py-12 text-center text-gray-500">{t('ia.noInsights')}</div></Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SUGGESTIONS ── */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('ia.suggestionsTitle')}</h2>
          {suggestions.length === 0 ? (
            <Card className="border border-gray-200">
              <div className="py-16 text-center">
                <Sparkles className="mx-auto mb-4 h-16 w-16 text-gray-200" />
                <p className="text-xl font-semibold text-gray-900">{t('ia.noSuggestions')}</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {suggestions.map((sug, i) => {
                const p = PRIORITY_CONFIG[sug.priority] || PRIORITY_CONFIG.low;
                return (
                  <div key={i} className={`rounded-2xl border p-6 ${p.bg} ${p.border}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.badge}`}>{t(p.labelKey)}</span>
                      <Sparkles className={`h-5 w-5 ${p.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{sug.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{sug.description}</p>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-gray-400" /><span className="text-gray-600">Action : <strong>{sug.action}</strong></span></div>
                      <div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-gray-400" /><span className="text-gray-600">Impact : <strong>{sug.impact}</strong></span></div>
                      <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-gray-400" /><span className="text-gray-600">Effort : <strong>{sug.effort}</strong></span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CHATBOT ── */}
      {activeTab === 'chatbot' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick prompts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('ia.frequentQuestions')}</h3>
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => { setChatInput(prompt); }}
                className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-violet-500 flex-shrink-0" />
                  {prompt}
                </div>
              </button>
            ))}
            <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-semibold text-violet-700">{t('ia.localIaBadge')}</span>
              </div>
              <p className="text-xs text-violet-600">{t('ia.knowledgeBase')} CSRD, ESRS, GHG Protocol, GRI, TCFD.</p>
            </div>
          </div>

          {/* Chat window */}
          <div className="lg:col-span-3 flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm" style={{ height: '600px' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t('ia.chatHeaderTitle')}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-xs text-gray-500">{t('ia.chatHeaderSubtitle')}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-gray-50 border border-gray-200 rounded-tl-sm'}`}>
                    {msg.role === 'assistant'
                      ? <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                      : <p className="text-sm">{msg.content}</p>
                    }
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-violet-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={t('ia.chatPlaceholder')}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GÉNÉRATION IA ── */}
      {activeTab === 'generation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Génération rapport automatique */}
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('ia.generationReportTitle')}</h3>
                <p className="text-xs text-gray-500">{t('ia.generationReportDesc')}</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: 'Standard', options: ['CSRD / ESRS 2024', 'GRI Standards', 'TCFD'] },
                { label: 'Période', options: ['Exercice 2025', 'Exercice 2024', 'Q1 2025'] },
                { label: 'Langue', options: ['Français', 'English', 'Deutsch'] },
              ].map(field => (
                <div key={field.label}>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{field.label}</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {field.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={simulateGeneration}
              disabled={generatingReport}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
            >
              {generatingReport ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('ia.generating')}</> : <><Sparkles className="h-4 w-4" /> {t('ia.generateReportBtn')}</>}
            </button>

            {reportGenerated && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-900 text-sm">Rapport CSRD généré ✓</p>
                </div>
                <div className="space-y-2 text-xs text-gray-700">
                  <p>📄 <strong>Résumé exécutif</strong> — 2 pages · Score global : 78/100</p>
                  <p>🌍 <strong>Environnemental</strong> — Émissions -12% vs N-1 · Énergie renouvelable 34%</p>
                  <p>👥 <strong>Social</strong> — Formation 18h/salarié · Parité 47% postes direction</p>
                  <p>⚖️ <strong>Gouvernance</strong> — Politique anti-corruption publiée · 3 alertes compliance</p>
                </div>
                <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition">
                  <Download className="h-3.5 w-3.5" /> {t('ia.downloadPdf')}
                </button>
              </div>
            )}
          </Card>

          {/* Données manquantes */}
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('ia.missingDataTitle')}</h3>
                <p className="text-xs text-gray-500">{t('ia.missingDataDesc')}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {MISSING_DATA_EXAMPLES.map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.indicator}</p>
                    <p className="text-xs text-gray-500">{item.category} · {item.esrs}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.priority === 'high' ? t('ia.priorityRequired') : t('ia.priorityAdvised')}
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2">
              <ArrowRight className="h-4 w-4" /> {t('ia.completeMissingData')}
            </button>
          </Card>

          {/* OCR Factures fournisseurs */}
          <Card className="border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('ia.generationOcrTitle')}</h3>
                <p className="text-xs text-gray-500">{t('ia.generationOcrDesc')}</p>
              </div>
              <span className="ml-auto bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">Comme Greenly</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div
                  onClick={simulateOCR}
                  className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-purple-50 group"
                >
                  {ocrUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                      <p className="text-sm font-medium text-purple-700">Analyse OCR en cours...</p>
                      <p className="text-xs text-gray-500">Extraction des données · Catégorisation Scope 3</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-10 w-10 text-gray-300 group-hover:text-purple-400 transition-colors" />
                      <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">{t('ia.ocrUploadTitle')}</p>
                      <p className="text-xs text-gray-400">{t('ia.ocrUploadFormats')}</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {['Transport SA.pdf', 'Electricité EDF.pdf', 'Achat matériaux.pdf'].map(f => (
                    <button key={f} onClick={simulateOCR} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition text-gray-600">
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('ia.ocrResult')}</h4>
                {!ocrResult && !ocrUploading && (
                  <div className="h-40 flex items-center justify-center border border-gray-100 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-400">{t('ia.ocrUploadButton')}</p>
                  </div>
                )}
                {ocrResult && (
                  <div className="space-y-3">
                    {[
                      { label: 'Fournisseur', value: ocrResult.vendor, icon: Building2 },
                      { label: 'Montant HT', value: `${ocrResult.amount.toLocaleString('fr-FR')} €`, icon: BarChart2 },
                      { label: 'Catégorie Scope 3', value: ocrResult.category, icon: Globe },
                      { label: 'Émissions estimées', value: `${ocrResult.co2} tCO₂e`, icon: Leaf },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                          <Icon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">{item.label}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                    <button className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition">
                      {t('ia.saveToCarbone')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── RÉDUCTION CO₂ ── */}
      {activeTab === 'reduction' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('ia.reductionTitle')}</h2>
              <p className="text-sm text-gray-500">{t('ia.reductionDesc')}</p>
            </div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {['Industrie', 'Services', 'Distribution', 'Tech', 'Finance'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Benchmark sectoriel */}
          <Card className="border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-600" />
              {t('ia.benchmarkTitle')}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SECTOR_BENCHMARKS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="sector" stroke="#6b7280" style={{ fontSize: '11px' }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {SECTOR_BENCHMARKS.map((entry, i) => (
                    <rect key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Score faible (&lt;50)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Moyen (50-65)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Bon (65-80)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-600 inline-block" />{t('ia.legendYourScore')}</span>
            </div>
          </Card>

          {/* Leviers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REDUCTION_LEVERS.sort((a, b) => b.impact - a.impact).map((lever, i) => {
              const Icon = lever.icon;
              const effortLabel = lever.effort === 'Faible' ? t('ia.effortLow') : lever.effort === 'Moyen' ? t('ia.effortMedium') : t('ia.effortHigh');
              const effortColor = lever.effort === 'Faible' ? 'bg-green-100 text-green-700' : lever.effort === 'Moyen' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
              return (
                <div key={i} className="flex gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-${lever.color}-100`}>
                    <Icon className={`h-5 w-5 text-${lever.color}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{lever.category}</span>
                        <p className="font-semibold text-gray-900 text-sm">{lever.label}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-green-700">{lever.saving}</p>
                      </div>
                    </div>

                    {/* Impact bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{t('ia.reductionTitle')}</span>
                        <span className="font-semibold text-gray-700">{lever.impact}/100</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div
                          className="h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${lever.impact}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${effortColor}`}>{effortLabel}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">⏱ {lever.timeframe}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">ROI {lever.roi}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm">
              <Download className="h-4 w-4" /> {t('decarbonation.exportPlan')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
