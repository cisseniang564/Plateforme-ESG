interface HeatmapProps {
  data: Array<{
    indicator: string;
    month: string;
    value: number;
  }>;
  height?: number;
}

export default function Heatmap({ data, height = 300 }: HeatmapProps) {
  // Get unique months and indicators
  const months = [...new Set(data.map(d => d.month))];
  const indicators = [...new Set(data.map(d => d.indicator))];
  
  // Find min and max for color scaling
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  const getColor = (value: number) => {
    const normalized = (value - min) / (max - min);
    
    if (normalized < 0.33) return 'bg-red-200 text-red-800';
    if (normalized < 0.66) return 'bg-yellow-200 text-yellow-800';
    return 'bg-green-200 text-green-800';
  };
  
  const getValue = (indicator: string, month: string) => {
    const item = data.find(d => d.indicator === indicator && d.month === month);
    return item?.value || 0;
  };

  return (
    <div className="overflow-x-auto" style={{ height }}>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 p-2 text-left text-xs font-medium text-gray-500">
              Indicator
            </th>
            {months.map(month => (
              <th key={month} className="border border-gray-200 bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">
                {month}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {indicators.map(indicator => (
            <tr key={indicator}>
              <td className="border border-gray-200 p-2 text-sm font-medium text-gray-700">
                {indicator}
              </td>
              {months.map(month => {
                const value = getValue(indicator, month);
                return (
                  <td 
                    key={`${indicator}-${month}`} 
                    className={`border border-gray-200 p-2 text-center text-sm font-semibold ${getColor(value)}`}
                  >
                    {value.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
