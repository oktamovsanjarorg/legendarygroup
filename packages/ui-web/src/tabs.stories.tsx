import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tabs } from './tabs.js';

const meta = {
  title: 'ui-web/Tabs',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  render: () => (
    <div className="p-4">
      <Tabs
        label="Hisobot turi"
        value="pnl"
        items={[
          { value: 'pnl', label: 'Foyda va zararlar' },
          { value: 'cashflow', label: 'Pul oqimi' },
          { value: 'balance', label: 'Balans' },
        ]}
        onChange={() => undefined}
      />
    </div>
  ),
};

export const WithCounts: Story = {
  render: () => (
    <div className="p-4">
      <Tabs
        label="Toʻlov holati"
        value="all"
        items={[
          { value: 'all', label: 'Barchasi', count: 186 },
          { value: 'paid', label: 'Toʻlangan', count: 162 },
          { value: 'debt', label: 'Qarzdorlar', count: 19 },
          { value: 'pending', label: 'Kutilmoqda', count: 5 },
        ]}
        onChange={() => undefined}
      />
    </div>
  ),
};

function InteractiveDemo() {
  const [active, setActive] = useState<'active' | 'graduated' | 'archived'>('active');
  return (
    <div className="p-4">
      <Tabs
        label="Oʻquvchilar holati"
        value={active}
        items={[
          { value: 'active', label: 'Faol oʻquvchilar', count: 186 },
          { value: 'graduated', label: 'Bitirganlar', count: 42 },
          { value: 'archived', label: 'Arxiv', count: 11 },
        ]}
        onChange={setActive}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
