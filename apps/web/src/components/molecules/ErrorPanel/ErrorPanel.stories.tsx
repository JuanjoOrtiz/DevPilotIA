import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { ErrorPanel } from './ErrorPanel';

const meta = {
  title: 'Molecules/ErrorPanel',
  component: ErrorPanel,
  args: { message: '', retryLabel: '', onRetry: fn() },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <ErrorPanel {...args} message={t('errors.NETWORK_ERROR')} retryLabel={t('common.retry')} />
    );
  },
} satisfies Meta<typeof ErrorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {};
