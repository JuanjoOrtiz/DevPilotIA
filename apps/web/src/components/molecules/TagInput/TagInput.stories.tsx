import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TagInput } from './TagInput';

const meta = {
  title: 'Molecules/TagInput',
  component: TagInput,
  args: {
    id: 'stack',
    value: ['React', 'Node.js'],
    invalid: false,
    onChange: () => undefined,
    removeLabel: () => '',
  },
  render: function Render(args) {
    const { t } = useTranslation();
    const [tags, setTags] = useState<string[]>([...args.value]);
    return (
      <TagInput
        {...args}
        aria-describedby={undefined}
        value={tags}
        onChange={setTags}
        placeholder={t('projectForm.fields.techStackPlaceholder')}
        removeLabel={(tag) => t('projectForm.fields.removeTag', { tag })}
      />
    );
  },
} satisfies Meta<typeof TagInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: [] } };
export const Error: Story = { args: { invalid: true } };
