import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { TextInput } from '../../atoms/TextInput/TextInput';
import { FormField } from './FormField';

interface Args {
  withError: boolean;
  disabled: boolean;
}

const meta = {
  title: 'Molecules/FormField',
  args: { withError: false, disabled: false },
  render: function Render({ withError, disabled }) {
    const { t } = useTranslation();
    return (
      <FormField
        label={t('projectForm.fields.name')}
        note={t('common.required')}
        counter={t('common.counter', { current: 18, max: 80 })}
        hint={t('projectForm.fields.techStackHint')}
        error={withError ? t('validation.PROJECT_NAME_REQUIRED') : undefined}
      >
        {(field) => <TextInput {...field} disabled={disabled} defaultValue="Portal de clientes" />}
      </FormField>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { withError: true } };
