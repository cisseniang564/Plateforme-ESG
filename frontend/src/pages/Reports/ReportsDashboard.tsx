import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Eye,
  Shield,
  Globe,
  TrendingUp,
  Leaf,
  Settings,
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Trash2,
  Edit2,
  BarChart3,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import api from '@/services/api';
import { reportsService } from '@/services/reportsService';
import toast from 'react-hot-toast';
import { usePlan, FeatureKey } from '@/hooks/usePlan';
import { PlanBadge } from '@/components/common/PlanGate';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'generated' | 'in_progress' | 'failed';

interface ScheduledReport {
  id: number;
  name: string;
  frequency: 'Mensuel' | 'Trimestriel' | 'Annuel';
  nextRun: string;
  template: string;
}

interface Template {
  id: number;
  name: string;
  icon: React.ElementType;
  colorBg: string;
  colorText: string;
  desc: string;
  badges: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  {
    id: 1,
    name: 'CSRD / ESRS 2024',
    icon: Shield,
    colorBg: 'bg-violet-100',
    colorText: 'text-violet-600',
    desc: 'Rapport de durabilite conforme CSRD selon les normes ESRS — obligatoire 2025+',
    badges: ['ESRS E1-E5', 'ESRS S1-S4', 'ESRS G1', 'Format reglementaire'],
  },
  {
    id: 2,
    name: 'GRI Standards',
    icon: Globe,
    colorBg: 'bg-blue-100',
    colorText: 'text-blue-600',
    desc: 'Rapport GRI Universal Standards 2021 — referentiel mondial de reporting ESG',
    badges: ['GRI 2', 'GRI 300', 'GRI 400', 'Declaration conforme'],
  },
  {
    id: 3,
    name: 'SFDR Article 8/9',
    icon: TrendingUp,
    colorBg: 'bg-green-100',
    colorText: 'text-green-600',
    desc: 'Reporting produits financiers durables — donnees PAI et taxonomie UE',
    badges: ['PAI obligatoires', 'Taxonomie UE', 'Article 8 & 9'],
  },
  {
    id: 4,
    name: 'Bilan Carbone ADEME',
    icon: Leaf,
    colorBg: 'bg-emerald-100',
    colorText: 'text-emerald-600',
    desc: "Rapport d'emissions GES Scopes 1, 2, 3 selon methode ADEME/GHG Protocol",
    badges: ['Scope 1-2-3', 'Facteurs ADEME', 'Plan actions'],
  },
  {
    id: 5,
    name: 'DPEF',
    icon: FileText,
    colorBg: 'bg-orange-100',
    colorText: 'text-orange-600',
    desc: 'Declaration extra-financiere integree au rapport de gestion annuel',
    badges: ['Article L.225-102-1', 'RSE integree', 'Format legal'],
  },
  {
    id: 6,
    name: 'Rapport Personnalise',
    icon: Settings,
    colorBg: 'bg-gray-100',
    colorText: 'text-gray-600',
    desc: 'Construisez votre rapport sur mesure — choisissez indicateurs, piliers et format',
    badges: ['Indicateurs au choix', 'Multi-format', 'Export flexible'],
  },
];

// (no static mock data)

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  if (status === 'generated') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3" />
        {t('reports.statusGenerated')}
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('reports.statusInProgress')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <AlertCircle className="h-3 w-3" />
      {t('reports.statusFailed')}
    </span>
  );
}

