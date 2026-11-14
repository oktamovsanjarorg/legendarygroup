import { describe, expect, it } from 'vitest';
import { CreateApprovalRequest, DecideApprovalRequest } from './approvals.js';

describe('Approval Contracts', () => {
  it('validates valid discount approval request', () => {
    const parsed = CreateApprovalRequest.safeParse({
      type: 'discount',
      payload: {
        enrollmentId: '11111111-1111-4111-8111-111111111111',
        percent: 25,
        reason: 'Olimpiada sovrindori',
      },
      reason: '25% chegirma soʻrovi',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid percent or short reason', () => {
    const parsed = CreateApprovalRequest.safeParse({
      type: 'discount',
      payload: {
        enrollmentId: '11111111-1111-4111-8111-111111111111',
        percent: 150,
        reason: 'ok',
      },
      reason: 'qisqa',
    });
    expect(parsed.success).toBe(false);
  });

  it('validates reversal request', () => {
    const parsed = CreateApprovalRequest.safeParse({
      type: 'reversal',
      payload: {
        paymentId: '22222222-2222-4222-8222-222222222222',
        reason: 'Adashib kiritilgan toʻlov',
      },
      reason: 'Kecha kiritilgan toʻlovni storno qilish',
    });
    expect(parsed.success).toBe(true);
  });

  it('davomat tuzatish: holatlar davomat moduli bilan bir xil; kech — daqiqa majburiy', () => {
    const base = {
      type: 'attendance_edit',
      reason: 'Jurnaldagi xato',
      payload: {
        lessonId: '11111111-1111-4111-8111-111111111111',
        studentId: '22222222-2222-4222-8222-222222222222',
        reason: 'Jurnaldagi xato',
      },
    };
    const ok = (payload: object) =>
      CreateApprovalRequest.safeParse({ ...base, payload: { ...base.payload, ...payload } })
        .success;
    expect(ok({ status: 'absent' })).toBe(true);
    expect(ok({ status: 'late', lateMinutes: 10 })).toBe(true);
    expect(ok({ status: 'late' })).toBe(false);
    expect(ok({ status: 'unexcused' })).toBe(false);
  });

  it('validates decision input', () => {
    const valid = DecideApprovalRequest.safeParse({
      decision: 'approve',
      note: 'Tasdiqlandi',
    });
    expect(valid.success).toBe(true);

    const invalid = DecideApprovalRequest.safeParse({
      decision: 'pending',
    });
    expect(invalid.success).toBe(false);
  });
});
