import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Select } from './Select';

const meta = {
  title: 'Atoms/Select',
  component: Select,
  args: { disabled: false, invalid: false },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <Select aria-label={t('dashboard.filters.period')} defaultValue="30" {...args}>
        <option value="7">{t('dashboard.filters.days', { count: 7 })}</option>
        <option value="30">{t('dashboard.filters.days', { count: 30 })}</option>
        <option value="90">{t('dashboard.filters.days', { count: 90 })}</option>
      </Select>
    );
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { invalid: true } };
