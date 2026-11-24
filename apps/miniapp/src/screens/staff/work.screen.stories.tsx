import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { emptyExpense } from '../../data/staff-finance.js';
import { stateStories } from '../story-kit.js';
import { CashView } from './cash.js';
import { ExpenseView } from './expense.js';
import { FinanceView } from './finance.js';
import { LinkRequestsView, LinkStudentView, RejectLinkView } from './link-requests.js';
import { StaffTicketsView, StaffTicketView } from './tickets.js';
import { cashDay, expense, linkReq, pnl, studentRow, ticket } from './work-mock.js';

const meta: Meta = { title: 'miniapp/Xodim/Ish ekranlari (T-135…T-156)' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;

export const MS11_List: Story = {
  tags: ['primary'],
  render: () => <LinkRequestsView items={[linkReq]} onLink={noop} onReject={noop} />,
};
export const MS11_Empty: Story = {
  render: () => <LinkRequestsView items={[]} onLink={noop} onReject={noop} />,
};
export const MS11_Link: Story = {
  render: () => (
    <LinkStudentView
      req={linkReq}
      query="Ali"
      found={[studentRow]}
      saving={false}
      onQuery={noop}
      onSave={noop}
    />
  ),
};
export const MS11_Reject: Story = {
  render: () => <RejectLinkView req={linkReq} saving={false} onSave={noop} />,
};

export const MS14_List: Story = {
  render: () => <StaffTicketsView items={[ticket]} filter="active" onFilter={noop} onOpen={noop} />,
};
export const MS14_Empty: Story = {
  render: () => <StaffTicketsView items={[]} filter="done" onFilter={noop} onOpen={noop} />,
};
export const MS14_Ticket: Story = {
  render: () => (
    <StaffTicketView
      ticket={ticket}
      text=""
      busy={false}
      onText={noop}
      onSend={noop}
      onStatus={noop}
      onCard={noop}
    />
  ),
};

function CashFlow() {
  const [form, setForm] = useState<{ counted: bigint | null; note: string }>({
    counted: 1_250_000n,
    note: '',
  });
  return (
    <CashView
      day={cashDay}
      today="2026-11-24"
      form={form}
      saving={false}
      history={[]}
      onDate={noop}
      onForm={setForm}
      onClose={noop}
    />
  );
}
export const MS16_Count: Story = { render: () => <CashFlow /> };
export const MS16_Closed: Story = {
  render: () => (
    <CashView
      day={{
        ...cashDay,
        closed: {
          at: '2026-11-24T14:00:00.000Z',
          by: 'Karimova Dilnoza',
          expectedCash: '1200000',
          countedCash: '1150000',
          note: 'Qaytim berildi',
        },
      }}
      today="2026-11-24"
      form={{ counted: null, note: '' }}
      saving={false}
      history={[]}
      onDate={noop}
      onForm={noop}
      onClose={noop}
    />
  ),
};

export const MS27_Finance: Story = {
  render: () => (
    <FinanceView
      pnl={pnl}
      period="2026-11"
      current="2026-11"
      expenses={[expense]}
      onPeriod={noop}
      onAdd={noop}
      onExpense={noop}
    />
  ),
};
export const MS18_Expense: Story = {
  render: () => (
    <ExpenseView
      title="Yangi xarajat"
      today="2026-11-24"
      form={emptyExpense('2026-11-24')}
      saving={false}
      file={{ kind: 'empty' }}
      onPickFile={noop}
      onForm={noop}
      onSave={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
