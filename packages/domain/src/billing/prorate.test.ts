import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { prorate, roundDownToThousand } from './prorate.js';

describe('prorate (BR-38)', () => {
  it('oddiy proporsiya: 12 darsdan 6 tasi = yarmi', () => {
    expect(prorate(600_000n, 6, 12)).toBe(300_000n);
  });

  it('qoldiqsiz boʻlinmaganda pastga yaxlitlaydi (floor)', () => {
    // 650_000 * 1 / 3 = 216_666.666... -> 216_666n
    expect(prorate(650_000n, 1, 3)).toBe(216_666n);
  });

  it('part 0 yoki manfiy boʻlsa 0n qaytaradi', () => {
    expect(prorate(650_000n, 0, 12)).toBe(0n);
    expect(prorate(650_000n, -2, 12)).toBe(0n);
  });

  it('total 0 yoki manfiy boʻlsa 0n qaytaradi', () => {
    expect(prorate(650_000n, 5, 0)).toBe(0n);
    expect(prorate(650_000n, 5, -12)).toBe(0n);
  });

  it('part >= total boʻlsa toʻliq summa qaytaradi (oshmaydi)', () => {
    expect(prorate(650_000n, 12, 12)).toBe(650_000n);
    expect(prorate(650_000n, 15, 12)).toBe(650_000n);
  });

  it('BR-38 xossa: natija har doim [0, amount] oraligʻida, monoton va matematik toʻgʻri', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 1_000_000_000n }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (amount, part, total) => {
          const res = prorate(amount, part, total);
          if (amount === 0n || part === 0 || total === 0) {
            expect(res).toBe(0n);
          } else if (part >= total) {
            expect(res).toBe(amount);
          } else {
            expect(res >= 0n && res <= amount).toBe(true);
            // floor(amount * part / total)
            const expected = (amount * BigInt(part)) / BigInt(total);
            expect(res).toBe(expected);
          }
        },
      ),
    );
  });
});

describe('roundDownToThousand (BR-3)', () => {
  it('1 000 ga karrali qiladi va pastga yaxlitlaydi', () => {
    expect(roundDownToThousand(433_333n)).toBe(433_000n);
    expect(roundDownToThousand(433_999n)).toBe(433_000n);
    expect(roundDownToThousand(433_000n)).toBe(433_000n);
    expect(roundDownToThousand(999n)).toBe(0n);
    expect(roundDownToThousand(0n)).toBe(0n);
  });

  it('BR-3 xossa: natija 1000 ga karrali va har doim <= kirish', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 1_000_000_000n }), (amount) => {
        const rounded = roundDownToThousand(amount);
        expect(rounded % 1000n).toBe(0n);
        expect(rounded <= amount).toBe(true);
        expect(amount - rounded < 1000n).toBe(true);
      }),
    );
  });
});
