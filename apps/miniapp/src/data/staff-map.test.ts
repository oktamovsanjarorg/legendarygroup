import type { ApprovalRequest, DirectorDashboardKpi, PaymentSubmission } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { approvalRequest, queueItem, staffKpi } from './staff-map.js';

const sub = (id: string, createdAt: string, extra: Partial<PaymentSubmission> = {}) =>
  ({
    id,
    studentId: 's1',
    amountClaimed: '650000',
    createdAt,
    studentName: 'Ali',
    groupName: 'G',
    guardianName: 'Ona',
    comment: null,
    reviewLockedBy: null,
    reviewLockedUntil: null,
    ...extra,
  }) as PaymentSubmission;

describe('xodim Mini App (T-120, BR-14/15)', () => {
  it('KPI: tasdiqlash soni faqat Director’ga', () => {
    const k = {
      revenueToday: '100',
      revenueYesterday: '50',
      attendance: 92,
      unmarked: 2,
      absentToday: 3,
      queue: 4,
      approvals: 1,
    } as DirectorDashboardKpi;
    expect(staffKpi(k, true)).toMatchObject({ revenue: 100n, absentToday: 3, approvals: 1 });
    expect(staffKpi(k, false).approvals).toBeUndefined();
  });

  it('BR-15 dublikat: shu o‘quvchi, shu summa, 24 soat ichida; BR-14 lock — boshqa Admin', () => {
    const a = sub('a', '2026-11-12T08:00:00Z');
    const b = sub('b', '2026-11-12T20:00:00Z');
    const c = sub('c', '2026-11-14T08:00:00Z');
    expect(queueItem(a, [a, b, c], 'u', 'me').duplicateOf?.sentAt.toISOString()).toBe(
      '2026-11-12T20:00:00.000Z',
    );
    expect(queueItem(c, [a, b, c], 'u', 'me').duplicateOf).toBeUndefined();
    const future = new Date(Date.now() + 60_000).toISOString();
    const locked = sub('d', '2026-11-12T08:00:00Z', {
      reviewLockedBy: 'x',
      reviewLockedByName: 'Admin 2',
      reviewLockedUntil: future,
    });
    expect(queueItem(locked, [locked], 'u', 'me').lockedBy).toBe('Admin 2');
    expect(
      queueItem({ ...locked, reviewLockedBy: 'me' }, [locked], 'u', 'me').lockedBy,
    ).toBeUndefined();
  });

  it('so‘rov tafsiloti: foiz, summa, davomat holati', () => {
    const r = approvalRequest({
      id: 'r',
      type: 'refund',
      payload: { amount: '150000', status: 'absent' },
      reason: 'X',
      requestedByName: 'Admin',
      expiresAt: '2026-11-14T10:00:00Z',
    } as unknown as ApprovalRequest);
    expect(r.details.map((d) => d.label)).toEqual(['Summa', 'Yangi holat']);
    expect(r.details[1]?.value).toBe('Kelmadi');
  });
});
