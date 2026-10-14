import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Molecules/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    busy: false,
    title: '',
    confirmLabel: '',
    cancelLabel: '',
    children: null,
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <ConfirmDialog
        {...args}
        title={t('generation.deleteDialog.title', { title: 'Buscador de pedidos' })}
        confirmLabel={
          args.busy ? t('generation.deleteDialog.deleting') : t('generation.deleteDialog.confirm')
        }
        cancelLabel={t('common.cancel')}
      >
        {t('generation.deleteDialog.body')}
      </ConfirmDialog>
    );
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { busy: true } };
export const Error: Story = {
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <ConfirmDialog
        {...args}
        title={t('generation.deleteDialog.title', { title: 'Buscador de pedidos' })}
        confirmLabel={t('generation.deleteDialog.confirm')}
        cancelLabel={t('common.cancel')}
        error={t('errors.NETWORK_ERROR')}
      >
        {t('generation.deleteDialog.body')}
      </ConfirmDialog>
    );
  },
};
