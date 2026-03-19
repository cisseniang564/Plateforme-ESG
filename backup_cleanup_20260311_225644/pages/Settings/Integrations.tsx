import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Integrations() {
  const integrations = [
    { id: 1, name: 'Salesforce', description: 'CRM Integration', connected: true },
    { id: 2, name: 'SAP', description: 'ERP System', connected: false },
    { id: 3, name: 'Microsoft Dynamics', description: 'Business Software', connected: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="mt-2 text-gray-600">Connect with external systems</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {integration.connected ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <XCircle className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <h3 className="font-medium text-lg mb-1">{integration.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
              <Button 
                variant={integration.connected ? 'secondary' : 'primary'} 
                className="w-full"
              >
                {integration.connected ? 'Configure' : 'Connect'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
