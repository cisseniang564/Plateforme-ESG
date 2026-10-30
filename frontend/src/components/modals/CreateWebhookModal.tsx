import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Alert, Button, Input, Modal } from '@/components/common';
import api from '@/services/api';

interface CreateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableEvents: Array<{ type: string; description: string }>;
}

export default function CreateWebhookModal({ isOpen, onClose, onSuccess, availableEvents }: CreateWebhookModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      toast.error(error.response?.data?.detail || 'Échec de la création du webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    const created = secret !== null;
    setName('');
    setUrl('');
    setSelectedEvents([]);
    setSecret(null);
    setCopied(false);
    onClose();
    if (created) onSuccess();
  };

  const toggleEvent = (type: string) =>
    setSelectedEvents((prev) => (prev.includes(type) ? prev.filter((e) => e !== type) : [...prev, type]));

  // Étape 2 : le secret n'est affiché qu'une seule fois
  if (secret) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Webhook créé"
        subtitle="Copiez la clé secrète maintenant : elle ne sera plus affichée."
        closeOnBackdrop={false}
        footer={<Button onClick={handleClose}>Terminé</Button>}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Clé secrète</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono break-all">{secret}</code>
              <Button iconOnly variant="secondary" onClick={handleCopySecret} aria-label="Copier la clé">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Alert tone="info" title="Vérifier la signature (HMAC-SHA256)">
            <pre className="mt-2 text-xs bg-white p-3 rounded-lg border border-blue-200 overflow-x-auto">{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}`}</pre>
          </Alert>
        </div>
      </Modal>
    );
  }

  // Étape 1 : le formulaire
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer un webhook"
      size="lg"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Annuler</Button>
          <Button type="submit" form="create-webhook-form" loading={loading}>Créer le webhook</Button>
        </>
      }
    >
      <form id="create-webhook-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nom" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alertes production" />
        <Input
          label="URL de destination"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/webhooks/esgflow"
          hint="Les événements seront envoyés en POST à cette adresse."
        />

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1.5">Événements</legend>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selectedEvents.length === 0} onChange={() => setSelectedEvents([])}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm">Tous les événements (*)</span>
            </label>
            {availableEvents.map((event) => (
              <label key={event.type} className="flex items-start gap-2">
                <input type="checkbox" checked={selectedEvents.includes(event.type)} onChange={() => toggleEvent(event.type)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{event.type}</span>
                  <span className="block text-xs text-gray-500">{event.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
