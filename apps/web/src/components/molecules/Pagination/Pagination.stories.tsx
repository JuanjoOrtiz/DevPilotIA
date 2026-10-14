import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { Pagination } from './Pagination';

const meta = {
  title: 'Molecules/Pagination',
  component: Pagination,
  args: {
    label: '',
    summary: '',
    previousLabel: '',
    nextLabel: '',
    onPrevious: fn(),
    onNext: fn(),
  },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <Pagination
        {...args}
        label={t('history.pagination')}
        summary={t('history.range', { from: 11, to: 20, count: 25 })}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
      />
    );
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** En la primera página no hay «Anterior»: el botón queda deshabilitado. */
export const FirstPage: Story = { args: { onPrevious: undefined } };
export const LastPage: Story = { args: { onNext: undefined } };
