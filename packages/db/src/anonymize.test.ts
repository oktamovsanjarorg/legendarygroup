import { describe, expect, it } from 'vitest';
import { Anonymizer } from './anonymize.js';

describe('T-018: Staging Anonymizer (Unit Tests)', () => {
  const anon = new Anonymizer('test-salt-secret-42');

  it('deterministik telefon: bir xil telefon doim bir xil soxta raqamga aylanadi', () => {
    const originalPhone = '+998901234567';
    const fake1 = anon.fakePhone(originalPhone);
    const fake2 = anon.fakePhone(originalPhone);

    expect(fake1).toBe(fake2);
    expect(fake1).toMatch(/^\+998\d{9}$/);
    expect(fake1).not.toBe(originalPhone);
  });

  it('turli telefonlar turli anonim raqamlarga aylanadi', () => {
    const fake1 = anon.fakePhone('+998901111111');
    const fake2 = anon.fakePhone('+998902222222');

    expect(fake1).not.toBe(fake2);
    expect(fake1).toMatch(/^\+998\d{9}$/);
    expect(fake2).toMatch(/^\+998\d{9}$/);
  });

  it("deterministik Telegram ID: xavfsiz va musbat bigint bo'lishi kerak", () => {
    const seed = 'usr_test_123';
    const fakeTg1 = anon.fakeTelegramId(seed);
    const fakeTg2 = anon.fakeTelegramId(seed);

    expect(fakeTg1).toBe(fakeTg2);
    expect(fakeTg1 > 0n).toBe(true);
    expect(fakeTg1.toString()).toMatch(/^\d{8,10}$/);
  });

  it("deterministik ism va familiya to'g'ri generatsiya qilinadi", () => {
    const seed = 'student_uuid_456';
    const name1 = anon.fakeName(seed);
    const name2 = anon.fakeName(seed);

    expect(name1.firstName).toBe(name2.firstName);
    expect(name1.lastName).toBe(name2.lastName);
    expect(name1.fullName).toBe(`${name1.firstName} ${name1.lastName}`);
  });

  it("CI tekshiruvi: namunaviy qatorlarda original PII to'liq soxtalashtiriladi", () => {
    const rawRows = [
      { id: 'u-1', name: 'Alisher Qodirov', phone: '+998901234567', tg: 123456789n },
      { id: 'u-2', name: 'Barno Umarova', phone: '+998939876543', tg: 987654321n },
    ];

    const anonymizedRows = rawRows.map((row) => ({
      id: row.id,
      name: anon.fakeName(row.id).fullName,
      phone: anon.fakePhone(row.phone),
      tg: anon.fakeTelegramId(row.id),
    }));

    for (let i = 0; i < rawRows.length; i++) {
      const original = rawRows[i]!;
      const anonymized = anonymizedRows[i]!;

      expect(anonymized.name).not.toBe(original.name);
      expect(anonymized.phone).not.toBe(original.phone);
      expect(anonymized.tg).not.toBe(original.tg);

      expect(anonymized.phone).toMatch(/^\+998\d{9}$/);
      expect(anonymized.name.length).toBeGreaterThan(3);
    }
  });
});
