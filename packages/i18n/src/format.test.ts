import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatMoney,
  formatMonth,
  formatPhone,
  formatTime,
  NBSP,
  parseMoney,
} from './format.js';
import { normalizeUz } from './normalize.js';
import { amountInWords, MAX_WORDS_AMOUNT, toWordsUz } from './words.js';

const s = (text: string) => text.replaceAll(' ', NBSP);

describe('formatMoney (FR-SYS-3)', () => {
  it('ming ajratuvchi — U+00A0, soʻm — U+02BB', () => {
    expect(formatMoney(1_250_000n)).toBe(s('1 250 000 soʻm'));
    expect(formatMoney(0n)).toBe(s('0 soʻm'));
    expect(formatMoney(999n)).toBe(s('999 soʻm'));
    expect(formatMoney(-50_000n)).toBe(s('−50 000 soʻm'));
    expect(formatMoney(1_000n, { withCurrency: false })).toBe(s('1 000'));
  });

  it("property: parseMoney(formatMoney(x)) = x (pul yo'qolmaydi)", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 999_999_999_999_999n }), (x) => {
        expect(parseMoney(formatMoney(x))).toBe(x);
      }),
    );
  });

  it("parseMoney: bo'shliqli kiritma; noto'g'ri — null", () => {
    expect(parseMoney('1 250 000')).toBe(1_250_000n);
    expect(parseMoney('12,5')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
});

describe('Sana va vaqt (Asia/Tashkent)', () => {
  // 2026-11-10 19:30Z = 11-noyabr 00:30 Toshkent
  const d = new Date('2026-11-10T19:30:00Z');
  it('10-noyabr, 2026 formati — Toshkent kalendari', () => {
    expect(formatDate(d)).toBe('11-noyabr, 2026');
    expect(formatDate(d, { withYear: false })).toBe('11-noyabr');
    expect(formatDateShort(d)).toBe('11.11.2026');
    expect(formatTime(d)).toBe('00:30');
    expect(formatDateTime(d)).toBe('11.11.2026 00:30');
    expect(formatMonth(d)).toBe('noyabr, 2026');
    expect(formatMonth(new Date('2026-12-31T19:00:00Z'))).toBe('yanvar, 2027');
  });
});

describe('formatPhone', () => {
  it('+998 90 123 45 67', () => {
    expect(formatPhone('+998901234567')).toBe(s('+998 90 123 45 67'));
    expect(formatPhone('+12025550123')).toBe('+12025550123');
  });
});

describe("toWordsUz (chek — summa so'z bilan)", () => {
  it.each([
    [0n, 'nol'],
    [5n, 'besh'],
    [14n, 'oʻn toʻrt'],
    [90n, 'toʻqson'],
    [100n, 'bir yuz'],
    [1_000n, 'bir ming'],
    [1_250_000n, 'bir million ikki yuz ellik ming'],
    [2_000_005n, 'ikki million besh'],
    [999_999n, 'toʻqqiz yuz toʻqson toʻqqiz ming toʻqqiz yuz toʻqson toʻqqiz'],
    [3_000_000_000n, 'uch milliard'],
  ])('%s → %s', (n, words) => {
    expect(toWordsUz(n)).toBe(words);
  });

  it('chek uchun: bosh harf + soʻm', () => {
    expect(amountInWords(1_250_000n)).toBe('Bir million ikki yuz ellik ming soʻm');
  });

  it("property: chegara ichida har doim bo'sh bo'lmagan, ortiqcha bo'shliqsiz, ' yo'q", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: MAX_WORDS_AMOUNT }), (x) => {
        const w = toWordsUz(x);
        return w.length > 0 && !w.includes('  ') && w === w.trim() && !w.includes("'");
      }),
    );
  });

  it('chegaradan tashqari — RangeError', () => {
    expect(() => toWordsUz(-1n)).toThrow(RangeError);
    expect(() => toWordsUz(MAX_WORDS_AMOUNT + 1n)).toThrow(RangeError);
  });
});

describe('normalizeUz (qidiruv)', () => {
  it("oʻ / o' / o‘ / o’ / ʼ — bir xil", () => {
    const forms = ["O'g'iloy", 'Oʻgʻiloy', 'O‘g‘iloy', 'O’g’iloy', 'O`g`iloy'];
    expect(new Set(forms.map(normalizeUz)).size).toBe(1);
    expect(normalizeUz('  Maʼmur   Aliyev ')).toBe("ma'mur aliyev");
  });
});

describe('kalendar kuni (API `date` maydonlari)', () => {
  it('toYmd — Toshkent kuni (UTC 20:00 — ertasi kun)', async () => {
    const { toYmd, formatYmd } = await import('./format.js');
    expect(toYmd(new Date('2026-11-10T20:00:00Z'))).toBe('2026-11-11');
    expect(toYmd(new Date('2026-11-10T05:00:00Z'))).toBe('2026-11-10');
    expect(formatYmd('2026-11-10')).toBe('10.11.2026');
  });
});
