import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { TextInput } from './TextInput';

const meta = {
  title: 'Atoms/TextInput',
  component: TextInput,
  args: { invalid: false, disabled: false },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <TextInput
        aria-label={t('projectForm.fields.name')}
        placeholder={t('auth.fields.emailPlaceholder')}
        {...args}
      />
    );
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Portal de clientes' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Portal de clientes' } };
export const Error: Story = { args: { invalid: true, defaultValue: 'x' } };
