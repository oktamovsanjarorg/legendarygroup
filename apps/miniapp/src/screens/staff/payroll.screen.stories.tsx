import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { emptyContract, type RunPhase } from '../../data/staff-payroll.js';
import { AdvanceNewView, AdvancesView } from './advances.js';
import { advances, contracts, payrollRun, payrollStaff } from './payroll-mock.js';
import { ContractNewView, ContractsView, ContractView } from './payroll-terms.js';
import { PayrollAdjustView, PayrollTeacherView, PayrollView } from './payroll.js';

const noop = () => undefined;
const TODAY = '2026-11-03';
const meta: Meta = { title: 'miniapp/Xodim/MS-28 Oyliklar' };
export default meta;
type Story = StoryObj<typeof meta>;

const view = (phase: RunPhase) => (
  <PayrollView
    run={phase === 'none' ? null : payrollRun}
    phase={phase}
    period="2026-10"
    current="2026-11"
    canApprove
    busy={false}
    onStep={noop}
    onAction={noop}
    onTeacher={noop}
    onContracts={noop}
    onAdvances={noop}
    onAdjust={noop}
  />
);
export const MS28_None: Story = { render: () => view('none') };
export const MS28_Stale: Story = { render: () => view('stale') };
export const MS28_Ready: Story = { render: () => view('ready') };

export const MS28_Teacher: Story = {
  render: () => (
    <PayrollTeacherView
      period="2026-10"
      summary={payrollRun.teachers[0]!}
      draft
      busy={false}
      onAdjust={noop}
      onRemove={noop}
    />
  ),
};

export const MS28_Adjust: Story = {
  render: () => (
    <PayrollAdjustView
      period="2026-10"
      staff={payrollStaff}
      teacherId={null}
      saving={false}
      onSave={noop}
    />
  ),
};

export const MS28_Contracts: Story = {
  render: () => <ContractsView items={contracts} today={TODAY} onOpen={noop} onAdd={noop} />,
};
export const MS28_Contract: Story = {
  render: () => (
    <ContractView
      contract={contracts[0]!}
      today={TODAY}
      busy={false}
      onEnd={noop}
      onRemove={noop}
    />
  ),
};

function NewContract() {
  const [form, setForm] = useState(() => emptyContract(TODAY));
  return (
    <ContractNewView
      form={form}
      staff={payrollStaff}
      groups={[{ id: 'g1', name: 'MATH-01' }]}
      saving={false}
      onForm={setForm}
      onSave={noop}
    />
  );
}
export const MS28_ContractNew: Story = { render: () => <NewContract /> };

export const MS28_Advances: Story = {
  render: () => <AdvancesView items={advances} onAdd={noop} onRemove={noop} />,
};

function NewAdvance() {
  const [form, setForm] = useState({
    teacherId: null as string | null,
    amount: null as bigint | null,
    date: TODAY,
    note: '',
  });
  return (
    <AdvanceNewView
      form={form}
      staff={payrollStaff}
      today={TODAY}
      saving={false}
      onForm={setForm}
      onSave={noop}
    />
  );
}
export const MS28_AdvanceNew: Story = { render: () => <NewAdvance /> };
