import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoiceGroup } from './ChoiceGroup';

const meta = {
  title: 'Molecules/ChoiceGroup',
  component: ChoiceGroup,
  args: { legend: '', options: [], value: '', onChange: () => undefined },
  render: function Render() {
    const { t } = useTranslation();
    const [value, setValue] = useState<'feature' | 'bug'>('feature');
    return (
      <ChoiceGroup
        legend={t('generation.form.type')}
        options={[
          { value: 'feature', label: t('history.type.feature') },
          { value: 'bug', label: t('history.type.bug') },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
} satisfies Meta<typeof ChoiceGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
