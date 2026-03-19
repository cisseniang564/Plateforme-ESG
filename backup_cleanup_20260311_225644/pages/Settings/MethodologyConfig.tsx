import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

export default function MethodologyConfig() {
  const methodologies = [
    { id: 1, name: 'GRI Standards 2024', version: 'v1.0', active: true },
    { id: 2, name: 'SASB Framework', version: 'v2.1', active: false },
    { id: 3, name: 'TCFD Recommendations', version: 'v3.0', active: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Methodology Configuration</h1>
        <p className="mt-2 text-gray-600">Configure ESG scoring methodologies</p>
      </div>

      <Card>
        <div className="space-y-4">
          {methodologies.map((methodology) => (
            <div key={methodology.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium">{methodology.name}</h3>
                <p className="text-sm text-gray-600">Version {methodology.version}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`badge ${methodology.active ? 'badge-success' : 'bg-gray-100'}`}>
                  {methodology.active ? 'Active' : 'Inactive'}
                </span>
                <Button variant="secondary" size="sm">Configure</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
