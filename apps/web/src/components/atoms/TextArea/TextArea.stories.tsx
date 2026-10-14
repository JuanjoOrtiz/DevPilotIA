import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { TextArea } from './TextArea';

const meta = {
  title: 'Atoms/TextArea',
  component: TextArea,
  args: { invalid: false, disabled: false },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <TextArea
        aria-label={t('projectForm.fields.name')}
        placeholder={t('auth.fields.emailPlaceholder')}
        {...args}
      />
    );
  },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Portal de clientes' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Portal de clientes' } };
export const Error: Story = { args: { invalid: true, defaultValue: 'x' } };
