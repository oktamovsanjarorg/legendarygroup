import { errorMessages } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { GUARDIAN_TABS, OfflineFrame, stateStories, TabRoot } from '../story-kit.js';
import { CARD, CHILD_TABS, INVOICES, INVOICES_PARTIAL, PAYMENTS } from './mock.js';
import { PayView } from './pay.js';
import { PaymentsView } from './payments.js';
import { SubmissionView } from './submission.js';

const noop = () => undefined;
const at = new Date('2026-11-12T08:31:00+05:00');
const meta: Meta = { title: 'miniapp/Ota-ona/MG-05–07 Toʻlovlar' };
export default meta;
type Story = StoryObj<typeof meta>;

const payments = (debt: bigint, invoices = INVOICES) => (
  <TabRoot active="/payments" tabs={GUARDIAN_TABS}>
    <PaymentsView
      childName="Aliyeva Madina"
      debt={debt}
      invoices={invoices}
      payments={PAYMENTS}
      onPay={noop}
      onReceipt={noop}
    />
  </TabRoot>
);
export const MG05_Debt: Story = { tags: ['primary'], render: () => payments(650_000n) };
export const MG05_Partial: Story = { render: () => payments(350_000n, INVOICES_PARTIAL) };
export const MG05_Empty: Story = {
  render: () => (
    <PaymentsView
      childName="Aliyev Sardor"
      debt={0n}
      invoices={[]}
      payments={[]}
      onPay={noop}
      onReceipt={noop}
    />
  ),
};
export const MG05_Offline: Story = {
  render: () => <OfflineFrame>{payments(650_000n)}</OfflineFrame>,
};

const pay = (file: Parameters<typeof PayView>[0]['file'], sending = false) => (
  <PayView
    childTabs={CHILD_TABS}
    initialChild="c1"
    debt={650_000n}
    card={CARD}
    file={file}
    sending={sending}
    onPickFile={noop}
    onSubmit={noop}
  />
);
/** FR-PAY-3, ≤ 5 qadam: summa qarz bilan to'ldirilgan; chek tanlanmagan — Yuborish yopiq. */
export const MG06_Start: Story = { tags: ['primary'], render: () => pay({ kind: 'empty' }) };
export const MG06_Uploading: Story = {
  render: () => pay({ kind: 'uploading', name: 'click-chek.jpg', percent: 62 }),
};
export const MG06_Ready: Story = { render: () => pay({ kind: 'ready', name: 'click-chek.jpg' }) };
export const MG06_UploadError: Story = {
  render: () => pay({ kind: 'error', message: errorMessages.FILE_TOO_LARGE }),
};
export const MG06_Sending: Story = {
  render: () => pay({ kind: 'ready', name: 'click-chek.jpg' }, true),
};

const sub = (status: Parameters<typeof SubmissionView>[0]['s']['status']) => (
  <SubmissionView
    s={{ childName: 'Aliyeva Madina', amount: 650_000n, sentAt: at, status }}
    onResend={noop}
    onReceipt={noop}
  />
);
export const MG07_Pending: Story = {
  tags: ['primary'],
  render: () => sub({ kind: 'pending_review' }),
};
export const MG07_Confirmed: Story = {
  render: () => sub({ kind: 'confirmed', receiptNo: 'LG-2026-000512' }),
};
export const MG07_Rejected: Story = {
  render: () =>
    sub({
      kind: 'rejected',
      reason: 'Chekdagi summa va sana koʻrinmayapti. Toʻliq skrinshot yuboring.',
    }),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
