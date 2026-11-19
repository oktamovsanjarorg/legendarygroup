import { describe, expect, it } from 'vitest';
import { createBody, EMPTY_GUARDIAN, EMPTY_STUDENT, updateBody } from './student-draft.js';

const draft = (code: string) => ({ ...EMPTY_STUDENT, fullName: 'Titul Bola', code });

describe('Oʻquvchi raqami formasi (T-127)', () => {
  it('kiritilgan raqam songa aylanadi (oldingi nollar olib tashlanadi)', () => {
    const r = createBody(draft('01325'), EMPTY_GUARDIAN, false);
    expect(r.ok && r.body.code).toBe(1325);
  });

  it('boʻsh — yuborilmaydi (avtomatik)', () => {
    const r = createBody(draft('  '), EMPTY_GUARDIAN, false);
    expect(r.ok && r.body.code).toBeUndefined();
  });

  it('harf yoki 8 xona — maydon xatosi', () => {
    for (const code of ['12a', '12345678', '0']) {
      const r = createBody(draft(code), EMPTY_GUARDIAN, false);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.code).toBeDefined();
    }
    const u = updateBody(draft('x'));
    expect(u.ok).toBe(false);
  });
});
