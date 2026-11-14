import type { Invoice, InvoiceWithLines, LessonDto, PaymentDetail } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import {
  childSummary,
  childToday,
  debtOf,
  invoiceRows,
  paidAmount,
  paymentRows,
} from './guardian-map.js';

const lesson = (date: string, start: string, status = 'scheduled') =>
  ({
    id: date + start,
    group: { id: 'g', name: 'M-1' },
    date,
    startTime: start,
    endTime: '23:00',
    room: null,
    isSubstitute: false,
    status,
  }) as LessonDto;
const inv = (id: string, status: Invoice['status'], dueDate: string, total = '500000') =>
  ({ id, period: '2026-11', dueDate, total, status }) as Invoice;

describe('ota-ona bosh sahifasi (T-116, BR-20)', () => {
  const today = '2026-11-12';

  it('bugun: belgilangan / kutilmoqda / dars yo‘q; bekor qilingan dars hisobga olinmaydi', () => {
    const late = [
      { lessonId: 'l', date: today, groupName: 'M-1', status: 'late' as const, lateMinutes: 12 },
    ];
    expect(childToday(today, [lesson(today, '15:00')], late)).toEqual({
      kind: 'late',
      minutes: 12,
    });
    expect(childToday(today, [lesson(today, '15:00')], [])).toEqual({
      kind: 'pending',
      at: new Date('2026-11-12T10:00:00Z'),
    });
    expect(childToday(today, [lesson(today, '15:00', 'cancelled')], [])).toEqual({ kind: 'none' });
  });

  it('qarz ishorasi: balance musbat — avans; muddat faqat qarz bo‘lsa, eng yaqin ochiq hisob', () => {
    expect(debtOf({ balance: '-650000' } as never)).toBe(650_000n);
    const s = childSummary({
      id: 'c',
      name: 'Ali',
      today,
      now: new Date('2026-11-12T08:00:00Z'),
      lessons: [lesson(today, '09:00'), lesson('2026-11-13', '09:00')],
      attendance: [],
      ledger: { balance: '-100' } as never,
      invoices: [
        inv('a', 'paid', '2026-10-05'),
        inv('b', 'open', '2026-11-20'),
        inv('c', 'partially_paid', '2026-11-05'),
      ],
    });
    expect(s.next?.startsAt.toISOString()).toBe('2026-11-13T04:00:00.000Z');
    expect(s.dueDate?.toISOString()).toBe('2026-11-05T18:59:00.000Z');
    expect(
      childSummary({
        ...s,
        today,
        now: new Date(),
        lessons: [],
        attendance: [],
        ledger: { balance: '5' } as never,
        invoices: [],
      }).dueDate,
    ).toBeUndefined();
  });

  it('to‘langan qism: to‘liq / ochiq / qisman (taqsimot qatorlari bo‘yicha); usul nomi', () => {
    const detail = { id: 'p', lines: [{ id: 'L1' }] } as InvoiceWithLines;
    const pays = [
      {
        id: 'x',
        amount: '300000',
        method: 'bank',
        paidAt: '2026-11-03T10:00:00Z',
        receiptNumber: 'LG-2026-000001',
        allocations: [
          { invoiceLineId: 'L1', amount: '200000' },
          { invoiceLineId: 'Z', amount: '100000' },
        ],
      },
    ] as PaymentDetail[];
    expect(paidAmount(inv('p', 'partially_paid', today), detail, pays)).toBe(200_000n);
    expect(paidAmount(inv('q', 'paid', today), undefined, pays)).toBe(500_000n);
    const rows = invoiceRows(
      [inv('q', 'open', '2026-11-01'), inv('v', 'void', today)],
      () => 0n,
      today,
    );
    expect(rows.map((r) => [r.id, r.overdue])).toEqual([['q', true]]);
    expect(paymentRows(pays)[0]).toMatchObject({
      method: 'transfer',
      receiptNo: 'LG-2026-000001',
      amount: 300_000n,
    });
  });
});
