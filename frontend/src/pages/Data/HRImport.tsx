import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import ESRSStatsDashboard, { type S1Stats } from './ESRSStatsDashboard';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MappedRow {
  esrs_code: string;
  esrs_label: string;
  value: number;
  unit: string;
  raw_column: string;
  year?: number | null;
}

interface PreviewResponse {
  mapped_rows: MappedRow[];
  unmapped_columns: string[];
  warnings: string[];
  notes?: string[];
  detected_columns?: string[];
}

interface SyncResult {
  created: number;
  updated: number;
  total: number;
  year: number;
}

// ─── Sources disponibles ──────────────────────────────────────────────────────
const SOURCES = [
  { id: 'silae',   emoji: '📊', color: '#1a56db' },
  { id: 'lucca',   emoji: '👥', color: '#ff5a00' },
  { id: 'payfit',  emoji: '💰', color: '#0066ff' },
  { id: 'swile',   emoji: '🥗', color: '#ff5a5f' },
  { id: 'generic', emoji: '📄', color: '#6b7280' },
] as const;

type SourceId = typeof SOURCES[number]['id'];

// Brand names stay literal; only descriptions + the generic name are translated.
const getSourceMeta = (t: TFunction): Record<SourceId, { name: string; desc: string }> => ({
  silae:   { name: 'Silae',  desc: t('hri.descSilae', 'Export RH Silae — paie, effectifs, formation') },
  lucca:   { name: 'Lucca',  desc: t('hri.descLucca', 'Export Lucca — diversité, absentéisme, formation') },
  payfit:  { name: 'PayFit', desc: t('hri.descPayfit', 'Export PayFit — paie, effectifs, ancienneté') },
  swile:   { name: 'Swile',  desc: t('hri.descSwile', 'Export Swile — avantages, mobilité, frais') },
  generic: { name: t('hri.nameGeneric', 'Fichier générique'), desc: t('hri.descGeneric', 'Tout fichier CSV avec des données RH') },
});

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    { n: 1, label: t('hri.step1', 'Source & fichier') },
    { n: 2, label: t('hri.step2', 'Prévisualisation') },
    { n: 3, label: t('hri.step3', 'Confirmation') },
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
                  backgroundColor: done ? '#059669' : active ? '#1a56db' : '#e5e7eb',
                  color: done || active ? 'white' : '#9ca3af',
                }}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : s.n}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: active ? '#1a56db' : done ? '#059669' : '#9ca3af' }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-16 h-0.5 mb-5 mx-1"
                style={{ backgroundColor: step > s.n ? '#059669' : '#e5e7eb' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HRImport() {
  const { t } = useTranslation();
  const SOURCE_META = getSourceMeta(t);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialSource = (searchParams.get('source') as SourceId | null) ?? null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSource, setSelectedSource] = useState<SourceId | null>(
    SOURCES.find(s => s.id === initialSource) ? initialSource : null
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ── Statistiques ESRS S1 (graphiques) ────────────────────────────────────
  const [stats, setStats] = useState<S1Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await api.get<S1Stats>('/hr-import/stats');
      setStats(response.data);
    } catch {
      // Silencieux : la section statistiques reste simplement vide.
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleFileSelect = (f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.csv') {
      toast.error(t('hri.onlyCsv', 'Seuls les fichiers CSV sont acceptés'));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error(t('hri.maxSize', 'Le fichier ne doit pas dépasser 10 MB'));
      return;
    }
    setFile(f);
    setError(null);
  };

  // ── Step 1 → 2 : appel preview ───────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file || !selectedSource) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', selectedSource);
      const response = await api.post<PreviewResponse>('/hr-import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(response.data);
      setStep(2);
    } catch (err: any) {
      const message = err.response?.data?.detail ?? t('hri.analyzeError', "Erreur lors de l'analyse du fichier");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 → 3 : appel sync ──────────────────────────────────────────────
  const handleSync = async () => {
    if (!selectedSource || !previewData || previewData.mapped_rows.length === 0) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await api.post<SyncResult>('/hr-import/sync', {
        source: selectedSource,
        year,
        mapped_rows: previewData.mapped_rows,
      });
      setSyncResult(response.data);
      setStep(3);
      toast.success(t('hri.syncSuccess', 'Import RH terminé avec succès'));
      fetchStats();
    } catch (err: any) {
      const message = err.response?.data?.detail ?? t('hri.syncError', 'Erreur lors de la synchronisation');
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1);
    setFile(null);
    setSelectedSource(null);
    setPreviewData(null);
    setSyncResult(null);
    setError(null);
    setYear(new Date().getFullYear());
  };

  const sourceInfo = selectedSource
    ? { ...SOURCES.find(s => s.id === selectedSource)!, ...SOURCE_META[selectedSource] }
    : null;

  return (
    <div className="space-y-6">
      {/* ─── Back button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/app/data')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('hri.data', 'Données')}
      </button>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1a56db 0%, #1e3a8a 50%, #0c4a6e 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.1) 0%, transparent 55%)' }}
        />
        <div className="relative px-8 py-7 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Users className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{t('hri.heroTitle', 'Import RH — ESRS S1')}</h1>
            </div>
            <p className="text-blue-200 text-sm ml-1 mb-4">
              {t('hri.heroDesc', 'Importez vos données RH depuis votre logiciel de paie et mappez-les automatiquement aux indicateurs ESRS S1')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {['Silae', 'Lucca', 'PayFit', 'Swile', t('hri.generic', 'Générique')].map(label => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <FileText className="h-4 w-4 text-blue-100" />
            <span className="text-sm text-blue-100 font-medium">{t('hri.csvOnly', 'CSV uniquement')}</span>
          </div>
        </div>
      </div>

      {/* ─── Step indicator ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-5">
        <StepBar step={step} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1 — Sélection source + upload                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Source selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{t('hri.chooseSoftware', 'Choisissez votre logiciel RH')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('hri.chooseSoftwareDesc', 'Sélectionnez la source pour adapter le mapping des colonnes automatiquement')}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SOURCES.map(src => {
                  const isSelected = selectedSource === src.id;
                  return (
                    <button
                      key={src.id}
                      onClick={() => setSelectedSource(src.id)}
                      className="relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                      style={{
                        borderColor: isSelected ? src.color : '#e5e7eb',
                        backgroundColor: isSelected ? `${src.color}08` : 'white',
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: src.color }}
                        >
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <span className="text-2xl leading-none mt-0.5">{src.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{SOURCE_META[src.id].name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{SOURCE_META[src.id].desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* File upload */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{t('hri.dropTitle', 'Déposez votre fichier CSV')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('hri.dropSubtitle', 'Format CSV — max 10 MB')}</p>
            </div>
            <div className="p-6">
              {!file ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className="relative rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: dragActive ? '#1a56db' : '#d1d5db',
                    backgroundColor: dragActive ? '#eff6ff' : '#fafafa',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: dragActive ? '#dbeafe' : '#f3f4f6' }}
                  >
                    <Upload className="h-8 w-8" style={{ color: dragActive ? '#1a56db' : '#9ca3af' }} />
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-1">
                    {t('hri.dropHere', 'Glissez-déposez votre fichier ici')}
                  </p>
                  <p className="text-sm text-gray-400">{t('hri.browse', 'ou cliquez pour parcourir vos fichiers')}</p>
                  <p className="text-xs text-blue-500 mt-3 font-medium">{t('hri.csvMax', 'CSV uniquement — max 10 MB')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File card */}
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl border-2"
                    style={{ borderColor: '#34d399', backgroundColor: '#f0fdf4' }}
                  >
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#dcfce7' }}>
                      <FileText className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        {sourceInfo && (
                          <span className="ml-2 text-blue-600 font-medium">· {sourceInfo.name}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 text-xs underline shrink-0"
              >
                {t('hri.close', 'Fermer')}
              </button>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || !selectedSource || loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#1a56db' }}
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                {t('hri.analyzing', 'Analyse en cours…')}
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4" />
                {t('hri.analyzeFile', 'Analyser le fichier')}
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2 — Prévisualisation                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && previewData && (
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{t('hri.mappedTitle', 'Données mappées ESRS S1')}</h2>
                <p className="text-sm text-gray-500">
                  <span className="text-blue-600 font-medium">{t('hri.indicatorsDetected', '{{count}} indicateurs ESRS S1 détectés', { count: previewData.mapped_rows.length })}</span>
                  {previewData.unmapped_columns.length > 0 && (
                    <span className="text-amber-600 font-medium">
                      {' '}{t('hri.unrecognizedCols', '· {{count}} colonne{{s}} non reconnue{{s}}', { count: previewData.unmapped_columns.length, s: previewData.unmapped_columns.length > 1 ? 's' : '' })}
                    </span>
                  )}
                </p>
              </div>
              {sourceInfo && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: sourceInfo.color }}
                >
                  <span>{sourceInfo.emoji}</span>
                  {sourceInfo.name}
                </div>
              )}
            </div>

            {/* Info notes (e.g. nominative roster auto-aggregation) */}
            {previewData.notes && previewData.notes.length > 0 && (
              <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">{t('hri.infoTitle', 'Information')}</p>
                  <ul className="space-y-0.5">
                    {previewData.notes.map((n, i) => (
                      <li key={i} className="text-xs text-blue-700">{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Warnings */}
            {previewData.warnings.length > 0 && (
              <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">{t('hri.warnings', 'Avertissements')}</p>
                  <ul className="space-y-0.5">
                    {previewData.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Unmapped columns */}
            {previewData.unmapped_columns.length > 0 && (
              <div className="px-6 pt-4 flex flex-wrap gap-2">
                {previewData.unmapped_columns.map(col => (
                  <span
                    key={col}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {col}
                    <span className="text-amber-500 font-normal">{t('hri.notMapped', '— Non mappé')}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Mapped rows table */}
            <div className="p-6">
              {previewData.mapped_rows.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{t('hri.thIndicator', 'Indicateur ESRS')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{t('hri.thCode', 'Code ESRS')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{t('hri.thValue', 'Valeur')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{t('hri.thUnit', 'Unité')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{t('hri.thSourceCol', 'Colonne source')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{t('hri.thStatus', 'Statut')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {previewData.mapped_rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">{row.esrs_label}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-100 text-blue-800">
                              {row.esrs_code}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap font-mono">
                            {row.value !== null && row.value !== undefined ? String(row.value) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{row.unit || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap font-mono">{row.raw_column}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('hri.recognizedCol', 'Colonne reconnue')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertCircle className="h-10 w-10 text-amber-400 mb-3" />
                  <p className="text-sm font-semibold text-gray-700">{t('hri.noIndicators', 'Aucun indicateur ESRS S1 détecté')}</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    {t('hri.checkFormat', 'Vérifiez que votre fichier correspond au format attendu pour la source sélectionnée.')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Year selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">{t('hri.refYear', 'Année de référence')}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('hri.refYearDesc', 'Les indicateurs importés seront rattachés à cette année fiscale.')}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                min={2000}
                max={2100}
                className="w-32 px-4 py-2.5 border-2 border-gray-200 rounded-xl outline-none text-sm font-mono font-semibold focus:border-blue-500 transition-colors"
              />
              <span className="text-sm text-gray-500">{t('hri.fiscalYearImport', "Année fiscale pour l'import ESRS S1")}</span>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-0.5">{t('hri.checkConnection', 'Vérifiez votre connexion et réessayez.')}</p>
              </div>
              <button
                onClick={handleAnalyze}
                className="text-xs font-medium text-red-600 hover:text-red-800 underline shrink-0 transition-colors"
              >
                {t('hri.retry', 'Réessayer')}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { setStep(1); setError(null); }}
              className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('hri.back', 'Retour')}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || previewData.mapped_rows.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: '#1a56db' }}
            >
              {syncing ? (
                <>
                  <Spinner size="sm" />
                  {t('hri.importing', 'Importation en cours…')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t('hri.importInto', 'Importer dans ESGFlow')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3 — Succès                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && syncResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="text-center py-16 px-8">
            {/* Icon */}
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('hri.importDone', 'Import RH terminé !')}</h2>
            <p className="text-gray-500 text-sm mb-8">
              <strong className="text-gray-800">{t('hri.totalIndicators', '{{count}} indicateurs ESRS S1', { count: syncResult.total })}</strong>{t('hri.importedForYear', " importés pour l'année ")}
              <strong className="text-gray-800">{syncResult.year}</strong>
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
              <div className="py-6 px-4 rounded-2xl" style={{ backgroundColor: '#f0fdf4' }}>
                <p className="text-3xl font-bold mb-1" style={{ color: '#16a34a' }}>{syncResult.created}</p>
                <p className="text-xs text-gray-500">{t('hri.created', 'créés')}</p>
              </div>
              <div className="py-6 px-4 rounded-2xl" style={{ backgroundColor: '#eff6ff' }}>
                <p className="text-3xl font-bold mb-1" style={{ color: '#2563eb' }}>{syncResult.updated}</p>
                <p className="text-xs text-gray-500">{t('hri.updated', 'mis à jour')}</p>
              </div>
            </div>

            {/* Source info */}
            {sourceInfo && (
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: sourceInfo.color }}>
                <span>{sourceInfo.emoji}</span>
                {t('hri.sourceLabel', 'Source :')} {sourceInfo.name}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                {t('hri.importAnother', 'Importer un autre fichier')}
              </button>
              <button
                onClick={() => navigate('/app/data')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#059669' }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t('hri.viewData', 'Voir les données')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Statistiques ESRS S1 — graphiques sur les données déjà importées      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <ESRSStatsDashboard stats={stats} loading={statsLoading} />
    </div>
  );
}
