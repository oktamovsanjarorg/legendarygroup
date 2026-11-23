import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { LeaveInput, StudentManage } from '../../data/staff-student.js';
import { must } from '../story-kit.js';
import { LeaveView } from './leave.js';
import { GUARDIANS, STUDENTS } from './mock.js';
import { StudentCardView } from './student-card.js';

const noop = () => undefined;
const meta: Meta = { title: 'miniapp/Xodim/MS-05 Boshqaruv (T-144)' };
export default meta;
type Story = StoryObj<typeof meta>;

const s = must(STUDENTS[0]);
const card = (m: StudentManage) => (
  <StudentCardView
    s={s}
    guardians={GUARDIANS}
    onPay={m.archived ? undefined : noop}
    manage={{ m, busy: false, onLeave: noop, onArchive: noop, onRestore: noop }}
  />
);

export const MS05_InGroup: Story = {
  tags: ['primary'],
  render: () =>
    card({
      groups: s.groups.map((name, i) => ({ enrollmentId: `e${i}`, name, startDate: '2026-09-01' })),
      canArchive: false,
      archived: false,
    }),
};
export const MS05_CanArchive: Story = {
  render: () => card({ groups: [], canArchive: true, archived: false }),
};
export const MS05_Archived: Story = {
  render: () => card({ groups: [], canArchive: true, archived: true }),
};

function Leave() {
  const [v, setV] = useState<LeaveInput>({ endDate: '2026-11-22', reason: 'left', note: null });
  return (
    <LeaveView
      student={s.name}
      group={s.groups[0] ?? ''}
      minDate="2026-09-01"
      value={v}
      saving={false}
      onChange={setV}
      onSave={noop}
      onRemove={noop}
    />
  );
}
export const MS05a_Leave: Story = { render: () => <Leave /> };
