import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MoneyField } from './money-field.js';

const meta: Meta = {
  title: 'ui-web/MoneyField',
  decorators: [
    (Story) => (
      <div className="max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <MoneyField label="Toʻlov summasi" value={null} onChange={() => undefined} />,
};

export const WithValue: Story = {
  render: () => <MoneyField label="Oylik toʻlov" value={650_000n} onChange={() => undefined} />,
};

export const WithHint: Story = {
  render: () => (
    <MoneyField
      label="Xarajat miqdori"
      value={null}
      hint="Kassadan chiqim qilinadigan summa"
      onChange={() => undefined}
    />
  ),
};

export const WithError: Story = {
  render: () => (
    <MoneyField
      label="Toʻlov summasi"
      value={null}
      error="Toʻlov summasini kiritish majburiy"
      onChange={() => undefined}
    />
  ),
};

function InteractiveDemo() {
  const [val, setVal] = useState<bigint | null>(550_000n);
  return (
    <MoneyField
      label="Oʻquv kursi toʻlovi"
      value={val}
      hint="Ixtiyoriy musbat summa"
      onChange={setVal}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
