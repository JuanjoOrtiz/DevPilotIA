import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import { LinkButton } from './LinkButton';

const meta = {
  title: 'Atoms/LinkButton',
  component: LinkButton,
  args: { to: '/projects/new', variant: 'primary', children: '' },
  argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary'] } },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <LinkButton {...args}>
        <Icon name="plus" />
        {t('projects.new')}
      </LinkButton>
    );
  },
} satisfies Meta<typeof LinkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
