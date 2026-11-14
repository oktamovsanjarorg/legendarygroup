import { webMessages as t } from '@lg/i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WebFrame, webStates } from '../story-kit.js';
import { WebApprovalsView } from './approvals.js';
import { DiscountsView } from './discounts.js';
import { DISCOUNTS, PAYMENT, PAYMENT_REVERSED, WEB_APPROVALS } from './mock.js';
import { PaymentDetailView } from './payment-detail.js';
import { VerifyView } from './verify.js';

const noop = () => undefined;
const meta: Meta = { title: 'web/F2/W-17–34 Tafsilot va tekshirish' };
export default meta;
type Story = StoryObj<typeof meta>;
const frame = (node: React.ReactNode) => <WebFrame active="/payments">{node}</WebFrame>;

export const W17_Detail: Story = {
  tags: ['primary'],
  render: () =>
    frame(<PaymentDetailView p={PAYMENT} isDirector onReverse={noop} onRefund={noop} />),
};
/** BR-16: storno — teskari ledger yozuvi (o'chirish yo'q). */
export const W17_Reversed: Story = {
  render: () =>
    frame(<PaymentDetailView p={PAYMENT_REVERSED} isDirector onReverse={noop} onRefund={noop} />),
};
export const W17_Admin: Story = {
  render: () =>
    frame(<PaymentDetailView p={PAYMENT} isDirector={false} onReverse={noop} onRefund={noop} />),
};
export const W18_Discounts: Story = {
  tags: ['primary'],
  render: () => frame(<DiscountsView rows={DISCOUNTS} adminLimit={10} onGrant={noop} />),
};
export const W31_Approvals: Story = {
  tags: ['primary'],
  render: () =>
    frame(
      <WebApprovalsView
        rows={WEB_APPROVALS}
        open={null}
        onOpen={noop}
        onClose={noop}
        onApprove={noop}
        onReject={noop}
      />,
    ),
};
export const W31_Decision: Story = {
  render: () =>
    frame(
      <WebApprovalsView
        rows={WEB_APPROVALS}
        open={WEB_APPROVALS[0] ?? null}
        onOpen={noop}
        onClose={noop}
        onApprove={noop}
        onReject={noop}
      />,
    ),
};
/** W-34: ommaviy, kirishsiz; PII yo'q. */
export const W34_Valid: Story = {
  tags: ['primary'],
  render: () => (
    <VerifyView
      r={{
        kind: 'valid',
        number: 'LG-2026-000418',
        date: new Date('2026-10-08T12:10:00+05:00'),
        amount: 650_000n,
        center: 'Legendary Group',
      }}
    />
  ),
};
export const W34_Reversed: Story = {
  render: () => (
    <VerifyView
      r={{
        kind: 'reversed',
        number: 'LG-2026-000418',
        date: new Date('2026-10-08T12:10:00+05:00'),
        amount: 650_000n,
        center: 'Legendary Group',
      }}
    />
  ),
};
export const W34_NotFound: Story = { render: () => <VerifyView r={{ kind: 'not_found' }} /> };
const states = webStates('/payments', t.payDetail.receipt);
export const Loading: Story = states.Loading;
export const Error: Story = states.Error;
export const Forbidden: Story = states.Forbidden;
