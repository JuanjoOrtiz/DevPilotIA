import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { Icon } from '../Icon/Icon';
import { Spinner } from '../Spinner/Spinner';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { variant: 'primary', size: 'md', disabled: false, fullWidth: false, onClick: fn() },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'danger', 'dangerOutline'],
    },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
  },
  render: function Render(args) {
    const { t } = useTranslation();
    return <Button {...args}>{t('projects.new')}</Button>;
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const DangerOutline: Story = { args: { variant: 'dangerOutline' } };
export const Small: Story = { args: { size: 'sm', variant: 'secondary' } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = {
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <Button {...args}>
        <Icon name="plus" />
        {t('projects.new')}
      </Button>
    );
  },
};
export const Loading: Story = {
  args: { disabled: true },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <Button {...args}>
        <Spinner />
        {t('projectForm.creating')}
      </Button>
    );
  },
};
