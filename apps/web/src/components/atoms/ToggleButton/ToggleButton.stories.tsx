import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { ToggleButton } from './ToggleButton';

const meta = {
  title: 'Atoms/ToggleButton',
  component: ToggleButton,
  args: { pressed: false, tone: 'onLight', onClick: fn(), children: '' },
  argTypes: { tone: { control: 'inline-radio', options: ['onLight', 'onNavy'] } },
  render: function Render(args) {
    const { t } = useTranslation();
    return <ToggleButton {...args}>{t('history.type.feature')}</ToggleButton>;
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pressed: Story = { args: { pressed: true } };
export const OnNavy: Story = {
  args: { tone: 'onNavy', pressed: true },
  decorators: [
    (Story) => (
      <div style={{ padding: 12, background: 'var(--color-navy)' }}>
        <Story />
      </div>
    ),
  ],
};
