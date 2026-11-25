import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { emptyNewStudent } from '../../data/staff-new.js';
import { NewStudentView } from './new-student.js';

const meta: Meta = { title: 'miniapp/Xodim/MS-04a Yangi oʻquvchi (Q-97)' };
export default meta;
type Story = StoryObj<typeof meta>;

const TODAY = '2026-11-23';
const G = [
  { id: 'g1', name: '1-guruh', course: { id: 'c', name: 'Matematika' } },
  { id: 'g2', name: '2-guruh', course: { id: 'c', name: 'Matematika' } },
];

function Flow(p: { groups: typeof G }) {
  const [form, setForm] = useState(() => ({
    ...emptyNewStudent(TODAY),
    fullName: 'Karimov Aziz',
    groupId: 'g1',
  }));
  return (
    <NewStudentView
      today={TODAY}
      groups={p.groups}
      form={form}
      saving={false}
      onForm={setForm}
      onSave={() => undefined}
      quote={{
        period: '2026-11',
        monthlyPrice: '600000',
        amount: '300000',
        lessonsLeft: 6,
        lessonsTotal: 12,
      }}
    />
  );
}

export const MS04a_New: Story = { tags: ['primary'], render: () => <Flow groups={G} /> };
export const MS04a_NoGroups: Story = { render: () => <Flow groups={[]} /> };
