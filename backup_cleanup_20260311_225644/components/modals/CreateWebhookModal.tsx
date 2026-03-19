import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import Button from '../common/Button';
import api from '@/services/api';

interface CreateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableEvents: Array<{ type: string; description: string }>;
}

export default function CreateWebhookModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  availableEvents 
}: CreateWebhookModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/webhooks', {
        name,
        url,
        events: selectedEvents.length > 0 ? selectedEvents : ['*'],
      });

      setSecret(response.data.secret);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create webhook');
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setSelectedEvents([]);
    setSecret(null);
    setCopied(false);
    setLoading(false);
    onClose();
    if (secret) {
      onSuccess();
    }
  };

  const toggleEvent = (eventType: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventType) 
        ? prev.filter(e => e !== eventType)
        : [...prev, eventType]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-30"
          onClick={handleClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {!secret ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Create Webhook</h3>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Production Alerts"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/webhooks/esgflow"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    POST requests will be sent to this URL
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Events to Subscribe
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedEvents.length === 0}
                        onChange={() => setSelectedEvents([])}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">All events (*)</span>
                    </label>
                    {availableEvents.map(event => (
                      <label key={event.type} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.type)}
                          onChange={() => toggleEvent(event.type)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{event.type}</p>
                          <p className="text-xs text-gray-500">{event.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating...' : 'Create Webhook'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Webhook Created!</h3>
                <p className="text-gray-600 mb-6">Save your secret key - it won't be shown again</p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Key
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded text-sm font-mono break-all">
                      {secret}
                    </code>
                    <Button size="sm" variant="secondary" onClick={handleCopySecret}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use this to verify webhook signatures with HMAC-SHA256
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-blue-800 font-medium mb-2">Signature Verification Example:</p>
                  <pre className="text-xs bg-white p-3 rounded border border-blue-200 overflow-x-auto">
{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}`}
                  </pre>
                </div>

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
