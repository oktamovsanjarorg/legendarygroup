import { describe, expect, it } from 'vitest';
import { childResults, weeklyProgress } from './results-map.js';

const g = (date: string, value: number) => ({
  id: date + value,
  date,
  kind: 'homework' as const,
  value,
});

describe('ota-ona natijalari (T-116, FR-GRD-5)', () => {
  it('haftalik o‘rtacha (dushanbadan), 1 xona aniqlik, oxirgi 6 hafta', () => {
    const points = weeklyProgress([
      g('2026-11-09', 5),
      g('2026-11-11', 4),
      g('2026-11-15', 4),
      g('2026-11-16', 3),
    ]);
    expect(points.map((p) => p.value)).toEqual([4.3, 3]);
    const many = Array.from({ length: 8 }, (_, i) =>
      g(`2026-09-${String(7 * i + 1).padStart(2, '0')}`, 4),
    );
    expect(weeklyProgress(many.filter((x) => x.date <= '2026-09-30'))).toHaveLength(5);
  });

  it('testlar progress javobidan; guruh yo‘q (null) — bo‘sh', () => {
    const r = childResults({
      today: '2026-11-12',
      attendance: [],
      history: {
        grades: [],
        comments: [
          { id: 'c', text: 'Yaxshi', createdAt: '2026-11-10T10:00:00Z', createdByName: 'Ustoz' },
        ],
      },
      progress: {
        testResults: [
          {
            testId: 't',
            title: 'Oraliq',
            date: '2026-11-08',
            score: 8,
            maxScore: 10,
            percent: 79.6,
          },
        ],
      } as never,
    });
    expect(r.tests).toEqual([
      { id: 't', name: 'Oraliq', date: new Date('2026-11-08T07:00:00Z'), percent: 80 },
    ]);
    expect(r.comments[0]?.teacher).toBe('Ustoz');
    expect(
      childResults({
        today: '2026-11-12',
        attendance: [],
        history: { grades: [], comments: [] },
        progress: null,
      }).tests,
    ).toEqual([]);
  });
});
