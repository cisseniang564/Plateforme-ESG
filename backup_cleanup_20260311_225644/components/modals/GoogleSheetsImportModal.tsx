import { useState } from 'react';
import { X, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import api from '@/services/api';

interface GoogleSheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string;
  integrationName: string;
}

export default function GoogleSheetsImportModal({ 
  isOpen, 
  onClose,
  integrationId,
  integrationName 
}: GoogleSheetsImportModalProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const id = extractSpreadsheetId(spreadsheetId);
      
      const response = await api.post('/integrations/google-sheets/import', {
        integration_id: integrationId,
        spreadsheet_id: id,
        sheet_name: sheetName,
      });

      setResult(response.data);
    } catch (err: any) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [err.response?.data?.detail || 'Import failed'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSpreadsheetId('');
    setSheetName('Sheet1');
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-30"
          onClick={handleClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {!result ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Import from Google Sheets</h3>
                  <p className="text-sm text-gray-600 mt-1">{integrationName}</p>
                </div>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spreadsheet URL or ID
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1ABC..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the full URL or just the spreadsheet ID
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sheet Name
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">Required Format:</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-blue-200">
                          <th className="text-left py-1 px-2 text-blue-900">indicator_code</th>
                          <th className="text-left py-1 px-2 text-blue-900">value</th>
                          <th className="text-left py-1 px-2 text-blue-900">date</th>
                          <th className="text-left py-1 px-2 text-blue-900">organization</th>
                          <th className="text-left py-1 px-2 text-blue-900">notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-blue-700">
                          <td className="py-1 px-2">ENV-001</td>
                          <td className="py-1 px-2">100</td>
                          <td className="py-1 px-2">2024-01-01</td>
                          <td className="py-1 px-2">Org A</td>
                          <td className="py-1 px-2">Optional</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={handleImport} 
                  disabled={loading || !spreadsheetId}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Importing...' : 'Import Data'}
                </Button>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-6">
                {result.imported > 0 ? (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Import {result.imported > 0 ? 'Complete' : 'Failed'}
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-600">{result.imported || 0}</p>
                    <p className="text-xs text-green-700">Imported</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-yellow-600">{result.skipped || 0}</p>
                    <p className="text-xs text-yellow-700">Skipped</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-600">{result.total_rows || 0}</p>
                    <p className="text-xs text-gray-700">Total Rows</p>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm text-red-800 font-medium mb-2">Errors:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {result.errors.map((error: string, i: number) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-h-40 overflow-y-auto">
                    <p className="text-sm text-yellow-800 font-medium mb-2">Warnings:</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {result.warnings.map((warning: string, i: number) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
