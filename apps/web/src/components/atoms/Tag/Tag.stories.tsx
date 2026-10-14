import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';
import { Tag } from './Tag';

const meta = {
  title: 'Atoms/Tag',
  component: Tag,
  args: { variant: 'filled', children: 'React' },
  argTypes: { variant: { control: 'inline-radio', options: ['filled', 'outline'] } },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {};
export const Outline: Story = { args: { variant: 'outline', children: 'M' } };
export const Removable: Story = {
  args: { onRemove: fn() },
  render: function Render(args) {
    const { t } = useTranslation();
    return <Tag {...args} removeLabel={t('projectForm.fields.removeTag', { tag: 'React' })} />;
  },
};
