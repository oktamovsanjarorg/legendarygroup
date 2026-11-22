import { describe, expect, it } from 'vitest';
import { monthsBefore, setupRequest } from './staff-setup.js';

describe('T-145 boshlangʻich holat (mapper)', () => {
  it('kelgan oydan oʻtgan oygacha; yil oshadi; joriy oyda kelgan — boʻsh', () => {
    expect(monthsBefore('2026-09-15', '2026-11-22')).toEqual(['2026-09', '2026-10']);
    expect(monthsBefore('2025-12-01', '2026-02-03')).toEqual(['2025-12', '2026-01']);
    expect(monthsBefore('2026-11-05', '2026-11-22')).toEqual([]);
  });

  it('soʻrov: faqat diapazondagi, summasi bor toʻlanmagan oylar', () => {
    const groups = [{ enrollmentId: 'e1', groupId: 'g1', name: 'G', price: 600000n }];
    const req = setupRequest(
      groups,
      {
        e1: {
          startDate: '2026-10-03',
          unpaid: { '2026-09': 600000n, '2026-10': 600000n, '2026-11': 1n },
        },
      },
      '2026-11-22',
    );
    expect(req).toEqual({
      enrollments: [{ enrollmentId: 'e1', startDate: '2026-10-03' }],
      openingDebts: [{ enrollmentId: 'e1', period: '2026-10', amount: '600000' }],
    });
  });
});
