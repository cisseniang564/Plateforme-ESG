import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/common/Button';

export default function Support() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Support
        </h1>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <p className="text-gray-700">
            Besoin d’aide ? Contactez notre support :
          </p>

          <div className="space-y-2">
            <p className="text-gray-900 font-medium">
              📧 Email : support@esgflow.com
            </p>
            <p className="text-gray-900 font-medium">
              📞 Téléphone : +33 1 23 45 67 89
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-gray-600 text-sm">
              Temps de réponse moyen : 24h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}