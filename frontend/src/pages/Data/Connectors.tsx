import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { Database, Cloud, Server } from 'lucide-react';

export default function Connectors() {
  const connectors = [
    { name: 'Database', icon: Database, status: 'connected', color: 'blue' },
    { name: 'Cloud Storage', icon: Cloud, status: 'disconnected', color: 'gray' },
    { name: 'API', icon: Server, status: 'connected', color: 'green' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Connectors</h1>
        <p className="mt-2 text-gray-600">Manage external data source connections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {connectors.map((connector) => (
          <Card key={connector.name}>
            <div className="text-center">
              <div className={`inline-flex p-4 bg-${connector.color}-100 rounded-full mb-4`}>
                <connector.icon className={`h-8 w-8 text-${connector.color}-600`} />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{connector.name}</h3>
              <span className={`badge ${
                connector.status === 'connected' ? 'badge-success' : 'bg-gray-100 text-gray-800'
              }`}>
                {connector.status}
              </span>
              <Button variant="secondary" className="w-full mt-4">
                Configure
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
