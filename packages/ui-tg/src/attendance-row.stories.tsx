import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AttendanceRow, type AttendanceMark } from './attendance-row.js';

const meta = {
  title: 'ui-tg/AttendanceRow',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Present: Story = {
  render: () => (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Ali Valiyev"
        mark={{ kind: 'present' }}
        onToggle={() => undefined}
        onMore={() => undefined}
      />
    </ul>
  ),
};

export const Absent: Story = {
  render: () => (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Zuhra Karimova"
        mark={{ kind: 'absent' }}
        onToggle={() => undefined}
        onMore={() => undefined}
      />
    </ul>
  ),
};

export const Late: Story = {
  render: () => (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Sardor Rahimov"
        mark={{ kind: 'late', minutes: 15 }}
        onToggle={() => undefined}
        onMore={() => undefined}
      />
    </ul>
  ),
};

export const Excused: Story = {
  render: () => (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Fotima Yusupova"
        mark={{ kind: 'excused' }}
        onToggle={() => undefined}
        onMore={() => undefined}
      />
    </ul>
  ),
};

export const PreExcused: Story = {
  render: () => (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Jasur Normatov"
        mark={{ kind: 'excused' }}
        preExcused
        onToggle={() => undefined}
        onMore={() => undefined}
      />
    </ul>
  ),
};

export const Disabled: Story = {
  render: () => (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Malika Ahmedova"
        mark={{ kind: 'present' }}
        disabled
        onToggle={() => undefined}
        onMore={() => undefined}
      />
    </ul>
  ),
};

function InteractiveDemo() {
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({
    '1': { kind: 'present' },
    '2': { kind: 'absent' },
    '3': { kind: 'late', minutes: 10 },
    '4': { kind: 'excused' },
  });

  const toggle = (id: string) => {
    setMarks((prev) => {
      const current = prev[id];
      const nextKind = current?.kind === 'present' ? 'absent' : 'present';
      return { ...prev, [id]: { kind: nextKind } };
    });
  };

  return (
    <ul className="overflow-hidden rounded-xl bg-bg">
      <AttendanceRow
        name="Ali Valiyev"
        mark={marks['1'] ?? { kind: 'present' }}
        onToggle={() => toggle('1')}
        onMore={() => undefined}
      />
      <AttendanceRow
        name="Zuhra Karimova"
        mark={marks['2'] ?? { kind: 'absent' }}
        onToggle={() => toggle('2')}
        onMore={() => undefined}
      />
      <AttendanceRow
        name="Sardor Rahimov"
        mark={marks['3'] ?? { kind: 'late', minutes: 10 }}
        onToggle={() => toggle('3')}
        onMore={() => undefined}
      />
      <AttendanceRow
        name="Fotima Yusupova"
        mark={marks['4'] ?? { kind: 'excused' }}
        preExcused
        onToggle={() => toggle('4')}
        onMore={() => undefined}
      />
    </ul>
  );
}

export const InteractiveList: Story = {
  render: () => <InteractiveDemo />,
};
