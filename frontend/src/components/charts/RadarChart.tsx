import { 
  Radar, 
  RadarChart as RechartsRadar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

interface RadarChartProps {
  data: any[];
  dataKey: string;
  height?: number;
}

export default function RadarChart({ data, dataKey, height = 300 }: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280' }} />
        <Radar 
          name="Score" 
          dataKey={dataKey} 
          stroke="#6366f1" 
          fill="#6366f1" 
          fillOpacity={0.6} 
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '0.75rem'
          }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
