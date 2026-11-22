import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { SetupRow } from '../../data/staff-setup.js';
import { SetupView } from './setup.js';

const meta: Meta = { title: 'miniapp/Xodim/MS-05b Toʻlov holati (T-145)' };
export default meta;
type Story = StoryObj<typeof meta>;

const G = [
  { enrollmentId: 'e1', groupId: 'g1', name: '1-guruh', price: 600000n },
  { enrollmentId: 'e2', groupId: 'g2', name: 'Ingliz tili A2', price: 500000n },
];

function Flow() {
  const [rows, setRows] = useState<Record<string, SetupRow>>({
    e1: { startDate: '2026-09-15', unpaid: { '2026-10': 600000n } },
    e2: { startDate: '2026-11-22', unpaid: {} },
  });
  return (
    <SetupView
      student="Karimov Aziz"
      today="2026-11-22"
      groups={G}
      rows={rows}
      saving={false}
      onRow={(id, r) => setRows((p) => ({ ...p, [id]: r }))}
      onSave={() => undefined}
    />
  );
}

export const MS05b_Setup: Story = { tags: ['primary'], render: () => <Flow /> };
