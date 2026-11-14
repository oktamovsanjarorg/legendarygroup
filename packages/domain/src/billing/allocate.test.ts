import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { allocateFifo, type OpenItem } from './allocate.js';

const item = (id: string, dueDate: string, outstanding: bigint): OpenItem => ({
  id,
  dueDate,
  outstanding,
});

const itemsArb = fc.uniqueArray(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 6 }),
    dueDate: fc
      .date({ min: new Date('2025-01-01'), max: new Date('2027-12-31'), noInvalidDate: true })
      .map((d) => d.toISOString().slice(0, 10)),
    outstanding: fc.bigInt({ min: 1n, max: 50_000_000n }),
  }),
  { selector: (i) => i.id, maxLength: 12 },
);
const amountArb = fc.bigInt({ min: 1n, max: 500_000_000n });

describe('allocateFifo (BR-12)', () => {
  it('misol: 1 000 000 → sentyabr 650 000, oktyabr 350 000', () => {
    const r = allocateFifo(1_000_000n, [
      item('okt', '2026-10-10', 650_000n),
      item('sen', '2026-09-10', 650_000n),
    ]);
    expect(r).toEqual({
      parts: [
        { id: 'sen', amount: 650_000n },
        { id: 'okt', amount: 350_000n },
      ],
      advance: 0n,
    });
  });

  it('qarz yoʻq — hammasi avans', () => {
    expect(allocateFifo(650_000n, [])).toEqual({ parts: [], advance: 650_000n });
  });

  it('notoʻgʻri kirish — xato', () => {
    expect(() => allocateFifo(0n, [])).toThrow(RangeError);
    expect(() => allocateFifo(1n, [item('a', '2026-01-01', 0n)])).toThrow(RangeError);
  });

  it('BR-12 xossa: summa saqlanadi, qator qoldig‘idan oshmaydi, eskisi avval, avans faqat qarz yopilganda', () => {
    fc.assert(
      fc.property(amountArb, itemsArb, (amount, items) => {
        const { parts, advance } = allocateFifo(amount, items);
        const sorted = [...items].sort((a, b) =>
          a.dueDate === b.dueDate ? (a.id < b.id ? -1 : 1) : a.dueDate < b.dueDate ? -1 : 1,
        );
        const total = items.reduce((s, i) => s + i.outstanding, 0n);
        // 1) summa saqlanadi
        expect(parts.reduce((s, p) => s + p.amount, 0n) + advance).toBe(amount);
        // 2) har qism musbat va qoldiqdan oshmaydi; tartib — eng eskidan
        parts.forEach((p, k) => {
          expect(p.id).toBe(sorted[k]?.id);
          expect(p.amount > 0n && p.amount <= (sorted[k]?.outstanding ?? 0n)).toBe(true);
        });
        // 3) oxirgisidan oldingilar to'liq yopilgan
        parts.slice(0, -1).forEach((p, k) => expect(p.amount).toBe(sorted[k]?.outstanding));
        // 4) avans faqat butun qarz yopilganda va aynan ortiqcha
        expect(advance).toBe(amount > total ? amount - total : 0n);
      }),
    );
  });
});
