import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Webhook as WebhookIcon, 
  Plus, 
  Trash2,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import CreateWebhookModal from '@/components/modals/CreateWebhookModal';
import api from '@/services/api';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  total_calls: number;
  success_calls: number;
  success_rate: number;
  last_called_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface WebhookEvent {
  type: string;
  description: string;
}

export default function WebhookManagement() {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [webhooksRes, eventsRes] = await Promise.all([
        api.get('/webhooks'),
        api.get('/webhooks/events'),
      ]);

      setWebhooks(webhooksRes.data.items || []);
      setEvents(eventsRes.data.events || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await api.delete(`/webhooks/${id}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete webhook');
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-100';
    if (rate >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        subtitle="Configure real-time event notifications to external services"
        showBack={true}
        backTo="/settings"
        actions={
          <>
            <Button 
              variant="secondary"
              onClick={() => window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}/docs#/Webhooks`, '_blank')}
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              API Docs
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create Webhook
            </Button>
          </>
        }
      />

      {/* Available Events */}
      <Card title="Available Events">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(event => (
            <div key={event.type} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-mono text-sm font-medium text-gray-900">{event.type}</p>
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhooks List */}
      <Card>
        {webhooks.length === 0 ? (
          <div className="text-center py-12">
            <WebhookIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium mb-2">No webhooks configured</p>
            <p className="text-sm text-gray-400 mb-6">Create your first webhook to receive real-time notifications</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create Webhook
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {webhooks.map(webhook => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <WebhookIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{webhook.name}</p>
                          <p className="text-xs text-gray-500">{webhook.total_calls} calls</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-xs truncate block">
                        {webhook.url}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.includes('*') ? (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                            All events
                          </span>
                        ) : (
                          <>
                            {webhook.events.slice(0, 2).map(event => (
                              <span key={event} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                {event.split('.')[1]}
                              </span>
                            ))}
                            {webhook.events.length > 2 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{webhook.events.length - 2}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {webhook.is_active ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Inactive</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {webhook.total_calls > 0 ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSuccessRateColor(webhook.success_rate)}`}>
                          {webhook.success_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No calls yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button className="text-primary-600 hover:text-primary-900 mr-3" title="View webhook logs">
                        <Eye className="h-4 w-4 inline" /> Logs
                      </button>
                      <button 
                        onClick={() => handleDelete(webhook.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete webhook"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateWebhookModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadData}
        availableEvents={events}
      />
    </div>
  );
}
