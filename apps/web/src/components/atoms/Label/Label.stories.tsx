import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTranslation } from 'react-i18next';
import { Label } from './Label';

const meta = {
  title: 'Atoms/Label',
  component: Label,
  args: { htmlFor: 'field' },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <>
        <Label {...args}>{t('auth.fields.email')}</Label>
        <input id="field" aria-hidden="true" style={{ display: 'none' }} />
      </>
    );
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
