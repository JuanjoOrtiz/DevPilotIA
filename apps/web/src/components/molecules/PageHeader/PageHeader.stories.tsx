import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { PageHeader } from './PageHeader';

const meta = {
  title: 'Molecules/PageHeader',
  component: PageHeader,
  args: { title: '' },
  render: function Render() {
    const { t } = useTranslation();
    return (
      <PageHeader
        title={t('projects.title')}
        description={t('projects.intro')}
        actions={
          <LinkButton to="/projects/new">
            <Icon name="plus" />
            {t('projects.new')}
          </LinkButton>
        }
      />
    );
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithBreadcrumbs: Story = {
  render: function Render() {
    const { t } = useTranslation();
    return (
      <PageHeader
        title="Portal de clientes"
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[
              { label: t('projects.title'), to: '/projects' },
              { label: 'Portal de clientes' },
            ]}
          />
        }
      />
    );
  },
};
