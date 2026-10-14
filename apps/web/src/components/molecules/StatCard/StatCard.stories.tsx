import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { StatCard } from './StatCard';

const meta = {
  title: 'Molecules/StatCard',
  component: StatCard,
  args: { label: '', value: '' },
  decorators: [
    (Story) => (
      <dl style={{ margin: 0, maxWidth: 260 }}>
        <Story />
      </dl>
    ),
  ],
  render: function Render() {
    const { t } = useTranslation();
    return (
      <StatCard
        label={t('dashboard.stats.completed')}
        value="88 %"
        detail={t('dashboard.stats.completedDetail', { completed: 22, total: 25, count: 3 })}
      />
    );
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutValue: Story = {
  render: function Render() {
    const { t } = useTranslation();
    return (
      <StatCard label={t('dashboard.stats.averageTime')} value={t('dashboard.stats.noValue')} />
    );
  },
};
