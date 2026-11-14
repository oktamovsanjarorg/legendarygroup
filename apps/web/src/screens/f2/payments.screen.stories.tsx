import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { CashView } from './cash.js';
import { DebtorsView } from './debtors.js';
import {
  CASH_DAY,
  DEBT_TOTAL,
  DEBTORS,
  PAY_FILLED,
  PAY_SAVED,
  PAY_SEARCH,
  QUEUE_WEB,
} from './mock.js';
import { type PayEntryState, PayEntryView } from './pay-entry.js';
import { WebQueueView } from './queue.js';

const noop = () => undefined;
const meta: Meta = { title: 'web/F2/W-13–16 Toʻlovlar' };
export default meta;
type Story = StoryObj<typeof meta>;

const entry = (s: PayEntryState) => (
  <WebFrame active="/payments">
    <PayEntryView
      s={s}
      onQuery={noop}
      onPick={noop}
      onAmount={noop}
      onMethod={noop}
      onSubmit={noop}
      onNext={noop}
    />
  </WebFrame>
);
/** FR-PAY-2: o'quvchi tanlangan, summa, FIFO taqsimot (server preview) — Enter. */
export const W13_Filled: Story = { tags: ['primary'], render: () => entry(PAY_FILLED) };
export const W13_Search: Story = { render: () => entry(PAY_SEARCH) };
export const W13_Saved: Story = { render: () => entry(PAY_SAVED) };
export const W14_Queue: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/payments">
      <WebQueueView
        items={QUEUE_WEB}
        selected="q2"
        amount={550_000n}
        onSelect={noop}
        onAmount={noop}
        onApprove={noop}
        onReject={noop}
      />
    </WebFrame>
  ),
};
export const W14_Empty: Story = {
  render: () => (
    <WebFrame active="/payments">
      <WebQueueView
        items={[]}
        selected={null}
        amount={null}
        onSelect={noop}
        onAmount={noop}
        onApprove={noop}
        onReject={noop}
      />
    </WebFrame>
  ),
};
export const W15_Debtors: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/payments">
      <DebtorsView rows={DEBTORS} bucket="all" total={DEBT_TOTAL} onBucket={noop} onOpen={noop} />
    </WebFrame>
  ),
};
/** FR-PAY-10: 50 000 soʻm kam — izoh majburiy. */
export const W16_CashDiff: Story = {
  tags: ['primary'],
  render: () => (
    <WebFrame active="/payments">
      <CashView
        day={CASH_DAY}
        counted={2_550_000n}
        diff={-50_000n}
        note=""
        onCounted={noop}
        onNote={noop}
        onClose={noop}
      />
    </WebFrame>
  ),
};
export const W16_Closed: Story = {
  render: () => (
    <WebFrame active="/payments">
      <CashView
        day={{
          ...CASH_DAY,
          closed: { at: new Date('2026-11-12T18:05:00+05:00'), by: 'Rahimova Gulnoza' },
        }}
        counted={2_600_000n}
        diff={0n}
        note=""
        onCounted={noop}
        onNote={noop}
        onClose={noop}
      />
    </WebFrame>
  ),
};
const states = webStates('/payments', t.payEntry.title);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
