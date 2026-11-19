import { describe, expect, it } from 'vitest';
import { suggestCodes } from './teacher-codes.policy.js';

describe('suggestCodes (T-128)', () => {
  it('band kodlarni oʻtkazib, kodsizlarga ketma-ket eng kichik boʻsh kod', () => {
    const rows = [
      { studentId: 'a', code: 1 },
      { studentId: 'b', code: null },
      { studentId: 'c', code: null },
    ];
    const s = suggestCodes(rows, new Set([1, 2, 4]));
    expect(s.get('b')).toBe(3);
    expect(s.get('c')).toBe(5);
    expect(s.has('a')).toBe(false);
  });

  it('999 band boʻlsa — taklif yoʻq (null)', () => {
    const taken = new Set(Array.from({ length: 999 }, (_, i) => i + 1));
    expect(suggestCodes([{ studentId: 'x', code: null }], taken).get('x')).toBeNull();
  });
});