function FrequencyBadge({ freq }: { freq: string }) {
  const colors: Record<string, string> = {
    Mensuel: 'bg-blue-100 text-blue-700',
    Trimestriel: 'bg-purple-100 text-purple-700',
    Annuel: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[freq] ?? 'bg-gray-100 text-gray-600'}`}>
      {freq}
    </span>
  );
}

// Map template id → feature gate key
const TEMPLATE_FEATURE: Record<number, FeatureKey | null> = {
  1: 'csrd_report',
  2: null, // GRI — free
  3: 'sfdr_report', // Pro
  4: 'carbon_report', // Starter
  5: 'dpef_report', // Starter
  6: null,
}

function TemplateCard({
  template,
  compact = false,
  onSelect,
}: {
  template: Template;
  compact?: boolean;
  onSelect?: (t: Template) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePlan();
  const featureKey = TEMPLATE_FEATURE[template.id] ?? null;
  const locked = featureKey !== null && !can(featureKey);
  const Icon = template.icon;
  return (
    <div
      className={`border rounded-xl p-5 transition-all cursor-pointer ${compact ? '' : 'flex flex-col gap-4'} ${
        locked
          ? 'border-gray-200 bg-gray-50/60 opacity-80 hover:opacity-100 hover:border-purple-200'
          : 'border-gray-200 hover:border-primary-400 hover:shadow-md'
      }`}
      onClick={() => !locked && onSelect && onSelect(template)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${locked ? 'bg-gray-100 text-gray-400' : `${template.colorBg} ${template.colorText}`} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
            {locked && featureKey && <PlanBadge feature={featureKey} />}
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{template.desc}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {template.badges.map((b) => (
          <span key={b} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {b}
          </span>
        ))}
      </div>
      {!compact && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {locked ? (
            <Button
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('/app/billing'); }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Mettre à niveau →
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSelect && onSelect(template); }}>
                {t('reports.useTemplate')}
              </Button>
              <Button size="sm" variant="secondary">
                {t('reports.preview')}
              </Button>
              {template.id === 1 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('/app/reports/csrd-builder'); }}
                >
                  Ouvrir le builder CSRD →
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function TabDashboard() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonth = reports.filter(r => {
    const d = new Date(r.created_at || r.generated_at || '');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const pending = reports.filter(r => r.status === 'in_progress' || r.status === 'pending').length;

  const kpis = [
    { label: t('reports.kpiGenerated'), value: reports.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: t('reports.kpiDownloads'), value: thisMonth, icon: Download, color: 'bg-green-50 text-green-600' },
    { label: t('reports.kpiPending'), value: pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: t('reports.kpiScheduled'), value: 0, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports Table */}
      <Card title={t('reports.recentReports')}>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun rapport généré</p>
            <p className="text-xs mt-1">Créez votre premier rapport depuis l'onglet "Nouveau rapport"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">{t('reports.colName')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">{t('reports.colType')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">{t('reports.colStatus')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">{t('reports.colCreated')}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">{t('reports.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 8).map((r: any) => {
                  const status: ReportStatus = r.status === 'completed' ? 'generated' : r.status === 'in_progress' ? 'in_progress' : 'failed';
                  const created = r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—';
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{r.name || r.title || `Rapport #${r.id}`}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{r.report_type || r.type || '—'}</span>
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={status} /></td>
                      <td className="py-2.5 px-3 text-gray-500">{created}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title={t('reports.download')}>
                            <Download className="h-4 w-4" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title={t('reports.view')}>
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: New Report (wizard) ─────────────────────────────────────────────────

function TabNewReport({ onSelectTemplate }: { onSelectTemplate: (t: Template) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [exportFormat, setExportFormat] = useState<'PDF' | 'Excel' | 'Word' | 'JSON'>('PDF');
  const [lang, setLang] = useState<'FR' | 'EN'>('FR');
  const [options, setOptions] = useState({
    charts: true,
    recommendations: true,
    sectorComparison: true,
    executiveSummary: false,
    annexes: false,
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('rapport.pdf');

  // Mapping template → report_type backend
  const TEMPLATE_TYPE_MAP: Record<number, string> = {
    1: 'csrd',
    2: 'gri',
    3: 'sfdr',
    4: 'carbon',
    5: 'dpef',
    6: 'detailed',
  };

  const FORMAT_MAP: Record<string, string> = {
    PDF: 'pdf',
    Excel: 'excel',
    Word: 'word',
    JSON: 'pdf', // fallback
  };

  // Nettoyage de l'URL objet à la destruction du composant
  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [downloadUrl]);

  const handleSelectTemplate = (tmpl: Template) => {
    setSelectedTemplate(tmpl);
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setProgress(0);

    // Fausse progression visuelle pendant l'appel API
    const interval = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 3 : p));
    }, 200);

    try {
      const reportType = TEMPLATE_TYPE_MAP[selectedTemplate.id] ?? 'detailed';
      const format = FORMAT_MAP[exportFormat] ?? 'pdf';
      const year = new Date().getFullYear();

      const response = await api.post(
        '/reports/generate',
        { report_type: reportType, period: 'annual', year, format },
        { responseType: 'blob' }
      );

      // Créer une URL objet pour le téléchargement
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const filename = `rapport_${reportType}_${year}.${format}`;

      setDownloadUrl(url);
      setDownloadFilename(filename);
      clearInterval(interval);
      setProgress(100);
      setGenerating(false);
      setGenerated(true);
    } catch (err: any) {
      clearInterval(interval);
      setGenerating(false);
      setProgress(0);
      const msg = err?.response?.data?.detail ?? 'Erreur lors de la génération du rapport';
      toast.error(msg);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadFilename;
    a.click();
  };

  const steps = [
    { num: 1, label: t('reports.stepTemplate') },
    { num: 2, label: t('reports.stepConfig') },
    { num: 3, label: t('reports.stepGenerate') },
  ];

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-0">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step === s.num ? 'text-primary-700' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose template */}
      {step === 1 && (
        <Card title={t('reports.stepTemplate')}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl) => (
              <TemplateCard key={tmpl.id} template={tmpl} compact onSelect={handleSelectTemplate} />
            ))}
          </div>
        </Card>
      )}

      {/* Step 2: Configure */}
      {step === 2 && selectedTemplate && (
        <Card title={t('reports.stepConfig')}>
          <div className="space-y-6 max-w-lg">
            {/* Selected template summary */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-8 h-8 rounded-lg ${selectedTemplate.colorBg} ${selectedTemplate.colorText} flex items-center justify-center`}>
                <selectedTemplate.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{selectedTemplate.name}</p>
                <button onClick={() => setStep(1)} className="text-xs text-primary-600 hover:underline">
                  {t('reports.changeTemplate')}
                </button>
              </div>
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.configOrg')}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none">
                <option>Demo Organization</option>
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.configPeriod')}</label>
              <div className="flex gap-2">
                <input type="date" defaultValue="2024-01-01" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none" />
                <input type="date" defaultValue="2024-12-31" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none" />
              </div>
            </div>

            {/* Export format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.configFormat')}</label>
              <div className="flex gap-2 flex-wrap">
                {(['PDF', 'Excel', 'Word', 'JSON'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${exportFormat === fmt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.configOptions')}</label>
              <div className="space-y-2">
                {([
                  ['charts', t('reports.optCharts')],
                  ['recommendations', t('reports.optRecommendations')],
                  ['sectorComparison', t('reports.optSectorComparison')],
                  ['executiveSummary', t('reports.optExecutiveSummary')],
                  ['annexes', t('reports.optAnnexes')],
                ] as [keyof typeof options, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.configLang')}</label>
              <div className="flex gap-2">
                {(['FR', 'EN'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${lang === l ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                {t('common.previous')}
              </Button>
              <Button onClick={() => setStep(3)}>
                {t('common.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Generate */}
      {step === 3 && selectedTemplate && (
        <Card title={t('reports.stepGenerate')}>
          <div className="max-w-md space-y-6">
            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <selectedTemplate.icon className={`h-4 w-4 ${selectedTemplate.colorText}`} />
                {selectedTemplate.name}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <span className="font-medium text-gray-700">{t('reports.configOrg')}</span>
                <span>Demo Organization</span>
                <span className="font-medium text-gray-700">{t('reports.configPeriod')}</span>
                <span>Jan 2024 — Dec 2024</span>
                <span className="font-medium text-gray-700">{t('reports.configFormat')}</span>
                <span>{exportFormat}</span>
                <span className="font-medium text-gray-700">{t('reports.configLang')}</span>
                <span>{lang}</span>
              </div>
            </div>

            {!generated && !generating && (
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-center py-3 text-base" onClick={handleGenerate}>
                <BarChart3 className="h-5 w-5 mr-2" />
                {t('reports.generateBtn')}
              </Button>
            )}

            {generating && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                  {t('reports.generating')}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-primary-600 transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right">{progress}%</p>
              </div>
            )}

            {generated && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  {t('reports.successMsg')}
                </div>
                <Button className="w-full justify-center" onClick={handleDownload}>
                  <Download className="h-5 w-5 mr-2" />
                  {t('reports.downloadBtn')}
                </Button>
                <Button variant="secondary" className="w-full justify-center" onClick={() => { setStep(1); setSelectedTemplate(null); setGenerated(false); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('reports.newReport')}
                </Button>
              </div>
            )}

            {!generated && (
              <Button variant="secondary" onClick={() => setStep(2)}>
                {t('common.previous')}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Templates library ───────────────────────────────────────────────────

function TabTemplates({ onUse }: { onUse: (tmpl: Template) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{t('reports.templatesSubtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {TEMPLATES.map((tmpl) => (
          <TemplateCard key={tmpl.id} template={tmpl} onSelect={onUse} />
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Scheduling ──────────────────────────────────────────────────────────

function TabSchedule() {
  const { t } = useTranslation();
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([]);
  const [form, setForm] = useState({ template: '', frequency: 'Mensuel', day: '1', recipient: '' });

  const handleDelete = (id: number) => setScheduled((s) => s.filter((r) => r.id !== id));

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card title={t('reports.newSchedule')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.stepTemplate')}</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none"
              value={form.template}
              onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
            >
              <option value="">— {t('reports.stepTemplate')} —</option>
              {TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.name}>{tmpl.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.scheduleFreq')}</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none"
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
            >
              <option value="Mensuel">{t('reports.freqMonthly')}</option>
              <option value="Trimestriel">{t('reports.freqQuarterly')}</option>
              <option value="Annuel">{t('reports.freqYearly')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.recipients')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-300 outline-none"
                value={form.recipient}
                onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button className="w-full justify-center">
              <Calendar className="h-4 w-4 mr-2" />
              {t('reports.scheduleBtn')}
            </Button>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card title={t('reports.scheduledReports')}>
        {scheduled.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Calendar className="h-10 w-10 mx-auto mb-3" />
            <p className="text-sm">{t('reports.noScheduled')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduled.map((sr) => (
              <div key={sr.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{sr.name}</p>
                    <p className="text-xs text-gray-500">{sr.template} — {t('reports.nextRun')}: {sr.nextRun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FrequencyBadge freq={sr.frequency} />
                  <button className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sr.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabKey = 'dashboard' | 'new' | 'templates' | 'schedule';

export default function ReportsDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: t('reports.tabs.dashboard'), icon: BarChart3 },
    { key: 'new', label: t('reports.tabs.new'), icon: Plus },
    { key: 'templates', label: t('reports.tabs.templates'), icon: FileText },
    { key: 'schedule', label: t('reports.tabs.schedule'), icon: Calendar },
  ];

  const handleUseTemplate = (tmpl: Template) => {
    setActiveTab('new');
    // The TabNewReport will handle template selection through its own state
    // We switch tabs and let the user pick from the wizard
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('reports.title')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('reports.subtitle')}</p>
        </div>
        <Button onClick={() => setActiveTab('new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('reports.newReport')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <TabDashboard />}
      {activeTab === 'new' && <TabNewReport onSelectTemplate={handleUseTemplate} />}
      {activeTab === 'templates' && <TabTemplates onUse={handleUseTemplate} />}
      {activeTab === 'schedule' && <TabSchedule />}
    </div>
  );
}
