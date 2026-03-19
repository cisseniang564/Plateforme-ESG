import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Award,
  Activity,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Leaf,
  Users,
  Scale,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart
} from 'recharts';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { generateConsistentScores, generateEvolutionData } from '@/utils/mockScores';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  industry?: string;
}

interface Score {
  id: string;
  score_date: string;
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  rating: string;
  trend: number;
  best_pillar: 'environmental' | 'social' | 'governance';
  worst_pillar: 'environmental' | 'social' | 'governance';
  indicators_count: number;
  data_completeness: number;
}

interface Alert {
  type: string;
  pillar: string;
  previous_score: number;
  current_score: number;
  drop_percentage: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export default function ScoresDashboard() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [latestScore, setLatestScore] = useState<Score | null>(null);
  const [history, setHistory] = useState<Score[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgScore();
    }
  }, [selectedOrgId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];
      setOrganizations(orgs);
      
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadOrgScore = async () => {
    if (!selectedOrgId) return;

    try {
      // Générer les scores cohérents
      const scores = generateConsistentScores(selectedOrgId);
      const evolution = generateEvolutionData(selectedOrgId, 12);

      // Score actuel
      const current: Score = {
        id: crypto.randomUUID(),
        score_date: format(new Date(), 'yyyy-MM-dd'),
        overall_score: scores.overall,
        environmental_score: scores.environmental,
        social_score: scores.social,
        governance_score: scores.governance,
        rating: scores.rating,
        trend: scores.trend,
        best_pillar: scores.environmental >= scores.social && scores.environmental >= scores.governance ? 'environmental' :
                     scores.social >= scores.governance ? 'social' : 'governance',
        worst_pillar: scores.environmental <= scores.social && scores.environmental <= scores.governance ? 'environmental' :
                      scores.social <= scores.governance ? 'social' : 'governance',
        indicators_count: 10,
        data_completeness: scores.data_completeness
      };

      setLatestScore(current);

      // Historique
      const hist = evolution.map((e, idx) => ({
        id: `${selectedOrgId}-${idx}`,
        score_date: format(subMonths(new Date(), 11 - idx), 'yyyy-MM-dd'),
        overall_score: e.overall,
        environmental_score: e.environmental,
        social_score: e.social,
        governance_score: e.governance,
        rating: e.overall >= 75 ? 'AA' : e.overall >= 65 ? 'A' : e.overall >= 55 ? 'BBB' : e.overall >= 45 ? 'BB' : 'B',
        trend: 0,
        best_pillar: 'environmental' as const,
        worst_pillar: 'social' as const,
        indicators_count: 10,
        data_completeness: 85
      }));

      setHistory(hist);

      // Générer des alertes si baisse significative
      const alertsList: Alert[] = [];
      if (hist.length >= 2) {
        const latest = hist[hist.length - 1];
        const previous = hist[hist.length - 2];

        ['environmental', 'social', 'governance'].forEach((pillar) => {
          const key = `${pillar}_score` as keyof Score;
          const curr = latest[key] as number;
          const prev = previous[key] as number;
          const drop = ((prev - curr) / prev) * 100;

          if (drop >= 10) {
            alertsList.push({
              type: 'drop',
              pillar,
              previous_score: prev,
              current_score: curr,
              drop_percentage: drop,
              severity: drop >= 25 ? 'high' : drop >= 15 ? 'medium' : 'low',
              message: `Le score ${pillar} a chuté de ${drop.toFixed(1)}% par rapport à la période précédente`
            });
          }
        });
      }

      setAlerts(alertsList);

    } catch (error) {
      console.error('Error loading score:', error);
    }
  };

  const handleCalculate = async () => {
    if (!selectedOrgId) {
      toast.error('Sélectionnez une organisation');
      return;
    }

    setCalculating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadOrgScore();
      toast.success('Score calculé avec succès');
    } catch (error) {
      toast.error('Erreur lors du calcul');
    } finally {
      setCalculating(false);
    }
  };

  const exportToPDF = () => {
    if (!latestScore) {
      toast.error('Aucun score à exporter');
      return;
    }

    const doc = new jsPDF();
    const org = organizations.find(o => o.id === selectedOrgId);

    // En-tête
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('RAPPORT ESG', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(org?.name || 'Organisation', 105, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 105, 40, { align: 'center' });

    // Score principal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Score Global ESG', 20, 65);
    doc.setFontSize(48);
    doc.setTextColor(99, 102, 241);
    doc.text(latestScore.overall_score.toFixed(0), 20, 85);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rating: ${latestScore.rating}`, 60, 85);

    // Tableau des piliers
    autoTable(doc, {
      startY: 95,
      head: [['Pilier', 'Score', 'Performance']],
      body: [
        ['🌿 Environnemental', latestScore.environmental_score.toFixed(1), latestScore.environmental_score >= 70 ? 'Excellent' : 'Bon'],
        ['👥 Social', latestScore.social_score.toFixed(1), latestScore.social_score >= 70 ? 'Excellent' : 'Bon'],
        ['⚖️ Gouvernance', latestScore.governance_score.toFixed(1), latestScore.governance_score >= 70 ? 'Excellent' : 'Bon']
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }
    });

    // Historique
    if (history.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Date', 'Global', 'E', 'S', 'G', 'Rating']],
        body: history.slice(-10).map(h => [
          format(new Date(h.score_date), 'dd/MM/yyyy'),
          h.overall_score.toFixed(1),
          h.environmental_score.toFixed(1),
          h.social_score.toFixed(1),
          h.governance_score.toFixed(1),
          h.rating
        ]),
        theme: 'striped'
      });
    }

    doc.save(`rapport-esg-${org?.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF téléchargé');
  };

  const exportToExcel = () => {
    if (!latestScore) {
      toast.error('Aucun score à exporter');
      return;
    }

    const org = organizations.find(o => o.id === selectedOrgId);
    const wb = XLSX.utils.book_new();

    // Onglet Score Actuel
    const currentData = [
      ['RAPPORT ESG - ' + (org?.name || 'Organisation')],
      [],
      ['Date', format(new Date(), 'dd/MM/yyyy')],
      ['Score Global', latestScore.overall_score],
      ['Rating', latestScore.rating],
      [],
      ['SCORES PAR PILIER'],
      ['Pilier', 'Score'],
      ['Environnemental', latestScore.environmental_score],
      ['Social', latestScore.social_score],
      ['Gouvernance', latestScore.governance_score]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(currentData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Score Actuel');

    // Onglet Historique
    if (history.length > 0) {
      const histData = [
        ['Date', 'Global', 'Environnemental', 'Social', 'Gouvernance', 'Rating'],
        ...history.map(h => [
          h.score_date,
          h.overall_score,
          h.environmental_score,
          h.social_score,
          h.governance_score,
          h.rating
        ])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(histData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Historique');
    }

    XLSX.writeFile(wb, `rapport-esg-${org?.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel téléchargé');
  };

  const chartData = history.map(h => ({
    date: format(new Date(h.score_date), 'MMM', { locale: fr }),
    overall: h.overall_score,
    environmental: h.environmental_score,
    social: h.social_score,
    governance: h.governance_score
  }));

  const radarData = latestScore ? [
    { subject: 'Environnemental', value: latestScore.environmental_score, fullMark: 100 },
    { subject: 'Social', value: latestScore.social_score, fullMark: 100 },
    { subject: 'Gouvernance', value: latestScore.governance_score, fullMark: 100 }
  ] : [];

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'bg-red-100 border-red-300 text-red-800';
    if (severity === 'medium') return 'bg-orange-100 border-orange-300 text-orange-800';
    return 'bg-yellow-100 border-yellow-300 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Award className="h-10 w-10" />
              Tableau de Bord des Scores ESG
            </h1>
            <p className="text-primary-100 text-lg">
              Calculez et analysez vos scores de performance ESG
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="secondary" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Contrôles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-primary-200 text-sm mb-2">Organisation</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id} className="text-gray-900">
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-primary-200 text-sm mb-2">Date de calcul</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleCalculate}
              disabled={calculating}
              variant="secondary"
              className="w-full"
            >
              {calculating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Calcul...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5 mr-2" />
                  Calculer
                </>
              )}
            </Button>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => navigate('/organizations/compare')}
              variant="secondary"
              className="w-full"
            >
              <Building2 className="h-5 w-5 mr-2" />
              Comparer
            </Button>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Alertes de Performance ({alerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 border-2 rounded-lg ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold capitalize mb-1">{alert.pillar}</p>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">
                      {alert.previous_score.toFixed(1)} → {alert.current_score.toFixed(1)}
                    </p>
                    <p className="text-xs font-bold text-red-600">
                      -{alert.drop_percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Score Principal */}
      {latestScore ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Score Global</p>
                  <p className="text-4xl font-bold text-primary-600">{latestScore.overall_score}</p>
                  <p className="text-sm text-gray-500 mt-1">Rating: {latestScore.rating}</p>
                </div>
                <div className="p-3 bg-primary-50 rounded-xl">
                  <Award className="h-8 w-8 text-primary-600" />
                </div>
              </div>
              {latestScore.trend !== 0 && (
                <div className={`flex items-center gap-1 mt-3 text-sm ${latestScore.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {latestScore.trend > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(latestScore.trend).toFixed(1)}% vs période précédente
                </div>
              )}
            </Card>

            <Card className="border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Environnemental</p>
                  <p className="text-4xl font-bold text-green-600">{latestScore.environmental_score}</p>
                  {latestScore.best_pillar === 'environmental' && (
                    <p className="text-xs text-green-600 mt-1">✓ Meilleur pilier</p>
                  )}
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Leaf className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Social</p>
                  <p className="text-4xl font-bold text-blue-600">{latestScore.social_score}</p>
                  {latestScore.best_pillar === 'social' && (
                    <p className="text-xs text-blue-600 mt-1">✓ Meilleur pilier</p>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gouvernance</p>
                  <p className="text-4xl font-bold text-purple-600">{latestScore.governance_score}</p>
                  {latestScore.best_pillar === 'governance' && (
                    <p className="text-xs text-purple-600 mt-1">✓ Meilleur pilier</p>
                  )}
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Scale className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Évolution */}
            <Card className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-600" />
                Évolution des Scores (12 mois)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="overall" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorOverall)" 
                    name="Score Global"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="environmental" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Environnemental"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="social" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Social"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="governance" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Gouvernance"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Radar */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Répartition par Pilier
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis domain={[0, 100]} style={{ fontSize: '10px' }} />
                  <Radar 
                    name="Score" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    fill="#6366f1" 
                    fillOpacity={0.6} 
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Indicateurs Utilisés</p>
                  <p className="text-2xl font-bold text-gray-900">{latestScore.indicators_count}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Complétude Données</p>
                  <p className="text-2xl font-bold text-gray-900">{latestScore.data_completeness}%</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date du Score</p>
                  <p className="text-lg font-medium text-gray-900">
                    {format(new Date(latestScore.score_date), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <div className="text-center py-16">
            <Calculator className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              Aucun score calculé
            </p>
            <p className="text-gray-600 mb-6">
              Sélectionnez une organisation et cliquez sur "Calculer" pour générer votre score ESG
            </p>
            <Button onClick={handleCalculate} disabled={calculating}>
              <Calculator className="h-5 w-5 mr-2" />
              {calculating ? 'Calcul en cours...' : 'Calculer le Score'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}