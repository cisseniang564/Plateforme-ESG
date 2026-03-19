import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Button from '../common/Button';
import api from '@/services/api';

interface GoogleSheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GoogleSheetsConfigModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: GoogleSheetsConfigModalProps) {
  const [step, setStep] = useState<'name' | 'authorize' | 'success' | 'error'>('name');
  const [integrationName, setIntegrationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Check for OAuth callback params
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const errorParam = params.get('error');
      const id = params.get('integration_id');

      if (success === 'true') {
        setStep('success');
        setIntegrationId(id);
        // Clean URL
        window.history.replaceState({}, '', '/settings/integrations');
      } else if (errorParam) {
        setStep('error');
        setError(errorParam);
        window.history.replaceState({}, '', '/settings/integrations');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAuthorization = async () => {
    if (!integrationName.trim()) {
      setError('Please enter an integration name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/integrations/google/authorize', {
        params: { integration_name: integrationName }
      });

      // Redirect to Google OAuth
      window.location.href = response.data.authorization_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start authorization');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('name');
    setIntegrationName('');
    setError(null);
    setIntegrationId(null);
    setLoading(false);
    onClose();
    if (step === 'success') {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-30"
          onClick={handleClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {step === 'name' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Connect Google Sheets</h3>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>What you'll be able to do:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Import ESG data from Google Sheets</li>
                    <li>Export reports directly to spreadsheets</li>
                    <li>Sync data automatically</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                    placeholder="e.g., ESG Data Sync"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Give this integration a descriptive name
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> You'll be redirected to Google to authorize access.
                    ESGFlow will be able to read and write to your spreadsheets.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={handleStartAuthorization} 
                  disabled={loading || !integrationName.trim()}
                  className="flex-1"
                >
                  {loading ? 'Redirecting...' : 'Authorize with Google'}
                </Button>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Google Sheets Connected!
              </h3>
              <p className="text-gray-600 mb-6">
                Your integration is ready. You can now import and export data.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 font-medium mb-2">Next steps:</p>
                <ul className="text-sm text-green-700 text-left space-y-1">
                  <li>• Prepare your spreadsheet with the required format</li>
                  <li>• Use "Import from Google Sheets" to sync data</li>
                  <li>• Export reports directly to spreadsheets</li>
                </ul>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Authorization Failed
              </h3>
              <p className="text-gray-600 mb-6">
                {error || 'Something went wrong during authorization'}
              </p>

              <div className="flex gap-3">
                <Button onClick={() => setStep('name')} className="flex-1">
                  Try Again
                </Button>
                <Button variant="secondary" onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
