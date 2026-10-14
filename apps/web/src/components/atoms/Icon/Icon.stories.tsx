import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';

const NAMES = [
  'plus',
  'folder',
  'grid',
  'download',
  'search',
  'pencil',
  'trash',
  'check',
  'alert',
  'close',
  'question',
  'sparkle',
  'progress',
] as const;

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  args: { name: 'plus', size: 16 },
  argTypes: {
    name: { control: 'select', options: NAMES },
    size: { control: { type: 'range', min: 12, max: 48, step: 2 } },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 32 } };
/** Todos los iconos. Son decorativos: el texto que los acompaña es el que informa. */
export const All: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {NAMES.map((name) => (
        <Icon key={name} {...args} name={name} />
      ))}
    </div>
  ),
};
