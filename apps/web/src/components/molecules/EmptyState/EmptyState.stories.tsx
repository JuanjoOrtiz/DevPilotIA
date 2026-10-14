import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  args: { title: '' },
  render: function Render() {
    const { t } = useTranslation();
    return (
      <EmptyState
        icon={<Icon name="folder" size={22} />}
        title={t('projects.empty.title')}
        description={t('projects.empty.description')}
        action={<LinkButton to="/projects/new">{t('projects.empty.action')}</LinkButton>}
      />
    );
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
