import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  RefreshCw,
  GraduationCap,
  Scale,
  UserPlus,
  CalendarX,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Briefcase,
  ShieldAlert,
  PieChart as PieChartIcon,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface S1Indicator {
  label: string;
  unit: string;
  values: Record<string, number>;
}

export interface S1Stats {
  has_data: boolean;
  years: number[];
  indicators: Record<string, S1Indicator>;
}

interface Props {
  stats: S1Stats | null;
  loading: boolean;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue: '#1a56db',
  blueSoft: '#93c5fd',
  green: '#059669',
  greenSoft: '#6ee7b7',
  amber: '#d97706',
  amberSoft: '#fcd34d',
  red: '#dc2626',
  purple: '#7c3aed',
  purpleSoft: '#c4b5fd',
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
function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const factor = 10 ** digits;
  const rounded = Math.round(v * factor) / factor;
  return rounded.toLocaleString('fr-FR');
}

type GoodDirection = 'up' | 'down' | 'neutral';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  color,
  label,
  value,
  unit,
  delta,
  goodDirection,
  prevYear,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  label: string;
  value: number | null | undefined;
  unit: string;
  delta: number | null;
  goodDirection: GoodDirection;
  prevYear: number | null;
}) {
  const { t } = useTranslation();

  let DeltaIcon = Minus;
  let deltaColor = 'text-gray-400';
  if (delta !== null && delta !== 0) {
    DeltaIcon = delta > 0 ? TrendingUp : TrendingDown;
    if (goodDirection === 'neutral') {
      deltaColor = 'text-gray-500';
    } else {
      const isGood = (goodDirection === 'up' && delta > 0) || (goodDirection === 'down' && delta < 0);
      deltaColor = isGood ? 'text-emerald-600' : 'text-red-500';
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-gray-500 leading-tight">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 truncate">
        {fmtNum(value)}
        <span className="text-xs font-medium text-gray-400 ml-1">{unit}</span>
      </p>
      {value === null || value === undefined ? (
        <p className="text-xs text-gray-300 mt-1.5">{t('hri.stats.noData', 'Pas de donnée')}</p>
      ) : delta !== null && prevYear !== null ? (
        <p className={`flex items-center gap-1 text-xs font-medium mt-1.5 ${deltaColor}`}>
          <DeltaIcon className="h-3 w-3 shrink-0" />
          {delta > 0 ? '+' : ''}
          {fmtNum(delta)} {t('hri.stats.vsYear', 'vs {{year}}', { year: prevYear })}
        </p>
      ) : (
        <p className="text-xs text-gray-300 mt-1.5">&nbsp;</p>
      )}
    </div>
  );
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
export default function ESRSStatsDashboard({ stats, loading }: Props) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-sm text-gray-400">{t('hri.stats.loading', 'Chargement des statistiques…')}</p>
      </div>
    );
  }

  if (!stats || !stats.has_data || stats.years.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700">{t('hri.stats.empty', 'Aucune donnée ESRS S1 pour le moment')}</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          {t('hri.stats.emptyDesc', 'Importez un fichier RH ci-dessus pour voir apparaître vos statistiques et graphiques ESRS S1.')}
        </p>
      </div>
    );
  }

  const { years, indicators } = stats;
  const latestYear = years[years.length - 1];
  const prevYear = years.length > 1 ? years[years.length - 2] : null;

  const has = (code: string) => !!indicators[code];
  const get = (code: string, year: number): number | null => {
    const v = indicators[code]?.values[String(year)];
    return v === undefined ? null : v;
  };
  const label = (code: string, fallback: string) => indicators[code]?.label || fallback;
  const unit = (code: string, fallback = '') => indicators[code]?.unit ?? fallback;
  const delta = (code: string): number | null => {
    if (prevYear === null) return null;
    const a = get(code, latestYear);
    const b = get(code, prevYear);
    if (a === null || b === null) return null;
    return Math.round((a - b) * 10) / 10;
  };

  // Per-year series for trend charts
  const trendData = years.map(y => ({
    year: String(y),
    workforce: get('s1_workforce_total', y),
    turnover: get('s1_turnover_rate', y),
    newHires: get('s1_new_hires', y),
    training: get('s1_training_hours_per_employee', y),
    absenteeism: get('s1_absenteeism_rate', y),
    payGap: get('s1_pay_gap', y),
    permanent: get('s1_permanent_contracts', y),
    womenMgmt: get('s1_women_management', y),
    accidentFreq: get('s1_accident_frequency', y),
  }));

  // Gender split donut (latest year)
  const womenRatioLatest = get('s1_women_ratio', latestYear);
  const genderDonut = womenRatioLatest !== null
    ? [
        { name: t('hri.stats.women', 'Femmes'), value: womenRatioLatest },
        { name: t('hri.stats.men', 'Hommes'), value: Math.max(0, Math.round((100 - womenRatioLatest) * 10) / 10) },
      ]
    : null;

  // Women in management donut (latest year)
  const womenMgmtLatest = get('s1_women_management', latestYear);
  const mgmtDonut = womenMgmtLatest !== null
    ? [
        { name: t('hri.stats.womenMgmt', 'Femmes encadrement'), value: womenMgmtLatest },
        { name: t('hri.stats.restMgmt', "Reste de l'encadrement"), value: Math.max(0, Math.round((100 - womenMgmtLatest) * 10) / 10) },
      ]
    : null;

  // Workforce by gender, by year (computed from workforce_total × women_ratio)
  const genderByYear = (has('s1_workforce_total') && has('s1_women_ratio'))
    ? years.map(y => {
        const total = get('s1_workforce_total', y);
        const ratio = get('s1_women_ratio', y);
        if (total === null || ratio === null) return { year: String(y), women: null, men: null };
        const women = Math.round(total * ratio / 100);
        return { year: String(y), women, men: Math.max(0, total - women) };
      })
    : null;

  const KPI_DEFS: Array<{
    code: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    fallback: string;
    fallbackUnit: string;
    goodDirection: GoodDirection;
  }> = [
    { code: 's1_workforce_total', icon: Users, color: C.blue, fallback: 'Effectif total', fallbackUnit: 'pers.', goodDirection: 'neutral' },
    { code: 's1_turnover_rate', icon: RefreshCw, color: C.amber, fallback: 'Taux de turnover', fallbackUnit: '%', goodDirection: 'down' },
    { code: 's1_absenteeism_rate', icon: CalendarX, color: C.red, fallback: "Taux d'absentéisme", fallbackUnit: '%', goodDirection: 'down' },
    { code: 's1_training_hours_per_employee', icon: GraduationCap, color: C.purple, fallback: 'Formation / salarié', fallbackUnit: 'h', goodDirection: 'up' },
    { code: 's1_pay_gap', icon: Scale, color: C.pink, fallback: 'Écart salarial F/H', fallbackUnit: '%', goodDirection: 'down' },
    { code: 's1_new_hires', icon: UserPlus, color: C.green, fallback: 'Nouvelles embauches', fallbackUnit: 'pers.', goodDirection: 'neutral' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            {t('hri.stats.title', 'Statistiques ESRS S1')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('hri.stats.subtitle', "Vue d'ensemble de vos indicateurs sociaux")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          {years.length > 1 ? `${years[0]} – ${latestYear}` : `${latestYear}`}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_DEFS.map(def => (
          <KpiCard
            key={def.code}
            icon={def.icon}
            color={def.color}
            label={label(def.code, t(`hri.stats.kpi.${def.code}`, def.fallback))}
            value={get(def.code, latestYear)}
            unit={unit(def.code, def.fallbackUnit)}
            delta={delta(def.code)}
            goodDirection={def.goodDirection}
            prevYear={prevYear}
          />
        ))}
      </div>

      {/* Gender split row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          icon={PieChartIcon}
          color={C.blue}
          title={t('hri.stats.genderSplitTitle', 'Répartition Hommes / Femmes')}
          subtitle={t('hri.stats.forYear', 'Année {{year}}', { year: latestYear })}
        >
          {genderDonut ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={genderDonut}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: { name: string; value: number }) => `${name} : ${fmtNum(value)}%`}
                  outerRadius={85}
                  innerRadius={45}
                  dataKey="value"
                >
                  <Cell fill={C.pink} />
                  <Cell fill={C.blue} />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtNum(v)} %`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noGenderData', "Aucune donnée de répartition par genre")} />
          )}
        </ChartCard>

        <ChartCard
          icon={Briefcase}
          color={C.purple}
          title={t('hri.stats.mgmtSplitTitle', "Femmes en encadrement")}
          subtitle={t('hri.stats.forYear', 'Année {{year}}', { year: latestYear })}
        >
          {mgmtDonut ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={mgmtDonut}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: { name: string; value: number }) => `${name} : ${fmtNum(value)}%`}
                  outerRadius={85}
                  innerRadius={45}
                  dataKey="value"
                >
                  <Cell fill={C.purple} />
                  <Cell fill={C.purpleSoft} />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtNum(v)} %`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noMgmtData', "Aucune donnée sur l'encadrement")} />
          )}
        </ChartCard>

        <ChartCard
          icon={Users}
          color={C.blue}
          title={t('hri.stats.workforceByGenderTitle', 'Effectif par genre — évolution')}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {genderByYear ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={genderByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="women" name={t('hri.stats.women', 'Femmes')} stackId="a" fill={C.pink} radius={[0, 0, 0, 0]} />
                <Bar dataKey="men" name={t('hri.stats.men', 'Hommes')} stackId="a" fill={C.blue} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noWorkforceData', "Aucune donnée d'effectif")} />
          )}
        </ChartCard>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          icon={RefreshCw}
          color={C.amber}
          title={t('hri.stats.turnoverTitle', 'Turnover & nouvelles embauches')}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {(has('s1_turnover_rate') || has('s1_new_hires')) ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="turnover" name={t('hri.stats.kpi.s1_turnover_rate', 'Taux de turnover (%)')} fill={C.amberSoft} radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="newHires" name={t('hri.stats.kpi.s1_new_hires', 'Nouvelles embauches')} stroke={C.green} strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noTurnoverData', 'Aucune donnée de turnover')} />
          )}
        </ChartCard>

        <ChartCard
          icon={GraduationCap}
          color={C.purple}
          title={t('hri.stats.trainingTitle', 'Heures de formation par salarié')}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {has('s1_training_hours_per_employee') ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtNum(v)} h`} />
                <Bar dataKey="training" name={t('hri.stats.kpi.s1_training_hours_per_employee', 'Heures / salarié')} fill={C.purple} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noTrainingData', 'Aucune donnée de formation')} />
          )}
        </ChartCard>

        <ChartCard
          icon={CalendarX}
          color={C.red}
          title={t('hri.stats.absenteeismTitle', "Taux d'absentéisme")}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {has('s1_absenteeism_rate') ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtNum(v)} %`} />
                <Bar dataKey="absenteeism" name={t('hri.stats.kpi.s1_absenteeism_rate', "Taux d'absentéisme (%)")} fill={C.red} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noAbsenteeismData', "Aucune donnée d'absentéisme")} />
          )}
        </ChartCard>

        <ChartCard
          icon={Scale}
          color={C.pink}
          title={t('hri.stats.payGapTitle', 'Écart salarial Femmes / Hommes')}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {has('s1_pay_gap') ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtNum(v)} %`} />
                <Bar dataKey="payGap" name={t('hri.stats.kpi.s1_pay_gap', 'Écart salarial F/H (%)')} fill={C.pink} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noPayGapData', "Aucune donnée d'écart salarial")} />
          )}
        </ChartCard>

        <ChartCard
          icon={Briefcase}
          color={C.blue}
          title={t('hri.stats.contractsTitle', 'Contrats CDI & encadrement féminin')}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {(has('s1_permanent_contracts') || has('s1_women_management')) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${fmtNum(v)} %`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="permanent" name={t('hri.stats.kpi.s1_permanent_contracts', 'Contrats CDI (%)')} fill={C.blue} radius={[6, 6, 0, 0]} />
                <Bar dataKey="womenMgmt" name={t('hri.stats.kpi.s1_women_management', 'Femmes encadrement (%)')} fill={C.purpleSoft} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noContractsData', 'Aucune donnée de contrats')} />
          )}
        </ChartCard>

        <ChartCard
          icon={ShieldAlert}
          color={C.amber}
          title={t('hri.stats.accidentTitle', "Taux de fréquence des accidents")}
          subtitle={t('hri.stats.byYear', 'Par année')}
        >
          {has('s1_accident_frequency') ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="accidentFreq" name={t('hri.stats.kpi.s1_accident_frequency', 'Taux fréquence accidents')} fill={C.amber} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData label={t('hri.stats.noAccidentData', "Aucune donnée d'accidents du travail")} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
