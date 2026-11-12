import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';

const meta = {
  title: 'ui-web/Button',
  component: Button,
  args: { children: 'Toʻlovni kiritish' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'danger', 'link'],
    },
    size: { control: 'inline-radio', options: ['md', 'sm', 'full'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
/** Qaytarib boʻlmaydigan amal — nomi tugmada (11-ux §4.5). */
export const Danger: Story = { args: { variant: 'danger', children: 'Rad etish' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const LongText: Story = {
  args: { children: 'Barcha qurilmalardan chiqish va sessiyalarni bekor qilish', size: 'full' },
};
