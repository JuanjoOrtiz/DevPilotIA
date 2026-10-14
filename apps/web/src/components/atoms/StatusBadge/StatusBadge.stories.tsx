import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from './StatusBadge';

const meta = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  args: { tone: 'success', children: '' },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'caution'],
    },
  },
  render: function Render(args) {
    const { t } = useTranslation();
    return <StatusBadge {...args}>{t('history.status.completed')}</StatusBadge>;
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {};
export const Generating: Story = {
  args: { tone: 'info' },
  render: function Render(args) {
    const { t } = useTranslation();
    return <StatusBadge {...args}>{t('history.status.generating')}</StatusBadge>;
  },
};
export const Failed: Story = {
  args: { tone: 'danger' },
  render: function Render(args) {
    const { t } = useTranslation();
    return <StatusBadge {...args}>{t('history.status.failed')}</StatusBadge>;
  },
};
