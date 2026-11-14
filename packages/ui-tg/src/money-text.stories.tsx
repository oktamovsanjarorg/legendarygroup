import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoneyText } from './money-text.js';

const meta = {
  title: 'ui-tg/MoneyText',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  render: () => (
    <div className="p-4 text-xl font-bold">
      <MoneyText amount={1_250_000n} />
    </div>
  ),
};

export const Negative: Story = {
  render: () => (
    <div className="p-4 text-xl font-bold">
      <MoneyText amount={-350_000n} />
    </div>
  ),
};

export const Zero: Story = {
  render: () => (
    <div className="p-4 text-xl font-bold">
      <MoneyText amount={0n} />
    </div>
  ),
};

export const LargeAmount: Story = {
  render: () => (
    <div className="p-4 text-2xl font-bold">
      <MoneyText amount={78_650_000n} />
    </div>
  ),
};
