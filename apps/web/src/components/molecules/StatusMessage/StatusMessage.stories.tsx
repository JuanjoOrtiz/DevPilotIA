import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { StatusMessage } from './StatusMessage';

const meta = {
  title: 'Molecules/StatusMessage',
  component: StatusMessage,
  args: { children: '' },
  render: function Render() {
    const { t } = useTranslation();
    return <StatusMessage>{t('generation.export.copied')}</StatusMessage>;
  },
} satisfies Meta<typeof StatusMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
