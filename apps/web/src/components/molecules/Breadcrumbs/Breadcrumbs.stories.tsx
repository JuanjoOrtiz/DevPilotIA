import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from './Breadcrumbs';

const meta = {
  title: 'Molecules/Breadcrumbs',
  component: Breadcrumbs,
  args: { label: '', items: [] },
  render: function Render() {
    const { t } = useTranslation();
    return (
      <Breadcrumbs
        label={t('common.breadcrumbs')}
        items={[
          { label: t('projects.title'), to: '/projects' },
          { label: 'Portal de clientes', to: '/projects/1' },
          { label: t('specification.editor.crumb') },
        ]}
      />
    );
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
