import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Alert } from './Alert';

const meta = {
  title: 'Atoms/Alert',
  component: Alert,
  args: { children: '' },
  render: function Render() {
    const { t } = useTranslation();
    return <Alert>{t('errors.INVALID_CREDENTIALS')}</Alert>;
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Siempre es un error: su estado por defecto es el de error. */
export const Default: Story = {};
export const LongMessage: Story = {
  render: function Render() {
    const { t } = useTranslation();
    return <Alert>{t('generation.form.quota', { limit: 20, time: '00:00' })}</Alert>;
  },
};
