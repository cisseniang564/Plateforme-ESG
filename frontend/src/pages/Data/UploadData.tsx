import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Database } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';

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
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (selectedFile: File) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      alert('Invalid file type. Please upload a CSV or Excel file.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
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
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.response?.data?.detail || 'Upload failed');
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
    } catch (error: any) {
      console.error('Import error:', error);
      alert(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('upload.title')}
        subtitle={t('upload.subtitle')}
        showBack={true}
      />

      {!result && (
        <Card>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            
            {!file ? (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">{t('upload.dropFile')}</p>
                <p className="text-sm text-gray-500 mb-4">{t('upload.supportedFormats')}</p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 cursor-pointer"
                >
                  {t('upload.selectFile')}
                </label>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FileText className="h-8 w-8 text-primary-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleUpload} disabled={uploading}>
                    {uploading ? t('upload.uploading') : t('common.upload')}
                  </Button>
                  <Button variant="secondary" onClick={() => setFile(null)} disabled={uploading}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">{t('upload.requiredFormat')}</h3>
            <p className="text-sm text-blue-800 mb-2">{t('upload.formatDescription')}</p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">{t('upload.indicatorCode')}</code></li>
              <li><code className="bg-blue-100 px-1 rounded">{t('upload.valueField')}</code></li>
              <li><code className="bg-blue-100 px-1 rounded">{t('upload.dateField')}</code></li>
              <li><code className="bg-blue-100 px-1 rounded">{t('upload.organizationField')}</code></li>
              <li><code className="bg-blue-100 px-1 rounded">{t('upload.notesField')}</code></li>
            </ul>
          </div>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-start gap-4">
              {result.status === 'completed' ? (
                <CheckCircle className="h-12 w-12 text-green-500 flex-shrink-0" />
              ) : result.status === 'failed' ? (
                <XCircle className="h-12 w-12 text-red-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-12 w-12 text-yellow-500 flex-shrink-0" />
              )}
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {result.status === 'completed' ? t('upload.uploadSuccess') : 
                   result.status === 'failed' ? t('upload.uploadFailed') : 'Processing...'}
                </h3>
                <p className="text-gray-600 mb-4">{result.filename}</p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('upload.totalRows')}</p>
                    <p className="text-2xl font-bold text-gray-900">{result.total_rows}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('upload.validRows')}</p>
                    <p className="text-2xl font-bold text-green-600">{result.valid_rows}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('upload.invalidRows')}</p>
                    <p className="text-2xl font-bold text-red-600">{result.invalid_rows}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {result.data_preview && result.data_preview.length > 0 && (
            <Card title={t('upload.dataPreview')}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(result.data_preview[0]).map((key) => (
                        <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.data_preview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((value: any, i) => (
                          <td key={i} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {value?.toString() || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {importResult && (
            <Card>
              <div className="flex items-start gap-4">
                <Database className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('upload.importComplete')}</h3>
                  <p className="text-gray-600 mb-4">
                    {t('upload.rowsImported', { imported: importResult.imported, skipped: importResult.skipped })}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm font-medium text-yellow-800 mb-2">{t('upload.errors')}:</p>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            {!importResult && result.valid_rows > 0 && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? t('upload.importing') : t('upload.importToIndicators', { count: result.valid_rows })}
              </Button>
            )}
            <Button onClick={() => { setFile(null); setResult(null); setImportResult(null); }}>
              {t('upload.uploadAnother')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/indicators')}>
              {t('upload.viewIndicators')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
