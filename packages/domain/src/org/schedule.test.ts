import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canChangeGroupStatus, occupiesResources } from './group-status.js';
import {
  findSlotOverlap,
  intersectSpans,
  occupancyFor,
  planScheduleChange,
  type Slot,
  toMinutes,
} from './schedule.js';

const slot = (id: string, over: Partial<Slot> = {}): Slot => ({
  id,
  weekday: 1,
  startTime: '09:00',
  endTime: '10:30',
  validFrom: '2026-09-01',
  validTo: null,
  ...over,
});

const ymd = fc
  .date({ min: new Date('2026-01-01'), max: new Date('2027-12-31'), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10));
const span = fc
  .tuple(ymd, fc.option(ymd, { nil: null }))
  .map(([a, b]) => (b !== null && b < a ? { from: b, to: a } : { from: a, to: b }));

describe('intersectSpans', () => {
  it('cheksiz oraliq va kesishmaslik', () => {
    expect(
      intersectSpans({ from: '2026-01-01', to: null }, { from: '2026-03-01', to: '2026-04-01' }),
    ).toEqual({ from: '2026-03-01', to: '2026-04-01' });
    expect(
      intersectSpans({ from: '2026-01-01', to: '2026-01-31' }, { from: '2026-02-01', to: null }),
    ).toBeNull();
  });
  it('property: kommutativ, natija ikkala oraliq ichida', () => {
    fc.assert(
      fc.property(span, span, (a, b) => {
        const x = intersectSpans(a, b);
        expect(x).toEqual(intersectSpans(b, a));
        if (!x) return;
        for (const s of [a, b]) {
          expect(x.from >= s.from).toBe(true);
          if (s.to !== null) expect(x.to !== null && x.to <= s.to).toBe(true);
        }
      }),
    );
  });
});

describe('occupancyFor (FR-ORG-4)', () => {
  const group = { roomId: 'r1', startDate: '2026-09-01', endDate: '2027-05-31', occupies: true };

  it('slot × xona va slot × ustoz davri, guruh sanalari bilan qirqiladi', () => {
    const rows = occupancyFor(
      group,
      [slot('s1')],
      [
        { teacherId: 't1', from: '2026-08-01', to: '2026-12-31' },
        { teacherId: 't2', from: '2027-01-01', to: null },
      ],
    );
    expect(rows).toEqual([
      expect.objectContaining({
        kind: 'room',
        resourceId: 'r1',
        from: '2026-09-01',
        to: '2027-05-31',
        startMin: 540,
        endMin: 630,
      }),
      expect.objectContaining({
        kind: 'teacher',
        resourceId: 't1',
        from: '2026-09-01',
        to: '2026-12-31',
      }),
      expect.objectContaining({
        kind: 'teacher',
        resourceId: 't2',
        from: '2027-01-01',
        to: '2027-05-31',
      }),
    ]);
  });

  it('xonasiz guruh, guruhdan tashqari ustoz davri, yakunlangan guruh', () => {
    expect(occupancyFor({ ...group, roomId: null }, [slot('s1')], [])).toEqual([]);
    expect(
      occupancyFor(
        group,
        [slot('s1')],
        [{ teacherId: 't1', from: '2025-01-01', to: '2025-12-31' }],
      ),
    ).toHaveLength(1);
    expect(occupancyFor({ ...group, occupies: false }, [slot('s1')], [])).toEqual([]);
  });
});

describe('findSlotOverlap', () => {
  it('[start, end): ketma-ket slotlar kesishmaydi; bir vaqt — kesishadi', () => {
    expect(
      findSlotOverlap([slot('a'), slot('b', { startTime: '10:30', endTime: '12:00' })]),
    ).toBeNull();
    expect(
      findSlotOverlap([slot('a'), slot('b', { startTime: '10:00', endTime: '11:00' })]),
    ).not.toBeNull();
    expect(findSlotOverlap([slot('a'), slot('b', { weekday: 3 })])).toBeNull();
    expect(
      findSlotOverlap([
        slot('a', { validTo: '2026-12-31' }),
        slot('b', { validFrom: '2027-01-01' }),
      ]),
    ).toBeNull();
  });
});

describe('planScheduleChange — oʻtmish oʻzgarmaydi', () => {
  it('eski slot sanadan oldin yopiladi, kelajakdagisi oʻchiriladi, yopilgani tegilmaydi', () => {
    const plan = planScheduleChange(
      [
        slot('old'),
        slot('future', { validFrom: '2027-02-01' }),
        slot('closed', { validTo: '2026-10-31' }),
      ],
      '2027-01-15',
    );
    expect(plan).toEqual({ close: [{ id: 'old', validTo: '2027-01-14' }], remove: ['future'] });
  });
});

describe('Guruh holatlari (FR-ORG-3)', () => {
  it('ruxsat etilgan va taqiqlangan oʻtishlar', () => {
    expect(canChangeGroupStatus('forming', 'active')).toBe(true);
    expect(canChangeGroupStatus('paused', 'active')).toBe(true);
    expect(canChangeGroupStatus('finished', 'active')).toBe(false);
    expect(canChangeGroupStatus('forming', 'paused')).toBe(false);
    expect(occupiesResources('paused')).toBe(true);
    expect(occupiesResources('finished')).toBe(false);
  });
  it('toMinutes', () => expect(toMinutes('18:45:00')).toBe(1125));
});
