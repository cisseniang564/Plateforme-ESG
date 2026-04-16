import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Upload, FileText, CheckCircle, XCircle, AlertCircle, Database,
  UploadCloud, ArrowLeft, FileSpreadsheet, Info, ChevronRight,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface UploadResult {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  data_preview: any[];
  validation_errors: any;
  error_message?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UploadData() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  }, []);

  const handleFileChange = (selectedFile: File) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      toast.error(t('upload.invalidFileType', 'Format non supporté. Utilisez CSV ou Excel.'));
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error(t('upload.fileTooLarge', 'Fichier trop volumineux (max 10 Mo).'));
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setImportResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/data/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      toast.success(t('upload.uploadSuccess', 'Fichier analysé avec succès'));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('upload.uploadFailed', 'Échec de l\'upload'));
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!result) return;
    setImporting(true);
    try {
      const response = await api.post(`/indicator-data/uploads/${result.id}/import`);
      setImportResult(response.data);
      toast.success(t('upload.importComplete', 'Import terminé avec succès'));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('upload.importError', 'Échec de l\'import'));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setImportResult(null); };

  const validRate = result && result.total_rows > 0
    ? Math.round((result.valid_rows / result.total_rows) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <UploadCloud size={13} />
              {t('upload.heroTag', 'Import de données ESG')}
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Upload className="h-8 w-8" />
              {t('upload.title', 'Importer des données')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {t('upload.subtitle', 'Importez vos données ESG au format CSV ou Excel')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">CSV</span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">XLSX / XLS</span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">{t('upload.maxSize', 'Max 10 Mo')}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/data')}
            className="self-start flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <ArrowLeft size={14} />
            {t('common.back', 'Retour')}
          </button>
        </div>
      </div>

      {/* Zone d'upload */}
      {!result && (
        <Card>
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors ${
                  dragActive ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <UploadCloud size={32} className={dragActive ? 'text-blue-600' : 'text-gray-400'} />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">{t('upload.dropFile', 'Glissez votre fichier ici')}</p>
                <p className="text-sm text-gray-500 mb-5">{t('upload.supportedFormats', 'CSV, XLSX, XLS — max 10 Mo')}</p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  <Upload size={14} />
                  {t('upload.selectFile', 'Sélectionner un fichier')}
                </label>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
                  <FileSpreadsheet size={28} className="text-blue-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <CheckCircle size={18} className="text-emerald-500 ml-2" />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? <><Spinner size="sm" className="border-white" /> {t('upload.uploading', 'Analyse en cours…')}</> : <><Upload size={14} /> {t('common.upload', 'Analyser')}</>}
                  </button>
                  <button
                    onClick={reset}
                    disabled={uploading}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {t('common.cancel', 'Annuler')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Format requis */}
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">{t('upload.requiredFormat', 'Format requis')}</p>
              <p className="text-xs text-blue-700 mb-2">{t('upload.formatDescription', 'Colonnes attendues dans votre fichier :')}</p>
              <div className="flex flex-wrap gap-1.5">
                {['indicator_code', 'value', 'date', 'organization_id', 'notes'].map(col => (
                  <code key={col} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg text-xs font-mono">{col}</code>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Résultats */}
      {result && (
        <div className="space-y-5">
          {/* Résumé */}
          <Card className={`border-l-4 ${result.status === 'completed' ? 'border-emerald-500' : result.status === 'failed' ? 'border-red-500' : 'border-amber-500'}`}>
            <div className="flex items-start gap-4">
              {result.status === 'completed'
                ? <CheckCircle size={36} className="text-emerald-500 flex-shrink-0" />
                : result.status === 'failed'
                ? <XCircle size={36} className="text-red-500 flex-shrink-0" />
                : <AlertCircle size={36} className="text-amber-500 flex-shrink-0" />}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {result.status === 'completed' ? t('upload.uploadSuccess', 'Analyse réussie') :
                   result.status === 'failed' ? t('upload.uploadFailed', 'Échec de l\'analyse') : 'En cours…'}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 mb-4">{result.filename}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{t('upload.totalRows', 'Total lignes')}</p>
                    <p className="text-2xl font-bold text-gray-900">{result.total_rows}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-emerald-600">{t('upload.validRows', 'Lignes valides')}</p>
                    <p className="text-2xl font-bold text-emerald-700">{result.valid_rows}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-xs text-red-500">{t('upload.invalidRows', 'Lignes invalides')}</p>
                    <p className="text-2xl font-bold text-red-600">{result.invalid_rows}</p>
                  </div>
                </div>
                {result.total_rows > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{t('upload.quality', 'Qualité')}</span>
                      <span className="font-semibold text-emerald-600">{validRate}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full">
                      <div
                        className={`h-2 rounded-full transition-all ${validRate >= 90 ? 'bg-emerald-500' : validRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${validRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Aperçu données */}
          {result.data_preview?.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={14} className="text-gray-500" />
                {t('upload.dataPreview', 'Aperçu des données')}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(result.data_preview[0]).map(key => (
                        <th key={key} className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.data_preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((value: any, i) => (
                          <td key={i} className="px-3 py-2 text-gray-700 whitespace-nowrap">{value?.toString() || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Résultat import */}
          {importResult && (
            <Card className="border-l-4 border-emerald-500">
              <div className="flex items-start gap-3">
                <Database size={22} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{t('upload.importComplete', 'Import terminé')}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('upload.rowsImported', { imported: importResult.imported, skipped: importResult.skipped })}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-1">{t('upload.errors', 'Avertissements')}</p>
                      <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                        {importResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            {!importResult && result.valid_rows > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {importing ? <><Spinner size="sm" className="border-white" /> {t('upload.importing', 'Import…')}</> : <><Database size={14} /> {t('upload.importToIndicators', { count: result.valid_rows })}</>}
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Upload size={13} /> {t('upload.uploadAnother', 'Nouvel import')}
            </button>
            <button
              onClick={() => navigate('/app/indicators')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              {t('upload.viewIndicators', 'Voir les indicateurs')} <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
