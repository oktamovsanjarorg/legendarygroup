import type { PaymentKind } from '@lg/contracts';
import type { PaymentRow } from '@lg/db';

/** Storno — `reversalOf` bor; manfiy summa — qaytarish (BR-16/17). */
export const paymentKind = (p: Pick<PaymentRow, 'amount' | 'reversalOf'>): PaymentKind => {
  if (p.reversalOf) return 'reversal';
  return p.amount < 0n ? 'refund' : 'payment';
};
