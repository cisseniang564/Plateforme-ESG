import Card from '@/components/common/Card';

interface BenchmarkData {
  label: string;
  yourScore: number;
  industryAverage: number;
  bestInClass: number;
}

interface BenchmarkComparisonProps {
  data: BenchmarkData[];
}

export default function BenchmarkComparison({ data }: BenchmarkComparisonProps) {
  return (
    <Card title="Benchmark Comparison">
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-primary-600">You: {item.yourScore}</span>
                <span className="text-gray-500">Avg: {item.industryAverage}</span>
                <span className="text-green-600">Best: {item.bestInClass}</span>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full">
              {/* Industry Average */}
              <div
                className="absolute h-2 bg-gray-300 rounded-full"
                style={{ width: `${(item.industryAverage / 100) * 100}%` }}
              />
              {/* Best in Class */}
              <div
                className="absolute h-2 bg-green-200 rounded-full"
                style={{ width: `${(item.bestInClass / 100) * 100}%` }}
              />
              {/* Your Score */}
              <div
                className="absolute h-2 bg-primary-600 rounded-full"
                style={{ width: `${(item.yourScore / 100) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
