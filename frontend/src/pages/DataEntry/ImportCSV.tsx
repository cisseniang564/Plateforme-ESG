import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BackButton from '@/components/common/BackButton';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Database,
  X,
  RefreshCw,
  Eye,
  Building2,
  Zap,
  ArrowRight,
  FileSpreadsheet,
  Table,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PreviewData {
  upload_id: string;
  filename: string;
  total_rows: number;
  columns: string[];
  detected_mapping: Record<string, string>;
  preview: Record<string, any>[];
  validation: { valid_rows: number; invalid_rows: number; errors: any; };
}
interface ImportResult {
  imported: number;
  indicator_data_created?: number;
  errors: number;
  error_details: any[];
  fec?: boolean;
  scores_recalculated?: number;
}
interface Organization { id: string; name: string; }

// ─── Field definitions ────────────────────────────────────────────────────────
const FIELD_DEFS = [
  { key: 'metric_name',   label: 'Indicateur',    required: true,  color: 'purple' },
  { key: 'value_numeric', label: 'Valeur',         required: true,  color: 'green' },
  { key: 'pillar',        label: 'Pilier ESG',     required: false, color: 'blue' },
  { key: 'unit',          label: 'Unité',          required: false, color: 'gray' },
  { key: 'period_start',  label: 'Début période',  required: false, color: 'gray' },
  { key: 'period_end',    label: 'Fin période',    required: false, color: 'gray' },
  { key: 'category',      label: 'Catégorie',      required: false, color: 'gray' },
  { key: 'data_source',   label: 'Source données', required: false, color: 'gray' },
  { key: 'notes',         label: 'Notes',          required: false, color: 'gray' },
] as const;

