import { useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BackButton from '@/components/common/BackButton';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Database,
  X,
  RefreshCw,
  Eye,
  Building2,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface PreviewData {
  upload_id: string;
  filename: string;
  total_rows: number;
  columns: string[];
  detected_mapping: Record<string, string>;
  preview: Record<string, any>[];
  validation: {
    valid_rows: number;
    invalid_rows: number;
    errors: any;
  };
}

interface ImportResult {
  imported: number;
  indicator_data_created?: number;
  errors: number;
  error_details: any[];
}

interface Organization {
  id: string;
  name: string;
}

export default function ImportCSV() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [mapping, setMapping] = useState({
    pillar: '',
    category: '',
    metric_name: '',
    value_numeric: '',
    unit: '',
    period_start: '',
    period_end: '',
    data_source: '',
    notes: '',
  });

  useEffect(() => {
    api.get('/organizations').then((res) => {
      const orgs = res.data?.items || res.data?.organizations || res.data?.results || [];
      setOrganizations(Array.isArray(orgs) ? orgs : []);
    }).catch((err) => {
      console.error('ImportCSV: failed to load organizations', err);
      toast.error('Impossible de charger la liste des organisations');
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(ext)) {
      toast.error(t('importCsv.invalidFileType'));
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error(t('importCsv.fileTooLarge'));
      return;
    }

    setFile(selectedFile);
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

      setMapping({
        pillar: response.data.detected_mapping.pillar || '',
        category: response.data.detected_mapping.category || '',
        metric_name: response.data.detected_mapping.metric_name || '',
        value_numeric: response.data.detected_mapping.value_numeric || '',
        unit: response.data.detected_mapping.unit || '',
        period_start: response.data.detected_mapping.period_start || '',
        period_end: response.data.detected_mapping.period_end || '',
        data_source: response.data.detected_mapping.data_source || '',
        notes: response.data.detected_mapping.notes || '',
      });

      setStep(2);
      toast.success(t('importCsv.fileAnalyzed'));
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || t('importCsv.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    if (!mapping.metric_name || !mapping.value_numeric) {
      toast.error(t('importCsv.mappingRequired'));
      return;
    }

    setImporting(true);

    try {
      const payload: any = { ...mapping };
      if (selectedOrgId) payload.organization_id = selectedOrgId;

      const response = await api.post(
        `/esg-import/uploads/${previewData.upload_id}/import`,
        payload
      );

      setImportResult(response.data);
      setStep(3);
      toast.success(t('importCsv.importSuccess', { count: response.data.imported }));
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.detail || t('importCsv.importError'));
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setSelectedOrgId('');
    setMapping({
      pillar: '',
      category: '',
      metric_name: '',
      value_numeric: '',
      unit: '',
      period_start: '',
      period_end: '',
      data_source: '',
      notes: '',
    });
  };

  const downloadTemplate = () => {
    const template = `pillar,category,metric_name,value_numeric,unit,period_start,period_end,data_source,notes
environmental,emissions,Emissions CO2 Scope 1,1234.5,tCO2e,2024-01-01,2024-12-31,Bilan Carbone 2024,Donnees validees
social,workforce,Effectif total,500,personnes,2024-01-01,2024-12-31,HRIS,
environmental,energy,Consommation electricite,2500,MWh,2024-01-01,2024-12-31,Factures EDF,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_esg.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Preview des donnees mappees
  const getMappedPreview = () => {
    if (!previewData || !previewData.preview[0]) return null;

    const firstRow = previewData.preview[0];
    return {
      metric_name: mapping.metric_name ? firstRow[mapping.metric_name] : t('importCsv.notMapped'),
      value_numeric: mapping.value_numeric ? firstRow[mapping.value_numeric] : t('importCsv.notMapped'),
      unit: mapping.unit ? firstRow[mapping.unit] : '-',
      pillar: mapping.pillar ? firstRow[mapping.pillar] : t('importCsv.defaultPillar'),
      category: mapping.category ? firstRow[mapping.category] : '-',
    };
  };

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label="Données" />
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Upload className="h-10 w-10" />
              {t('importCsv.title')}
            </h1>
            <p className="text-purple-100 text-lg">
              {t('importCsv.subtitle')}
            </p>
          </div>

          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            {t('importCsv.csvTemplate')}
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold
              ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {s}
            </div>
            {s < 3 && (
              <ArrowRight className={`h-5 w-5 ${step > s ? 'text-indigo-600' : 'text-gray-400'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {t('importCsv.step1Title')}
          </h2>

          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-3 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200
                ${dragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
              `}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                {t('importCsv.dropZoneText')}
              </p>
              <p className="text-sm text-gray-500">
                {t('importCsv.acceptedFormats')}
              </p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border-2 border-green-500 rounded-xl p-6 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="h-12 w-12 text-green-600" />
                  <div>
                    <p className="font-bold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-red-600" />
                </button>
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-6"
              >
                {uploading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {t('importCsv.analyzing')}
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    {t('importCsv.analyzeFile')}
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && previewData && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {t('importCsv.step2Title')}
            </h2>

            {/* Organisation selector — required for ESG score bridging */}
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Organisation concernée
                    <span className="ml-2 text-xs font-normal text-blue-600">
                      (recommandé pour le calcul des scores ESG)
                    </span>
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 bg-white"
                  >
                    <option value="">— Sélectionner une organisation —</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  {!selectedOrgId && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Sans organisation, les données ne seront pas liées aux scores ESG.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('importCsv.metricColumn')}
                </label>
                <select
                  value={mapping.metric_name}
                  onChange={(e) => setMapping({ ...mapping, metric_name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
                >
                  <option value="">{t('importCsv.selectColumn')}</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('importCsv.metricColumnHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('importCsv.valueColumn')}
                </label>
                <select
                  value={mapping.value_numeric}
                  onChange={(e) => setMapping({ ...mapping, value_numeric: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
                >
                  <option value="">{t('importCsv.selectColumn')}</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('importCsv.valueColumnHint')}
                </p>
              </div>

              {/* Optional fields... */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('importCsv.unitColumn')}
                </label>
                <select
                  value={mapping.unit}
                  onChange={(e) => setMapping({ ...mapping, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">{t('importCsv.noneOption')}</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('importCsv.pillarColumn')}
                </label>
                <select
                  value={mapping.pillar}
                  onChange={(e) => setMapping({ ...mapping, pillar: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">{t('importCsv.autoEnvironmental')}</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview du mapping */}
            {mapping.metric_name && mapping.value_numeric && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-indigo-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-bold text-indigo-900 mb-3">{t('importCsv.mappingPreviewTitle')}</p>
                    {(() => {
                      const preview = getMappedPreview();
                      return preview ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-white rounded">
                            <span className="text-gray-600">{t('importCsv.metricLabel')}:</span>
                            <span className="ml-2 font-semibold text-gray-900">{preview.metric_name}</span>
                          </div>
                          <div className="p-2 bg-white rounded">
                            <span className="text-gray-600">{t('importCsv.valueLabel')}:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {preview.value_numeric} {preview.unit}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded col-span-2">
                            <span className="text-gray-600">{t('importCsv.pillarLabel')}:</span>
                            <span className="ml-2 font-semibold text-gray-900">{preview.pillar}</span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <p className="text-xs text-indigo-700 mt-3">
                      {t('importCsv.mappingWarning')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Preview table... */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t('importCsv.dataPreviewTitle')}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.columns.map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-semibold text-gray-700 border-b">
                        {col}
                        {col === mapping.metric_name && <span className="ml-2 text-xs text-indigo-600">({t('importCsv.metricLabel')})</span>}
                        {col === mapping.value_numeric && <span className="ml-2 text-xs text-green-600">({t('importCsv.valueLabel')})</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      {previewData.columns.map((col) => (
                        <td key={col} className="px-4 py-2 text-gray-900">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="secondary" onClick={handleReset} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !mapping.metric_name || !mapping.value_numeric}
              className="flex-1"
            >
              {importing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {t('importCsv.importing')}
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  {t('importCsv.importRows', { count: previewData.validation.valid_rows })}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResult && (
        <Card className="animate-fade-in">
          <div className="text-center py-12">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('importCsv.importSuccessTitle')}
            </h2>

            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="p-6 bg-green-50 rounded-xl">
                <p className="text-4xl font-bold text-green-600">{importResult.imported}</p>
                <p className="text-sm text-gray-600 mt-2">{t('importCsv.importedData')}</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-xl">
                <p className="text-4xl font-bold text-blue-600">{importResult.indicator_data_created ?? 0}</p>
                <p className="text-sm text-gray-600 mt-2">Indicateurs ESG liés</p>
              </div>
              <div className="p-6 bg-red-50 rounded-xl">
                <p className="text-4xl font-bold text-red-600">{importResult.errors}</p>
                <p className="text-sm text-gray-600 mt-2">{t('importCsv.errors')}</p>
              </div>
            </div>
            {(importResult.indicator_data_created ?? 0) > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-lg mx-auto text-sm text-blue-800">
                ✅ {importResult.indicator_data_created} point(s) de données liés aux indicateurs ESG.
                Vous pouvez maintenant <strong>recalculer les scores</strong> depuis le tableau de bord Scores.
              </div>
            )}
            {(importResult.indicator_data_created ?? 0) === 0 && importResult.imported > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-lg mx-auto text-sm text-amber-800">
                ⚠️ Aucun indicateur ESG n'a été reconnu dans vos données. Vérifiez que les noms de métriques
                correspondent aux indicateurs configurés dans la plateforme.
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button variant="secondary" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('importCsv.importAnother')}
              </Button>
              <Button onClick={() => navigate('/app/my-data')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('importCsv.viewData')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
