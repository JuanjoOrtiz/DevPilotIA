import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from './LoadingScreen';

const meta = {
  title: 'Molecules/LoadingScreen',
  component: LoadingScreen,
  args: { label: '' },
  render: function Render() {
    const { t } = useTranslation();
    return <LoadingScreen label={t('app.loading')} />;
  },
} satisfies Meta<typeof LoadingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
