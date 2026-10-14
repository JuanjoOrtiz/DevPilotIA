import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { TranslationNotice } from './TranslationNotice';

const meta = {
  title: 'Molecules/TranslationNotice',
  component: TranslationNotice,
  args: { state: 'translating', message: '' },
} satisfies Meta<typeof TranslationNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: function Render() {
    const { t } = useTranslation();
    return (
      <TranslationNotice state="translating" message={t('generation.translation.translating')} />
    );
  },
};
export const Error: Story = {
  render: function Render() {
    const { t } = useTranslation();
    return (
      <TranslationNotice
        state="failed"
        message={t('generation.translation.failed', { reason: t('errors.LLM_UNAVAILABLE') })}
        retryLabel={t('common.retry')}
        onRetry={fn()}
      />
    );
  },
};
