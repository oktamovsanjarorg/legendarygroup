import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DayStrip, type StripDay } from './calendar.js';

const meta = {
  title: 'ui-tg/DayStrip',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const MOCK_DAYS: readonly StripDay[] = [
  { date: '2026-11-09', day: 9, busy: true },
  { date: '2026-11-10', day: 10, busy: false },
  { date: '2026-11-11', day: 11, busy: true },
  { date: '2026-11-12', day: 12, busy: true },
  { date: '2026-11-13', day: 13, busy: false },
  { date: '2026-11-14', day: 14, busy: true },
  { date: '2026-11-15', day: 15, busy: false },
];

export const Default: Story = {
  render: () => (
    <div className="p-4">
      <DayStrip days={MOCK_DAYS} selected="2026-11-12" onSelect={() => undefined} />
    </div>
  ),
};

function InteractiveDemo() {
  const [selected, setSelected] = useState('2026-11-12');
  return (
    <div className="p-4">
      <DayStrip days={MOCK_DAYS} selected={selected} onSelect={setSelected} />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
