import { useState, useCallback } from 'react';
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
  errors: number;
  error_details: any[];
}

export default function ImportCSV() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
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
      toast.error('Type de fichier invalide. CSV ou Excel uniquement.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux. Maximum 10MB.');
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
      toast.success('✅ Fichier analysé avec succès');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    
    if (!mapping.metric_name || !mapping.value_numeric) {
      toast.error('Mapping minimal requis: Métrique et Valeur');
      return;
    }
    
    setImporting(true);
    
    try {
      const response = await api.post(
        `/esg-import/uploads/${previewData.upload_id}/import`,
        mapping
      );
      
      setImportResult(response.data);
      setStep(3);
      toast.success(`✅ ${response.data.imported} données importées !`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
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
environmental,emissions,Émissions CO2 Scope 1,1234.5,tCO2e,2024-01-01,2024-12-31,Bilan Carbone 2024,Données validées
social,workforce,Effectif total,500,personnes,2024-01-01,2024-12-31,HRIS,
environmental,energy,Consommation électricité,2500,MWh,2024-01-01,2024-12-31,Factures EDF,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_esg.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Preview des données mappées
  const getMappedPreview = () => {
    if (!previewData || !previewData.preview[0]) return null;
    
    const firstRow = previewData.preview[0];
    return {
      metric_name: mapping.metric_name ? firstRow[mapping.metric_name] : '❌ Non mappé',
      value_numeric: mapping.value_numeric ? firstRow[mapping.value_numeric] : '❌ Non mappé',
      unit: mapping.unit ? firstRow[mapping.unit] : '-',
      pillar: mapping.pillar ? firstRow[mapping.pillar] : 'environmental (défaut)',
      category: mapping.category ? firstRow[mapping.category] : '-',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Upload className="h-10 w-10" />
              Import CSV/Excel
            </h1>
            <p className="text-purple-100 text-lg">
              Importez vos données ESG en masse
            </p>
          </div>

          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template CSV
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
            Étape 1: Sélectionner le fichier
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
                Déposez votre fichier ici, ou cliquez pour parcourir
              </p>
              <p className="text-sm text-gray-500">
                Formats acceptés: CSV, Excel (.xlsx, .xls) - Max 10MB
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
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Analyser le fichier
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
              Étape 2: Mapping des colonnes
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colonne Métrique * (NOM de l'indicateur)
                </label>
                <select
                  value={mapping.metric_name}
                  onChange={(e) => setMapping({ ...mapping, metric_name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
                >
                  <option value="">-- Sélectionner --</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Ex: "Émissions CO2 Scope 1", "Effectif total"
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colonne Valeur * (NOMBRE)
                </label>
                <select
                  value={mapping.value_numeric}
                  onChange={(e) => setMapping({ ...mapping, value_numeric: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
                >
                  <option value="">-- Sélectionner --</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Ex: 1234.5, 500, 2500
                </p>
              </div>

              {/* Optional fields... */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colonne Unité
                </label>
                <select
                  value={mapping.unit}
                  onChange={(e) => setMapping({ ...mapping, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Aucune --</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colonne Pilier
                </label>
                <select
                  value={mapping.pillar}
                  onChange={(e) => setMapping({ ...mapping, pillar: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Auto (environmental) --</option>
                  {previewData.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* NOUVEAU: Preview du mapping */}
            {mapping.metric_name && mapping.value_numeric && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-indigo-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-bold text-indigo-900 mb-3">Aperçu du mapping (1ère ligne):</p>
                    {(() => {
                      const preview = getMappedPreview();
                      return preview ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-white rounded">
                            <span className="text-gray-600">Métrique:</span>
                            <span className="ml-2 font-semibold text-gray-900">{preview.metric_name}</span>
                          </div>
                          <div className="p-2 bg-white rounded">
                            <span className="text-gray-600">Valeur:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {preview.value_numeric} {preview.unit}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded col-span-2">
                            <span className="text-gray-600">Pilier:</span>
                            <span className="ml-2 font-semibold text-gray-900">{preview.pillar}</span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <p className="text-xs text-indigo-700 mt-3">
                      ⚠️ Vérifiez que Métrique = texte et Valeur = nombre !
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Preview table... */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Aperçu des données (10 premières lignes)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.columns.map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-semibold text-gray-700 border-b">
                        {col}
                        {col === mapping.metric_name && <span className="ml-2 text-xs text-indigo-600">(Métrique)</span>}
                        {col === mapping.value_numeric && <span className="ml-2 text-xs text-green-600">(Valeur)</span>}
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
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !mapping.metric_name || !mapping.value_numeric}
              className="flex-1"
            >
              {importing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Importer {previewData.validation.valid_rows} données
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
              Import réussi !
            </h2>
            
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-8">
              <div className="p-6 bg-green-50 rounded-xl">
                <p className="text-4xl font-bold text-green-600">{importResult.imported}</p>
                <p className="text-sm text-gray-600 mt-2">Données importées</p>
              </div>
              <div className="p-6 bg-red-50 rounded-xl">
                <p className="text-4xl font-bold text-red-600">{importResult.errors}</p>
                <p className="text-sm text-gray-600 mt-2">Erreurs</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="secondary" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Importer un autre fichier
              </Button>
              <Button onClick={() => window.location.href = '/data-entry'}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Voir mes données
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
