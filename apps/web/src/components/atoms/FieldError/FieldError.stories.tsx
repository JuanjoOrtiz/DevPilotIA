import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { FieldError } from './FieldError';

const meta = {
  title: 'Atoms/FieldError',
  component: FieldError,
  args: { id: 'email-error', children: '' },
  render: function Render(args) {
    const { t } = useTranslation();
    return <FieldError id={args.id}>{t('validation.EMAIL_INVALID')}</FieldError>;
  },
} satisfies Meta<typeof FieldError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
