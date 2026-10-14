import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../atoms/Icon/Icon';
import { SidebarLink } from './SidebarLink';

const meta = {
  title: 'Molecules/SidebarLink',
  component: SidebarLink,
  args: { to: '/projects', icon: null, children: null },
  decorators: [
    (Story) => (
      <nav style={{ padding: 16, background: 'var(--color-navy)', width: 240 }}>
        <Story />
      </nav>
    ),
  ],
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <SidebarLink to={args.to} icon={<Icon name="folder" />}>
        {t('nav.projects')}
      </SidebarLink>
    );
  },
} satisfies Meta<typeof SidebarLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { to: '/elsewhere' } };
/** La sección actual queda marcada, también con `aria-current`. */
export const Current: Story = { args: { to: '/' } };
