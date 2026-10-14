import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../../i18n';
import { LanguageSwitch } from './LanguageSwitch';

const meta = {
  title: 'Molecules/LanguageSwitch',
  component: LanguageSwitch,
  args: {
    groupLabel: '',
    languages: LANGUAGES,
    current: 'es',
    onChange: () => undefined,
    tone: 'onLight',
  },
  argTypes: { tone: { control: 'inline-radio', options: ['onLight', 'onNavy'] } },
  render: function Render(args) {
    const { t } = useTranslation();
    const [current, setCurrent] = useState('es');
    return (
      <LanguageSwitch
        {...args}
        groupLabel={t('language.label')}
        current={current}
        onChange={setCurrent}
      />
    );
  },
} satisfies Meta<typeof LanguageSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnLight: Story = {};
export const OnNavy: Story = {
  args: { tone: 'onNavy' },
  decorators: [
    (Story) => (
      <div style={{ padding: 12, background: 'var(--color-navy)' }}>
        <Story />
      </div>
    ),
  ],
};
