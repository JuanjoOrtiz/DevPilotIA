import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { ChartCard } from './ChartCard';

const meta = {
  title: 'Molecules/ChartCard',
  component: ChartCard,
  args: { title: '', summary: '', children: null },
  render: function Render() {
    const { t } = useTranslation();
    return (
      <ChartCard
        title={t('dashboard.complexity.title')}
        description={t('dashboard.complexity.description', { count: 20 })}
        summary={t('dashboard.complexity.chart', { values: 'S 6, M 7, L 5, XL 2' })}
      >
        <div style={{ height: 120, background: 'var(--color-surface-muted)' }} />
      </ChartCard>
    );
  },
} satisfies Meta<typeof ChartCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
