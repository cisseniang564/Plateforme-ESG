import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Filter,
  CheckCircle,
  Loader,
  Sparkles,
  BarChart3,
  TrendingUp,
  Award,
  Globe
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { generateConsistentScores, generateEvolutionData } from '@/utils/mockScores';
import { generateExcel, generateWord } from '@/utils/reportGenerator';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  external_id?: string;
}

type ReportType = 'executive' | 'detailed' | 'csrd' | 'gri' | 'tcfd';
type ReportFormat = 'pdf' | 'excel' | 'word';

type ReportPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
  custom: 'Personnalisé',
};

async function generatePdfReport(reportData: {
  organization: Organization;
  scores: any;
  evolution: any[];
  period: { start: string; end: string };
  type: ReportType;
  generatedAt: string;
}) {
  const doc = new jsPDF();
  const generatedDate = format(new Date(reportData.generatedAt), 'dd/MM/yyyy HH:mm');
  const start = format(new Date(reportData.period.start), 'dd/MM/yyyy');
  const end = format(new Date(reportData.period.end), 'dd/MM/yyyy');

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Rapport ESG', 14, 19);

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Organisation : ${reportData.organization.name}`, 14, 42);
  doc.text(`Période : ${start} au ${end}`, 14, 49);
  doc.text(`Type : ${reportData.type}`, 14, 56);
  doc.text(`Généré le : ${generatedDate}`, 14, 63);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 69, 196, 69);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Synthèse du score ESG', 14, 81);

  doc.setFontSize(26);
  doc.setTextColor(37, 99, 235);
  doc.text(`${Number(reportData.scores?.overall_score ?? 0).toFixed(1)} / 100`, 14, 97);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.text(`Note : ${reportData.scores?.grade ?? 'N/A'}`, 140, 97);

  const pillarRows = [
    ['Environnement', Number(reportData.scores?.environmental_score ?? 0).toFixed(1)],
    ['Social', Number(reportData.scores?.social_score ?? 0).toFixed(1)],
    ['Gouvernance', Number(reportData.scores?.governance_score ?? 0).toFixed(1)],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Détail par pilier', 14, 115);

  let y = 126;
  pillarRows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 6, 182, 10, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(String(label), 18, y);
    doc.text(String(value), 175, y, { align: 'right' });
    y += 12;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Historique récent', 14, 170);

  const recentEvolution = (reportData.evolution || []).slice(-6);
  y = 181;
  recentEvolution.forEach((item, index) => {
    const periodLabel = item?.month || item?.date || `Période ${index + 1}`;
    const value = Number(item?.overall_score ?? item?.score ?? 0).toFixed(1);
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 6, 182, 10, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(String(periodLabel), 18, y);
    doc.text(String(value), 175, y, { align: 'right' });
    y += 12;
  });

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('ESGFlow — Document généré automatiquement', 14, 287);

  const fileName = `ESG_Rapport_${reportData.organization.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(pdfUrl);
}

export default function ReportGeneration() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Formulaire
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('yearly');
  const [startDate, setStartDate] = useState(format(new Date(2025, 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includeComparison, setIncludeComparison] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Erreur lors du chargement des organisations');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedOrg) {
      toast.error('Veuillez sélectionner une organisation');
      return;
    }

    setGenerating(true);

    try {
      const org = organizations.find(o => o.id === selectedOrg);
      if (!org) {
        toast.error('Organisation introuvable');
        return;
      }

      const scores = generateConsistentScores(selectedOrg);
      const evolution = generateEvolutionData(selectedOrg, 12);

      const reportData = {
        organization: org,
        scores: scores,
        evolution: evolution,
        period: { start: startDate, end: endDate },
        type: reportType,
        generatedAt: new Date().toISOString()
      };

      // Afficher un toast de progression
      const progressToast = toast.loading('Génération du rapport en cours...');

      // Simuler un délai pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Log report format before switch
      console.log('Generating report format:', reportFormat);

      // Générer selon le format choisi
      switch (reportFormat) {
        case 'pdf':
          await generatePdfReport(reportData);
          break;
        case 'excel':
          generateExcel(reportData);
          break;
        case 'word':
          await generateWord(reportData);
          break;
      }

      toast.success('Rapport généré avec succès !', { id: progressToast });
      
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    {
      id: 'executive' as ReportType,
      name: 'Rapport Exécutif',
      description: 'Vue d\'ensemble synthétique pour la direction',
      icon: Award,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'detailed' as ReportType,
      name: 'Rapport Détaillé',
      description: 'Analyse complète avec tous les indicateurs',
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'csrd' as ReportType,
      name: 'Rapport CSRD',
      description: 'Conforme à la directive européenne',
      icon: Globe,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'gri' as ReportType,
      name: 'Rapport GRI',
      description: 'Standards GRI 2021',
      icon: CheckCircle,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'tcfd' as ReportType,
      name: 'Rapport TCFD',
      description: 'Risques et opportunités climatiques',
      icon: TrendingUp,
      color: 'from-red-500 to-red-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-r from-slate-900 via-slate-800 to-primary-700 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              Reporting ESG intelligent
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <FileText className="h-8 w-8 text-white" />
              Génération de Rapports ESG
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Créez des rapports professionnels, lisibles et prêts à partager pour la direction,
              les auditeurs et les parties prenantes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Formats</p>
              <p className="mt-1 text-lg font-semibold">PDF · Excel · Word</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Standards</p>
              <p className="mt-1 text-lg font-semibold">CSRD · GRI · TCFD</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Objectif</p>
              <p className="mt-1 text-lg font-semibold">Prêt à diffuser</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type de rapport */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              Type de Rapport
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === type.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color}`}>
                      <type.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                    {reportType === type.id && (
                      <CheckCircle className="h-5 w-5 text-primary-600 absolute top-3 right-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Configuration détaillée */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-600" />
              Configuration
            </h2>

            <div className="space-y-4">
              {/* Organisation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisation *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.industry && `- ${org.industry}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Période */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de reporting
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(['monthly', 'quarterly', 'yearly', 'custom'] as ReportPeriod[]).map(period => (
                    <button
                      key={period}
                      onClick={() => setReportPeriod(period)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        reportPeriod === period
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period === 'monthly' ? 'Mensuel' : 
                       period === 'quarterly' ? 'Trimestriel' : 
                       period === 'yearly' ? 'Annuel' : 'Personnalisé'}
                    </button>
                  ))}
                </div>

                {reportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date de début</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date de fin</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format de sortie
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'excel', 'word'] as ReportFormat[]).map(format => (
                    <button
                      key={format}
                      onClick={() => setReportFormat(format)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        reportFormat === format
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format === 'pdf' ? '📄 PDF' : format === 'excel' ? '📊 Excel' : '📝 Word'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Options du rapport
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inclure les graphiques</p>
                      <p className="text-sm text-gray-600">Ajouter les visualisations de données</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeRecommendations}
                      onChange={(e) => setIncludeRecommendations(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inclure les recommandations</p>
                      <p className="text-sm text-gray-600">Ajouter des axes d'amélioration</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeComparison}
                      onChange={(e) => setIncludeComparison(e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inclure la comparaison sectorielle</p>
                      <p className="text-sm text-gray-600">Comparer avec les pairs du secteur</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Aperçu & Actions */}
        <div className="space-y-6">
          {/* Aperçu */}
          <Card className="border-gray-200 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Aperçu du rapport</h3>
                <p className="text-sm text-gray-500 mt-1">Résumé clair avant génération</p>
              </div>
              <div className="rounded-xl bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {reportFormat.toUpperCase()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-white/60">Document sélectionné</p>
                <p className="mt-2 text-lg font-semibold">
                  {reportTypes.find(t => t.id === reportType)?.name}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {organizations.find(o => o.id === selectedOrg)?.name || 'Aucune organisation'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Période</p>
                  <p className="mt-1 font-semibold text-gray-900">{REPORT_PERIOD_LABELS[reportPeriod]}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Format</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {reportFormat === 'pdf' ? 'PDF' : reportFormat === 'excel' ? 'Excel' : 'Word'}
                  </p>
                </div>
              </div>

              {reportPeriod === 'custom' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium">Période personnalisée</p>
                  <p className="mt-1">
                    Du {format(new Date(startDate), 'dd/MM/yyyy')} au {format(new Date(endDate), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Contenu inclus</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-700">Graphiques</span>
                    <span className={`font-medium ${includeCharts ? 'text-green-600' : 'text-gray-400'}`}>
                      {includeCharts ? 'Inclus' : 'Non inclus'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-700">Recommandations</span>
                    <span className={`font-medium ${includeRecommendations ? 'text-green-600' : 'text-gray-400'}`}>
                      {includeRecommendations ? 'Incluses' : 'Non incluses'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-700">Comparaison sectorielle</span>
                    <span className={`font-medium ${includeComparison ? 'text-green-600' : 'text-gray-400'}`}>
                      {includeComparison ? 'Incluse' : 'Non incluse'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <Button
              onClick={generateReport}
              disabled={generating || !selectedOrg}
              className="w-full mb-3"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Générer le {reportFormat === 'pdf' ? 'PDF' : reportFormat === 'excel' ? 'fichier Excel' : 'document Word'}
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              className="w-full mb-3"
              onClick={() => navigate('/reports')}
            >
              <FileText className="h-5 w-5 mr-2" />
              Voir les rapports
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/reports/scheduled')}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Rapports planifiés
            </Button>
          </Card>

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Conformité garantie</p>
                <p className="text-sm text-blue-700">
                  Tous nos rapports sont conformes aux standards internationaux et 
                  aux réglementations européennes (CSRD, GRI, TCFD).
                </p>
              </div>
            </div>
          </Card>

          {/* Exemples */}
          <Card className="bg-green-50 border-green-200">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 mb-1">Formats professionnels</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• PDF : Mise en page professionnelle</li>
                  <li>• Excel : 4 onglets avec données</li>
                  <li>• Word : Document éditable</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}