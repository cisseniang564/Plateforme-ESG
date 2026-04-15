import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { getOrgLatestScore, getOrgScores } from '@/services/esgScoringService';
import { generateExcel, generateWord } from '@/utils/reportGenerator';
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

async function generatePdfReport(reportData: {
  organization: Organization;
  scores: any;
  evolution: any[];
  period: { start: string; end: string };
  type: ReportType;
  generatedAt: string;
}) {
  const { jsPDF } = await import('jspdf');
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
  doc.text(`Periode : ${start} au ${end}`, 14, 49);
  doc.text(`Type : ${reportData.type}`, 14, 56);
  doc.text(`Genere le : ${generatedDate}`, 14, 63);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 69, 196, 69);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Synthese du score ESG', 14, 81);

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
  doc.text('Detail par pilier', 14, 115);

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
  doc.text('Historique recent', 14, 170);

  const recentEvolution = (reportData.evolution || []).slice(-6);
  y = 181;
  recentEvolution.forEach((item, index) => {
    const periodLabel = item?.month || item?.date || `Periode ${index + 1}`;
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
  doc.text('ESGFlow - Document genere automatiquement', 14, 287);

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
      toast.error(t('reporting.loadOrgError'));
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedOrg) {
      toast.error(t('reporting.selectOrgError'));
      return;
    }

    setGenerating(true);

    try {
      const org = organizations.find(o => o.id === selectedOrg);
      if (!org) {
        toast.error(t('reporting.orgNotFound'));
        return;
      }

      // Charge les vrais scores depuis l'API
      const [latestScore, scoreHistory] = await Promise.all([
        getOrgLatestScore(selectedOrg),
        getOrgScores(selectedOrg, 12),
      ]);

      const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const evolution = [...scoreHistory].reverse().map((s) => ({
        month: MONTHS[new Date(s.date).getMonth()],
        overall: s.overall_score,
        environmental: s.environmental_score,
        social: s.social_score,
        governance: s.governance_score,
      }));

      const reportData = {
        organization: org,
        scores: latestScore ? {
          overall: latestScore.overall_score,
          environmental: latestScore.environmental_score,
          social: latestScore.social_score,
          governance: latestScore.governance_score,
          rating: latestScore.rating,
          trend: 0,
          data_completeness: latestScore.data_completeness ?? 0,
        } : {
          overall: 0, environmental: 0, social: 0,
          governance: 0, rating: '—', trend: 0, data_completeness: 0,
        },
        evolution,
        period: { start: startDate, end: endDate },
        type: reportType,
        generatedAt: new Date().toISOString(),
      };

      const progressToast = toast.loading(t('reporting.generatingProgress'));
      await new Promise(resolve => setTimeout(resolve, 1500));

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

      toast.success(t('reporting.generateSuccess'), { id: progressToast });

    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(t('reporting.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    {
      id: 'executive' as ReportType,
      name: t('reporting.typeExecutive'),
      description: t('reporting.typeExecutiveDesc'),
      icon: Award,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'detailed' as ReportType,
      name: t('reporting.typeDetailed'),
      description: t('reporting.typeDetailedDesc'),
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'csrd' as ReportType,
      name: t('reporting.typeCSRD'),
      description: t('reporting.typeCSRDDesc'),
      icon: Globe,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'gri' as ReportType,
      name: t('reporting.typeGRI'),
      description: t('reporting.typeGRIDesc'),
      icon: CheckCircle,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'tcfd' as ReportType,
      name: t('reporting.typeTCFD'),
      description: t('reporting.typeTCFDDesc'),
      icon: TrendingUp,
      color: 'from-red-500 to-red-600'
    }
  ];

  const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
    monthly: t('reporting.monthly'),
    quarterly: t('reporting.quarterly'),
    yearly: t('reporting.yearly'),
    custom: t('reporting.custom'),
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
      <BackButton to="/app/reports" label="Rapports" />
      {/* Header */}
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-r from-slate-900 via-slate-800 to-primary-700 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              {t('reporting.badge')}
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <FileText className="h-8 w-8 text-white" />
              {t('reporting.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              {t('reporting.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('reporting.formats')}</p>
              <p className="mt-1 text-lg font-semibold">PDF · Excel · Word</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('reporting.standards')}</p>
              <p className="mt-1 text-lg font-semibold">CSRD · GRI · TCFD</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('reporting.objective')}</p>
              <p className="mt-1 text-lg font-semibold">{t('reporting.readyToShare')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              {t('reporting.reportType')}
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

          {/* Detailed Configuration */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-600" />
              {t('reporting.configuration')}
            </h2>

            <div className="space-y-4">
              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reporting.organisation')} *
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

              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reporting.reportingPeriod')}
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
                      {REPORT_PERIOD_LABELS[period]}
                    </button>
                  ))}
                </div>

                {reportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('reporting.startDate')}</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('reporting.endDate')}</label>
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
                  {t('reporting.outputFormat')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'excel', 'word'] as ReportFormat[]).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setReportFormat(fmt)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        reportFormat === fmt
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {fmt === 'pdf' ? 'PDF' : fmt === 'excel' ? 'Excel' : 'Word'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('reporting.reportOptions')}
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
                      <p className="font-medium text-gray-900">{t('reporting.includeCharts')}</p>
                      <p className="text-sm text-gray-600">{t('reporting.includeChartsDesc')}</p>
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
                      <p className="font-medium text-gray-900">{t('reporting.includeRecommendations')}</p>
                      <p className="text-sm text-gray-600">{t('reporting.includeRecommendationsDesc')}</p>
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
                      <p className="font-medium text-gray-900">{t('reporting.includeSectorComparison')}</p>
                      <p className="text-sm text-gray-600">{t('reporting.includeSectorComparisonDesc')}</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <Card className="border-gray-200 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('reporting.reportPreview')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('reporting.reportPreviewDesc')}</p>
              </div>
              <div className="rounded-xl bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {reportFormat.toUpperCase()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-white/60">{t('reporting.selectedDocument')}</p>
                <p className="mt-2 text-lg font-semibold">
                  {reportTypes.find(t => t.id === reportType)?.name}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {organizations.find(o => o.id === selectedOrg)?.name || t('reporting.noOrganisation')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t('reporting.period')}</p>
                  <p className="mt-1 font-semibold text-gray-900">{REPORT_PERIOD_LABELS[reportPeriod]}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t('reporting.format')}</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {reportFormat === 'pdf' ? 'PDF' : reportFormat === 'excel' ? 'Excel' : 'Word'}
                  </p>
                </div>
              </div>

              {reportPeriod === 'custom' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium">{t('reporting.customPeriod')}</p>
                  <p className="mt-1">
                    {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">{t('reporting.includedContent')}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-700">{t('reporting.charts')}</span>
                    <span className={`font-medium ${includeCharts ? 'text-green-600' : 'text-gray-400'}`}>
                      {includeCharts ? t('reporting.included') : t('reporting.notIncluded')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-700">{t('reporting.recommendations')}</span>
                    <span className={`font-medium ${includeRecommendations ? 'text-green-600' : 'text-gray-400'}`}>
                      {includeRecommendations ? t('reporting.included') : t('reporting.notIncluded')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-700">{t('reporting.sectorComparison')}</span>
                    <span className={`font-medium ${includeComparison ? 'text-green-600' : 'text-gray-400'}`}>
                      {includeComparison ? t('reporting.included') : t('reporting.notIncluded')}
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
                  {t('reporting.generating')}
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  {t('reporting.generateBtn')} {reportFormat === 'pdf' ? 'PDF' : reportFormat === 'excel' ? 'Excel' : 'Word'}
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              className="w-full mb-3"
              onClick={() => navigate('/app/reports/list')}
            >
              <FileText className="h-5 w-5 mr-2" />
              {t('reporting.viewReports')}
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/app/reports/scheduled')}
            >
              <Calendar className="h-5 w-5 mr-2" />
              {t('reporting.scheduledReports')}
            </Button>
          </Card>

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">{t('reporting.complianceTitle')}</p>
                <p className="text-sm text-blue-700">
                  {t('reporting.complianceDesc')}
                </p>
              </div>
            </div>
          </Card>

          {/* Formats */}
          <Card className="bg-green-50 border-green-200">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 mb-1">{t('reporting.professionalFormats')}</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>PDF: {t('reporting.pdfDesc')}</li>
                  <li>Excel: {t('reporting.excelDesc')}</li>
                  <li>Word: {t('reporting.wordDesc')}</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