const COLOR_CLASSES: Record<string, { badge: string; dot: string }> = {
  purple: { badge: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  green:  { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  blue:   { badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  gray:   { badge: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  miss:   { badge: 'bg-red-50 text-red-500 border-red-200', dot: 'bg-red-300' },
};

// ─── FEC Detection ────────────────────────────────────────────────────────────
// A real FEC (Fichier des Écritures Comptables) file follows the Article A.47 A-1
// LPF format: it MUST contain specific column names like JournalCode, EcritureNum,
// EcritureDate, CompteNum etc. Counting separators alone is unreliable (any French
// CSV exported by Excel uses ; as separator).
const FEC_HEADER_KEYWORDS = ['JournalCode', 'EcritureNum', 'EcritureDate', 'CompteNum', 'PieceRef', 'EcritureLib'];
const FEC_FILENAME_HINT   = /(^|[\\/])\d{9}fec\d{8}\.(txt|csv)$/i;  // e.g. 851234567FEC20251231.txt
const FEC_MIN_KEYWORDS    = 2;  // require ≥2 FEC-specific column names to claim "FEC"

async function detectFecFile(file: File): Promise<boolean> {
  // 1. Filename heuristic — the official naming convention is strong evidence
  if (FEC_FILENAME_HINT.test(file.name)) return true;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const firstLine = (content.split('\n')[0] || '').toLowerCase();
      // 2. Count how many distinct FEC keywords appear in the header line
      const matched = FEC_HEADER_KEYWORDS.filter(kw => firstLine.includes(kw.toLowerCase()));
      resolve(matched.length >= FEC_MIN_KEYWORDS);
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file.slice(0, 4096));
  });
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Fichier' },
    { n: 2, label: 'Aperçu' },
    { n: 3, label: 'Résultat' },
  ];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  backgroundColor: done ? '#059669' : active ? '#7c3aed' : '#e5e7eb',
                  color: done || active ? 'white' : '#9ca3af',
                }}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : s.n}
              </div>
              <span className="text-xs font-medium" style={{ color: active ? '#7c3aed' : done ? '#059669' : '#9ca3af' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-16 h-0.5 mb-5 mx-1" style={{ backgroundColor: step > s.n ? '#059669' : '#e5e7eb' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
// ─── Contextual banners ────────────────────────────────────────────────────
// Each entry tells the user what this specific import flow is for and where
// the data will be visible after upload. Driven by ``?type=<kind>`` in the URL.
const IMPORT_CONTEXTS: Record<string, {
  emoji: string;
  title: string;
  description: string;
  destinationLabel: string;
  destinationPath: string;
  examples: string[];
  bg: string;
  border: string;
  accent: string;
}> = {
  fec: {
    emoji: '📄',
    title: 'Import FEC — Bilan Carbone par dépense',
    description:
      'Importez votre Fichier des Écritures Comptables (Sage, Cegid, Pennylane…) — chaque ligne sera mappée à un facteur ADEME et agrégée par scope GHG.',
    destinationLabel: 'Indicateurs / Scores ESG',
    destinationPath: '/app/data',
    examples: ['JournalCode', 'CompteNum', 'CompteLib', 'Montantdebit'],
    bg:     'from-amber-50 to-orange-50',
    border: 'border-amber-300',
    accent: 'text-amber-700',
  },
  materiality: {
    emoji: '🎯',
    title: 'Import Matérialité — Matrice de double matérialité',
    description:
      'Chaque ligne devient un enjeu ESG positionné sur la matrice (impact financier × impact ESG). Les enjeux marqués matériels apparaîtront dans le rapport CSRD.',
    destinationLabel: 'Analyses → Matrice de matérialité',
    destinationPath: '/app/materiality',
    examples: ['name', 'category', 'financial_impact', 'esg_impact', 'is_material'],
    bg:     'from-pink-50 to-rose-50',
    border: 'border-pink-300',
    accent: 'text-pink-700',
  },
  risks: {
    emoji: '⚠️',
    title: 'Import Risques ESG — Registre des risques',
    description:
      'Chaque ligne devient un risque positionné sur la heatmap (probabilité × impact). Le score sera calculé automatiquement si non fourni.',
    destinationLabel: 'Analyses → Registre des risques',
    destinationPath: '/app/risks',
    examples: ['title', 'category', 'probability', 'impact', 'severity', 'mitigation_status'],
    bg:     'from-red-50 to-orange-50',
    border: 'border-red-300',
    accent: 'text-red-700',
  },
  suppliers: {
    emoji: '🏭',
    title: 'Import Fournisseurs — Supply Chain ESG',
    description:
      'Chaque ligne devient un fournisseur avec son score ESG global (E/S/G). Utilisé pour le devoir de vigilance CSDDD et le calcul Scope 3.',
    destinationLabel: 'Parties → Supply Chain ESG',
    destinationPath: '/app/supply-chain',
    examples: ['name', 'country', 'sector', 'annual_spend_eur', 'global_score', 'e_score', 's_score', 'g_score'],
    bg:     'from-cyan-50 to-sky-50',
    border: 'border-cyan-300',
    accent: 'text-cyan-700',
  },
  ghg: {
    emoji: '🔥',
    title: 'Import Bilan Carbone — Scopes 1/2/3',
    description:
      'Inventaire GHG Protocol par scope et catégorie. Le système agrège automatiquement par scope et calcule les émissions totales en tCO₂e.',
    destinationLabel: 'Analyses → Scores ESG',
    destinationPath: '/app/scores',
    examples: ['scope', 'category', 'source', 'tco2e', 'calculation_method', 'period'],
    bg:     'from-orange-50 to-red-50',
    border: 'border-orange-300',
    accent: 'text-orange-700',
  },
};

export default function ImportCSV() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = (searchParams.get('type') || '').toLowerCase();
  const context = IMPORT_CONTEXTS[typeParam];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fecImporting, setFecImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isFecFile, setIsFecFile] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // mapping state — auto-filled from detected_mapping, editable in advanced panel
  const [mapping, setMapping] = useState<Record<string, string>>({
    pillar: '', category: '', metric_name: '', value_numeric: '',
    unit: '', period_start: '', period_end: '', data_source: '', notes: '',
  });

  // Load orgs on mount
  useEffect(() => {
    api.get('/organizations').then(res => {
      const orgs = res.data?.items || res.data?.organizations || res.data?.results || [];
      setOrganizations(Array.isArray(orgs) ? orgs : []);
    }).catch(() => {});
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xlsx', '.xls', '.txt', '.fec'].includes(ext)) {
      toast.error(t('importCsv.invalidFileType'));
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error(t('importCsv.fileTooLarge'));
      return;
    }
    setFile(selectedFile);
    setIsFecFile(false);
    const fec = await detectFecFile(selectedFile);
    setIsFecFile(fec);
    if (fec) toast('Fichier FEC détecté — utilisez l\'import FEC dédié ci-dessous.', { icon: '⚠️', duration: 5000 });
  };

  const handleFecImport = async () => {
    if (!file) return;
    setFecImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    if (selectedOrgId) formData.append('organization_id', selectedOrgId);
    try {
      const response = await api.post('/connectors/sage-cegid/sync', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = response.data.entries_created ?? response.data.imported ?? response.data.count ?? 0;
      setImportResult({ imported: created, indicator_data_created: response.data.indicator_data_created ?? 0, errors: response.data.errors ?? 0, error_details: response.data.error_details ?? [], fec: true });
      setStep(3);
      toast.success(`FEC importé — ${created} entrée(s) créée(s)`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import FEC');
    } finally {
      setFecImporting(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/esg-import/upload-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(response.data);
      // Auto-fill mapping from detected columns
      const dm = response.data.detected_mapping || {};
      setMapping({
        pillar: dm.pillar || '',
        category: dm.category || '',
        metric_name: dm.metric_name || '',
        value_numeric: dm.value_numeric || '',
        unit: dm.unit || '',
        period_start: dm.period_start || '',
        period_end: dm.period_end || '',
        data_source: dm.data_source || '',
        notes: dm.notes || '',
      });
      setStep(2);
      toast.success(t('importCsv.fileAnalyzed'));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('importCsv.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    if (!mapping.metric_name || !mapping.value_numeric) {
      toast.error('Les colonnes "Indicateur" et "Valeur" sont requises. Utilisez la configuration manuelle.');
      return;
    }
    setImporting(true);
    try {
      const payload: any = { ...mapping };
      if (selectedOrgId) payload.organization_id = selectedOrgId;
      const response = await api.post(`/esg-import/uploads/${previewData.upload_id}/import`, payload);
      setImportResult(response.data);
      setStep(3);
      toast.success(t('importCsv.importSuccess', { count: response.data.imported }));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('importCsv.importError'));
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1); setFile(null); setPreviewData(null); setImportResult(null);
    setSelectedOrgId(''); setIsFecFile(false); setShowAdvanced(false);
    setMapping({ pillar: '', category: '', metric_name: '', value_numeric: '', unit: '', period_start: '', period_end: '', data_source: '', notes: '' });
  };

  const downloadTemplate = () => {
    const template = `pillar,category,metric_name,value_numeric,unit,period_start,period_end,data_source,notes
environmental,emissions,Emissions CO2 Scope 1,1234.5,tCO2e,2024-01-01,2024-12-31,Bilan Carbone 2024,Donnees validees
social,workforce,Effectif total,500,personnes,2024-01-01,2024-12-31,HRIS,
environmental,energy,Consommation electricite,2500,MWh,2024-01-01,2024-12-31,Factures EDF,`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template_import_esg.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : '0';

  // Determine if required columns are mapped (auto or manual)
  const canImport = !!(mapping.metric_name && mapping.value_numeric);
  const detectedCount = FIELD_DEFS.filter(f => mapping[f.key as keyof typeof mapping]).length;

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label="Données" />

      {/* ─── Contextual banner (visible only when ?type=fec|materiality|… is in the URL) ── */}
      {context && (
        <div className={`rounded-2xl border-2 ${context.border} bg-gradient-to-br ${context.bg} p-5`}>
          <div className="flex items-start gap-4">
            <div className="text-4xl shrink-0">{context.emoji}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{context.title}</h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{context.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-semibold ${context.accent}`}>📍 Destination :</span>
                <button
                  type="button"
                  onClick={() => navigate(context.destinationPath)}
                  className={`underline-offset-2 hover:underline font-semibold ${context.accent}`}
                >
                  {context.destinationLabel}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide mr-1">
                  Colonnes attendues :
                </span>
                {context.examples.map((c) => (
                  <code
                    key={c}
                    className="px-1.5 py-0.5 rounded bg-white/70 text-[11px] font-mono text-gray-700 border border-gray-200"
                  >
                    {c}
                  </code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/connectors')}
                className={`mt-3 inline-flex items-center gap-1 text-xs ${context.accent} hover:opacity-80 font-semibold`}
              >
                ↓ Télécharger un template pré-formaté
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4f46e5 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
        <div className="relative px-8 py-7 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Upload className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{t('importCsv.title')}</h1>
            </div>
            <p className="text-purple-200 text-sm ml-1 mb-4">{t('importCsv.subtitle')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'CSV', icon: FileText },
                { label: 'Excel', icon: FileSpreadsheet },
                { label: 'FEC', icon: Zap },
                { label: 'Détection auto', icon: Sparkles },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shrink-0 transition-colors"
            style={{ background: 'white', color: '#7c3aed' }}
          >
            <Download className="h-4 w-4" />
            {t('importCsv.csvTemplate')}
          </button>
        </div>
      </div>

      {/* ─── Step indicator ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-5">
        <StepBar step={step} />
      </div>

      {/* ─── Step 1: Upload ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{t('importCsv.step1Title')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Formats acceptés : CSV, Excel, TXT, FEC — max 10 MB</p>
          </div>
          <div className="p-6 space-y-4">
            {!file ? (
              <div
                onDragEnter={handleDrag} onDragLeave={handleDrag}
                onDragOver={handleDrag} onDrop={handleDrop}
                className="relative rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer transition-all"
                style={{ borderColor: dragActive ? '#7c3aed' : '#d1d5db', backgroundColor: dragActive ? '#f5f3ff' : '#fafafa' }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input" type="file"
                  accept=".csv,.xlsx,.xls,.txt,.fec"
                  onChange={e => e.target.files && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: dragActive ? '#ede9fe' : '#f3f4f6' }}>
                  <Upload className="h-8 w-8" style={{ color: dragActive ? '#7c3aed' : '#9ca3af' }} />
                </div>
                <p className="text-lg font-semibold text-gray-700 mb-1">{t('importCsv.dropZoneText')}</p>
                <p className="text-sm text-gray-400">CSV, Excel, TXT, FEC — max 10 MB</p>
                <p className="text-xs text-purple-500 mt-3 font-medium">Cliquer pour parcourir</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ borderColor: isFecFile ? '#fcd34d' : '#34d399', backgroundColor: isFecFile ? '#fffbeb' : '#f0fdf4' }}>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: isFecFile ? '#fef3c7' : '#dcfce7' }}>
                    <FileText className="h-6 w-6" style={{ color: isFecFile ? '#d97706' : '#16a34a' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-gray-500">{fileSizeMB} MB</span>
                      {isFecFile && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800">
                          <Zap className="h-3 w-3" />FEC détecté
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setFile(null); setIsFecFile(false); }} className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* FEC Dedicated Import */}
                {isFecFile && (
                  <div className="rounded-2xl border-2 border-amber-300 p-5 space-y-4" style={{ backgroundColor: '#fffbeb' }}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-900">Fichier des Écritures Comptables (FEC) détecté</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Utilisez l'<strong>Import FEC dédié</strong> ci-dessous — il analyse, catégorise et agrège automatiquement chaque écriture comptable selon les facteurs ADEME.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 shrink-0">
                        <Building2 className="h-4 w-4 text-amber-700" />
                      </div>
                      <select
                        value={selectedOrgId}
                        onChange={e => setSelectedOrgId(e.target.value)}
                        className="flex-1 px-3 py-2.5 border-2 border-amber-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                      >
                        <option value="">— Organisation (optionnel) —</option>
                        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleFecImport}
                      disabled={fecImporting}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#d97706' }}
                    >
                      {fecImporting ? <><Spinner size="sm" />Analyse et import en cours…</> : <><Zap className="h-4 w-4" />Importer avec le parseur FEC dédié</>}
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 underline py-1 transition-colors"
                    >
                      {uploading ? 'Analyse…' : 'Forcer l\'import générique CSV (déconseillé pour un FEC)'}
                    </button>
                  </div>
                )}

                {/* Generic CSV button */}
                {!isFecFile && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    {uploading ? (
                      <><Spinner size="sm" />{t('importCsv.analyzing')}</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />Analyser et détecter les colonnes automatiquement</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 2: Smart Preview (no manual mapping needed) ──────────────── */}
      {step === 2 && previewData && (
        <div className="space-y-5">

          {/* ── Auto-detection result banner ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">Colonnes détectées automatiquement</h2>
                <p className="text-sm text-gray-500">
                  {previewData.total_rows} lignes au total ·{' '}
                  <span className="text-emerald-600 font-medium">{previewData.validation.valid_rows} prêtes à importer</span>
                  {previewData.validation.invalid_rows > 0 && (
                    <span className="text-amber-600 font-medium"> · {previewData.validation.invalid_rows} ignorées</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">{detectedCount}/{FIELD_DEFS.length} colonnes</span>
              </div>
            </div>

            {/* Column detection chips */}
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-5">
                {FIELD_DEFS.map(f => {
                  const detectedCol = mapping[f.key as keyof typeof mapping];
                  const isDetected = !!detectedCol;
                  const colorKey = isDetected ? f.color : (f.required ? 'miss' : 'gray');
                  const cls = COLOR_CLASSES[colorKey];
                  return (
                    <div
                      key={f.key}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${cls.badge}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} />
                      <span className="font-semibold">{f.label}</span>
                      {isDetected ? (
                        <span className="opacity-70">← <code className="font-mono">{detectedCol}</code></span>
                      ) : (
                        <span className="opacity-60">{f.required ? 'non détecté ⚠' : 'non détecté'}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Warning if required columns missing */}
              {!canImport && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Colonnes requises non détectées</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Les colonnes <strong>Indicateur</strong> et <strong>Valeur</strong> sont obligatoires.
                      Utilisez la configuration manuelle ci-dessous pour les associer manuellement.
                    </p>
                  </div>
                </div>
              )}

              {/* Info tip when all good */}
              {canImport && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                  <Info className="h-4 w-4 shrink-0" />
                  La détection automatique a identifié toutes les colonnes requises. Vous pouvez importer directement, ou ajuster la configuration ci-dessous.
                </div>
              )}
            </div>
          </div>

          {/* ── Organisation selector ── */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-xl shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-1.5">
                  Organisation concernée
                  <span className="ml-2 text-xs font-normal text-blue-600">(recommandé pour le calcul des scores ESG)</span>
                </p>
                <select
                  value={selectedOrgId}
                  onChange={e => setSelectedOrgId(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-blue-200 rounded-xl focus:border-blue-500 bg-white outline-none text-sm"
                >
                  <option value="">— Sélectionner une organisation —</option>
                  {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
                {!selectedOrgId && (
                  <p className="text-xs text-amber-600 mt-1.5">⚠️ Sans organisation, les données ne seront pas liées aux scores ESG.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Data preview table ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <h3 className="text-base font-bold text-gray-900">Aperçu des données</h3>
              <span className="ml-auto text-xs text-gray-400">10 premières lignes sur {previewData.total_rows}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.columns.map(col => {
                      const isMetric = col === mapping.metric_name;
                      const isValue = col === mapping.value_numeric;
                      return (
                        <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                          {col}
                          {isMetric && <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">indicateur</span>}
                          {isValue  && <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium">valeur</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewData.preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      {previewData.columns.map(col => (
                        <td key={col} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Advanced settings (collapsible) ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Configuration manuelle des colonnes</span>
                <span className="text-xs text-gray-400 font-normal">(optionnel — si la détection auto est incorrecte)</span>
              </div>
              {showAdvanced ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 border-t border-gray-50">
                <p className="text-xs text-gray-500 py-3">Associez manuellement les colonnes de votre fichier aux champs ESG :</p>
                <div className="grid grid-cols-2 gap-4">
                  {FIELD_DEFS.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        {f.label}
                        {f.required && <span className="text-purple-500 ml-1">*</span>}
                      </label>
                      <select
                        value={mapping[f.key as keyof typeof mapping] || ''}
                        onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className={`w-full px-3 py-2 border-2 rounded-xl outline-none text-sm transition-colors focus:border-purple-500 ${
                          mapping[f.key as keyof typeof mapping] ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'
                        }`}
                      >
                        <option value="">{f.required ? '— Sélectionner —' : '— Aucune —'}</option>
                        {previewData.columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !canImport}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: canImport ? '#7c3aed' : '#9ca3af' }}
            >
              {importing ? (
                <><Spinner size="sm" />{t('importCsv.importing')}</>
              ) : (
                <><Database className="h-4 w-4" />Importer {previewData.validation.valid_rows} ligne{previewData.validation.valid_rows !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Results ───────────────────────────────────────────────── */}
      {step === 3 && importResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="text-center py-16 px-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('importCsv.importSuccessTitle')}</h2>

            {importResult.fec && (
              <p className="text-sm text-amber-700 font-medium mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50">
                <Zap className="h-4 w-4" />
                Import FEC — catégorisé et agrégé automatiquement
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              {[
                { value: importResult.imported, label: t('importCsv.importedData'), color: '#16a34a', bg: '#f0fdf4' },
                { value: importResult.indicator_data_created ?? 0, label: 'Indicateurs ESG liés', color: '#2563eb', bg: '#eff6ff' },
                { value: importResult.errors, label: t('importCsv.errors'), color: '#dc2626', bg: '#fef2f2' },
              ].map(stat => (
                <div key={stat.label} className="py-6 px-4 rounded-2xl" style={{ backgroundColor: stat.bg }}>
                  <p className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {(importResult.scores_recalculated ?? 0) > 0 && (
              <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl max-w-md mx-auto text-sm text-emerald-800">
                🔄 Scores ESG recalculés automatiquement pour {importResult.scores_recalculated} organisation(s).
                Consultez la page <strong>Score ESG</strong> pour voir les nouveaux scores.
              </div>
            )}
            {(importResult.indicator_data_created ?? 0) > 0 && (
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-md mx-auto text-sm text-blue-800">
                ✅ {importResult.indicator_data_created} point(s) de données liés aux indicateurs ESG.
              </div>
            )}

            {/* Error details */}
            {importResult.errors > 0 && importResult.error_details?.length > 0 && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl max-w-lg mx-auto text-left text-xs text-red-700 space-y-1">
                <p className="font-semibold mb-2">{importResult.errors} ligne(s) en erreur :</p>
                {importResult.error_details.slice(0, 5).map((e: any, i: number) => (
                  <p key={i}>Ligne {e.row} — {e.error}</p>
                ))}
                {importResult.error_details.length > 5 && (
                  <p className="text-red-400">… et {importResult.error_details.length - 5} autres erreurs</p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                {t('importCsv.importAnother')}
              </button>
              <button
                onClick={() => navigate(importResult.fec ? '/app/my-data?source=fec_import' : '/app/my-data')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#059669' }}
              >
                <CheckCircle className="h-4 w-4" />
                {t('importCsv.viewData')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
