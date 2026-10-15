import type { DashboardComplexity } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis } from 'recharts';
import { ChartCard } from '../../molecules/ChartCard/ChartCard';

interface ComplexityChartProps {
  complexity: DashboardComplexity[];
}

const HEIGHT = 190;

/** RF-DAS-03: reparto de las generaciones completadas por complejidad estimada. */
export function ComplexityChart({ complexity }: ComplexityChartProps) {
  const { t } = useTranslation();
  const completed = complexity.reduce((sum, item) => sum + item.count, 0);
  const values = complexity.map((item) => `${item.size} ${item.count}`).join(', ');

  return (
    <ChartCard
      title={t('dashboard.complexity.title')}
      description={t('dashboard.complexity.description', { count: completed })}
      summary={t('dashboard.complexity.chart', { values })}
    >
      <ResponsiveContainer
        width="100%"
        height={HEIGHT}
        initialDimension={{ width: 320, height: HEIGHT }}
      >
        <BarChart
          accessibilityLayer={false}
          data={complexity}
          margin={{ top: 24, right: 8, bottom: 0, left: 8 }}
        >
          <XAxis
            dataKey="size"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-strong)' }}
            tick={{ fill: 'var(--color-text-muted)' }}
          />
          <Bar
            dataKey="count"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
            isAnimationActive={false}
          >
            <LabelList dataKey="count" position="top" fill="var(--color-text)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
