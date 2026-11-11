import { describe, expect, it } from 'vitest';
import { hashPassword, randomToken, SecretBox, sha256, verifyPassword } from './crypto.js';

const KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

describe('SecretBox (AES-256-GCM, TOTP sirlari)', () => {
  const box = new SecretBox(KEY);

  it('shifrlaydi va ochadi; har safar boshqa IV', () => {
    const a = box.seal('JBSWY3DPEHPK3PXP');
    expect(box.open(a)).toBe('JBSWY3DPEHPK3PXP');
    expect(box.seal('JBSWY3DPEHPK3PXP')).not.toBe(a);
    expect(a).not.toContain('JBSWY3DPEHPK3PXP');
  });

  it("o'zgartirilgan shifrmatn yoki boshqa kalit — rad etiladi", () => {
    const sealed = box.seal('secret');
    const parts = sealed.split('.');
    const tampered = [...parts.slice(0, 3), Buffer.from('other').toString('base64url')].join('.');
    expect(() => box.open(tampered)).toThrow();
    expect(() => new SecretBox('ff'.repeat(32)).open(sealed)).toThrow();
  });

  it("kalit 32 bayt bo'lmasa — xato", () => {
    expect(() => new SecretBox('abcd')).toThrow();
  });
});

describe('Parol (Argon2id)', () => {
  it("to'g'ri parol mos, noto'g'risi va buzilgan hash — yo'q", async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, 'correct-horse-battery')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('Tokenlar', () => {
  it('randomToken — 256 bit, URL-xavfsiz; sha256 — hex', () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha256('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});
