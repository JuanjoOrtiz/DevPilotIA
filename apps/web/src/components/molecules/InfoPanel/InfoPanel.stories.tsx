import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { InfoPanel } from './InfoPanel';

const meta = {
  title: 'Molecules/InfoPanel',
  component: InfoPanel,
  args: { title: '', children: null },
  render: function Render() {
    const { t } = useTranslation();
    return (
      <InfoPanel title={t('projectForm.help.title')}>
        <p>{t('projectForm.help.sent')}</p>
        <p>{t('projectForm.help.secrets')}</p>
      </InfoPanel>
    );
  },
} satisfies Meta<typeof InfoPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
