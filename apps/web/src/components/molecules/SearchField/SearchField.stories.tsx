import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchField } from './SearchField';

const meta = {
  title: 'Molecules/SearchField',
  component: SearchField,
  args: { label: '', value: '', onChange: () => undefined },
  render: function Render(args) {
    const { t } = useTranslation();
    const [value, setValue] = useState(args.value);
    return <SearchField label={t('projects.search')} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithText: Story = { args: { value: 'portal' } };
