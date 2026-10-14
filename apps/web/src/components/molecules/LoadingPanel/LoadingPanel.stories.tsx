import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { LoadingPanel } from './LoadingPanel';

const meta = {
  title: 'Molecules/LoadingPanel',
  component: LoadingPanel,
  args: { label: '' },
  render: function Render() {
    const { t } = useTranslation();
    return <LoadingPanel label={t('app.loading')} />;
  },
} satisfies Meta<typeof LoadingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
