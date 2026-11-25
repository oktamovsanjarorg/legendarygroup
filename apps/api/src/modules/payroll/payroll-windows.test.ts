import type { TeacherContractRow } from '@lg/db';
import { describe, expect, it } from 'vitest';
import { contractWindows, windowDays } from './payroll-windows.js';

const contract = (over: Partial<TeacherContractRow>): TeacherContractRow => ({
  id: 'c',
  branchId: 'b',
  teacherId: 't',
  groupId: null,
  type: 'mixed',
  fixedAmount: 1_000_000n,
  percentBp: 1000,
  perLessonRate: 0n,
  base: 'collected',
  validFrom: '2026-01-01',
  validTo: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

const shape = (cs: TeacherContractRow[]) =>
  contractWindows(cs, '2026-10').map((w) => ({
    id: w.contract.id,
    latest: w.latest,
    seg: w.segments.map(
      (s) => `${s.from}..${s.to} ${s.scope.only ?? `-${s.scope.exclude.join()}`}`,
    ),
  }));

describe('BR-23: shartnoma oynalari (Q-104)', () => {
  it('toʻliq oy — bitta oyna, kunlar toʻliq', () => {
    const [w] = contractWindows([contract({})], '2026-10');
    expect(windowDays(w!.segments, '2026-10')).toEqual({ days: 31, total: 31 });
  });

  it('oy oʻrtasida boshlangan/tugagan shartnoma — faqat oʻz kunlari', () => {
    const [w] = contractWindows(
      [contract({ validFrom: '2026-10-11', validTo: '2026-10-20' })],
      '2026-10',
    );
    expect(windowDays(w!.segments, '2026-10')).toEqual({ days: 10, total: 31 });
  });

  it('oy oʻrtasida almashgan: ikkisi ham oʻz kuniga, ustma-ust kun yoʻq', () => {
    expect(
      shape([contract({ id: 'old' }), contract({ id: 'new', validFrom: '2026-10-16' })]),
    ).toEqual([
      { id: 'new', latest: true, seg: ['2026-10-16..2026-11-01 -'] },
      { id: 'old', latest: false, seg: ['2026-10-01..2026-10-16 -'] },
    ]);
  });

  it('guruh shartnomasi oy oʻrtasidan — umumiysi oʻsha guruhni faqat undan keyin chiqarib tashlaydi', () => {
    expect(
      shape([
        contract({ id: 'gen' }),
        contract({ id: 'g', groupId: 'G', validFrom: '2026-10-16' }),
      ]),
    ).toEqual([
      { id: 'g', latest: true, seg: ['2026-10-16..2026-11-01 G'] },
      {
        id: 'gen',
        latest: true,
        seg: ['2026-10-01..2026-10-16 -', '2026-10-16..2026-11-01 -G'],
      },
    ]);
  });

  it('oydan tashqari shartnoma — oyna yoʻq', () => {
    expect(shape([contract({ validTo: '2026-09-30' })])).toEqual([]);
    expect(shape([contract({ validFrom: '2026-11-01' })])).toEqual([]);
  });
});
