import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  PieChart as PieChartIcon,
  CheckCircle,
  Tag,
  Hash,
  TrendingUp,
  Layers,
  BarChart3,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MyDataStats {
  total: number;
  by_pillar: Record<string, number>;
  by_collection_method: Record<string, number>;
  by_verification_status: Record<string, number>;
  by_category: Record<string, number>;
  by_metric: Record<string, number>;
  by_period: Record<string, number>;
  date_range: { min: string | null; max: string | null };
}

interface Props {
  stats: MyDataStats | null;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue: '#1a56db',
  green: '#16a34a',
  greenSoft: '#86efac',
  purple: '#7c3aed',
  amber: '#d97706',
  amberSoft: '#fcd34d',
  red: '#dc2626',
  cyan: '#0891b2',
  teal: '#0d9488',
  pink: '#ec4899',
  gray: '#9ca3af',
};

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '8px 12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
  fontSize: 12,
};

const axisTick = { fill: '#9ca3af', fontSize: 11 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncate(label: string, max = 22): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function topNWithOthers(record: Record<string, number>, n: number, otherLabel: string, unknownLabel: string) {
  const entries = Object.entries(record)
    .map(([key, value]) => [key === 'unknown' ? unknownLabel : key, value] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, n);
  const rest = entries.slice(n);
  const restSum = rest.reduce((acc, [, v]) => acc + v, 0);
  const result = top.map(([name, value]) => ({ name, fullName: name, value }));
  if (restSum > 0) {
    result.push({ name: otherLabel, fullName: otherLabel, value: restSum });
  }
  return result;
}

// ─── Chart card wrapper ─────────────────────────────────────────────────────
function ChartCard({
  icon: Icon,
  color,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1 ml-9">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NoChartData({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] text-xs text-gray-300 text-center px-6">
      {label}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MyDataStatsDashboard({ stats }: Props) {
  const { t } = useTranslation();

  if (!stats || stats.total === 0) {
    return null;
  }

  const PILLAR_META: Record<string, { label: string; color: string }> = {
    environmental: { label: t('mydata.pillarEnv', 'Environnemental'), color: '#22c55e' },
    social: { label: t('mydata.pillarSocial', 'Social'), color: '#3b82f6' },
    governance: { label: t('mydata.pillarGov', 'Gouvernance'), color: '#8b5cf6' },
  };
  const pillarData = Object.entries(stats.by_pillar)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: PILLAR_META[key]?.label ?? key,
      value,
      color: PILLAR_META[key]?.color ?? C.gray,
    }));

  const STATUS_META: Record<string, { label: string; color: string }> = {
    verified: { label: t('mydata.stVerifiedPlural', 'Vérifiés'), color: C.green },
    pending: { label: t('mydata.stPending', 'En attente'), color: C.amber },
    rejected: { label: t('mydata.stRejectedPlural', 'Rejetés'), color: C.red },
    flagged: { label: t('mydata.stFlagged', 'Marqué'), color: '#ea580c' },
  };
  const statusData = Object.entries(stats.by_verification_status)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_META[key]?.label ?? key,
      value,
      color: STATUS_META[key]?.color ?? C.gray,
    }));

  const METHOD_META: Record<string, { label: string; color: string }> = {
    manual: { label: t('mydata.srcManual', 'Saisie manuelle'), color: C.blue },
    manual_scope3: { label: t('mydata.srcScope3', 'Saisie Scope 3'), color: C.teal },
    csv_import: { label: 'Import CSV', color: C.purple },
    fec_import: { label: 'Import FEC', color: C.amber },
    automatic: { label: t('mydata.srcAuto', 'Automatique (IA)'), color: C.cyan },
    unknown: { label: t('mydata.unknown', 'Non renseigné'), color: C.gray },
  };
  const methodData = Object.entries(stats.by_collection_method)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: METHOD_META[key]?.label ?? key,
      value,
      color: METHOD_META[key]?.color ?? C.gray,
    }));

  const categoryData = topNWithOthers(stats.by_category, 7, t('mydata.others', 'Autres'), t('mydata.unknown', 'Non renseigné'));
  const metricData = topNWithOthers(stats.by_metric, 7, t('mydata.others', 'Autres'), t('mydata.unknown', 'Non renseigné'));

  const periodData = Object.entries(stats.by_period)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, value]) => ({ year, value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            {t('mydata.statsTitle', 'Statistiques')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('mydata.statsSubtitle', 'Répartition de vos {{n}} données par pilier, catégorie et métrique', { n: stats.total })}
          </p>
        </div>
        {stats.date_range.min && stats.date_range.max && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {stats.date_range.min.slice(0, 4)} – {stats.date_range.max.slice(0, 4)}
          </div>
        )}
      </div>

      {/* Donuts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard icon={PieChartIcon} color="#22c55e" title={t('mydata.distByPillar', 'Distribution par pilier')}>
          {pillarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pillarData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value, percent }: { value: number; percent: number }) => `${value} (${Math.round(percent * 100)}%)`}
                  outerRadius={85}
                  innerRadius={45}
                  dataKey="value"
                >
                  {pillarData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('mydata.noData', 'Aucune donnée trouvée')} />
          )}
        </ChartCard>

        <ChartCard icon={CheckCircle} color={C.green} title={t('mydata.verifStatus', 'Statut de vérification')}>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value, percent }: { value: number; percent: number }) => `${value} (${Math.round(percent * 100)}%)`}
                  outerRadius={85}
                  innerRadius={45}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('mydata.noData', 'Aucune donnée trouvée')} />
          )}
        </ChartCard>

        <ChartCard icon={Layers} color={C.purple} title={t('mydata.distByMethod', 'Méthode de collecte')}>
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }: { percent: number }) => `${Math.round(percent * 100)}%`}
                  outerRadius={85}
                  innerRadius={45}
                  dataKey="value"
                >
                  {methodData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('mydata.noData', 'Aucune donnée trouvée')} />
          )}
        </ChartCard>
      </div>

      {/* Category / Metric / Period charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          icon={Tag}
          color={C.blue}
          title={t('mydata.distByCategory', 'Top catégories')}
          subtitle={t('mydata.byNumberOfEntries', "Nombre d'entrées")}
        >
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(240, categoryData.length * 34)}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                  tickFormatter={(v: string) => truncate(v, 18)}
                />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName ?? ''} />
                <Bar dataKey="value" name={t('mydata.thMetric', 'Métrique')} fill={C.blue} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('mydata.noData', 'Aucune donnée trouvée')} />
          )}
        </ChartCard>

        <ChartCard
          icon={Hash}
          color={C.pink}
          title={t('mydata.distByMetric', 'Top métriques')}
          subtitle={t('mydata.byNumberOfEntries', "Nombre d'entrées")}
        >
          {metricData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(240, metricData.length * 34)}>
              <BarChart data={metricData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                  tickFormatter={(v: string) => truncate(v, 18)}
                />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName ?? ''} />
                <Bar dataKey="value" name={t('mydata.thMetric', 'Métrique')} fill={C.pink} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('mydata.noData', 'Aucune donnée trouvée')} />
          )}
        </ChartCard>
      </div>

      {/* Temporal evolution */}
      <ChartCard
        icon={TrendingUp}
        color={C.amber}
        title={t('mydata.evolutionTitle', "Évolution du nombre de données par année")}
      >
        {periodData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name={t('mydata.entriesLabel', 'Données')} fill={C.amberSoft} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoChartData label={t('mydata.noData', 'Aucune donnée trouvée')} />
        )}
      </ChartCard>
    </div>
  );
}
