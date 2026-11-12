import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MoneyInput } from './money-input.js';

const meta = {
  title: 'ui-tg/MoneyInput',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="p-4">
      <MoneyInput label="Toʻlov summasi" value={null} onChange={() => undefined} />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => (
    <div className="p-4">
      <MoneyInput label="Kurs narxi" value={650_000n} onChange={() => undefined} />
    </div>
  ),
};

export const WithHint: Story = {
  render: () => (
    <div className="p-4">
      <MoneyInput
        label="Toʻlov summasi"
        value={null}
        hint="Qarz: 550 000 soʻm. Boshqa summa ham yuborish mumkin."
        onChange={() => undefined}
      />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="p-4">
      <MoneyInput
        label="Toʻlov summasi"
        value={null}
        error="Summani toʻgʻri kiriting"
        onChange={() => undefined}
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [val, setVal] = useState<bigint | null>(550_000n);
  return (
    <div className="p-4">
      <MoneyInput
        label="Toʻlov summasi"
        value={val}
        hint="Ixtiyoriy musbat summa kiritishingiz mumkin"
        onChange={setVal}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
