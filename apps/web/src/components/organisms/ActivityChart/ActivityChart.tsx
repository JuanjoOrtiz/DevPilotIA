import type { DashboardDay } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNumberFormat } from '../../../hooks/useNumberFormat';
import { ChartCard } from '../../molecules/ChartCard/ChartCard';

interface ActivityChartProps {
  activity: DashboardDay[];
}

const HEIGHT = 200;

/** RF-DAS-02: generaciones por día en los últimos 30 días. */
export function ActivityChart({ activity }: ActivityChartProps) {
  const { t } = useTranslation();
  const format = useNumberFormat();

  const total = activity.reduce((sum, day) => sum + day.count, 0);
  const busiest = activity.reduce<DashboardDay | undefined>(
    (best, day) => (day.count > (best?.count ?? 0) ? day : best),
    undefined,
  );
  const from = activity[0]?.date;
  const to = activity.at(-1)?.date;
  const range = from && to ? { from: format.longDay(from), to: format.longDay(to) } : null;
  const summary = !range
    ? ''
    : busiest
      ? t('dashboard.activity.chart', {
          ...range,
          max: busiest.count,
          day: format.longDay(busiest.date),
        })
      : t('dashboard.activity.chartEmpty', range);

  return (
    <ChartCard
      title={t('dashboard.activity.title')}
      description={t('dashboard.activity.description', { count: total })}
      summary={summary}
    >
      <ResponsiveContainer
        width="100%"
        height={HEIGHT}
        initialDimension={{ width: 600, height: HEIGHT }}
      >
        <BarChart
          accessibilityLayer={false}
          data={activity}
          margin={{ top: 4, right: 20, bottom: 0, left: -24 }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-border-soft)" />
          <XAxis
            dataKey="date"
            tickFormatter={format.shortDay}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-strong)' }}
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fill: 'var(--color-text-subtle)' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-text-subtle)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-muted)' }}
            labelFormatter={(day) => format.longDay(String(day))}
            formatter={(count) => [t('dashboard.activity.tooltip', { count: Number(count) }), null]}
            separator=""
          />
          <Bar
            dataKey="count"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
