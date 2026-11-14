import type { PaymentSubmission, TicketDetail } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { toSubmission, toTicket } from './guardian-actions.js';

describe('ota-ona amallari (T-206, FR-RPT-7)', () => {
  it('chek holati: tekshirilmoqda / tasdiqlandi (chek raqami) / rad (sabab)', () => {
    const base = {
      studentName: 'Ali',
      amountClaimed: '650000',
      createdAt: '2026-11-12T10:00:00Z',
      receiptNumber: null,
      rejectReason: null,
    } as PaymentSubmission;
    expect(toSubmission({ ...base, status: 'pending_review' }).status).toEqual({
      kind: 'pending_review',
    });
    expect(
      toSubmission({ ...base, status: 'confirmed', receiptNumber: 'LG-2026-000007' }).status,
    ).toEqual({ kind: 'confirmed', receiptNo: 'LG-2026-000007' });
    expect(
      toSubmission({ ...base, status: 'rejected', rejectReason: 'Summa mos emas' }),
    ).toMatchObject({ amount: 650_000n, status: { kind: 'rejected', reason: 'Summa mos emas' } });
  });

  it('murojaat: oxirgi xabar markazdan — javob berilgan; muallif — men/markaz', () => {
    const msg = (id: string, authorId: string) => ({
      id,
      authorId,
      text: id,
      createdAt: '2026-11-12T10:00:00Z',
    });
    const d = { id: 't', messages: [msg('a', 'me'), msg('b', 'admin')] } as unknown as TicketDetail;
    expect(toTicket(d, 'me')).toMatchObject({
      status: 'answered',
      messages: [{ from: 'me' }, { from: 'center' }],
    });
    expect(
      toTicket({ ...d, messages: [msg('a', 'me')] } as unknown as TicketDetail, 'me').status,
    ).toBe('open');
  });
});
