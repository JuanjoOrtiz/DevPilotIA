import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta = { title: 'Atoms/Spinner', component: Spinner } satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Decorativo: el estado de carga lo anuncia el texto que lo acompaña. */
export const Loading: Story = {};
