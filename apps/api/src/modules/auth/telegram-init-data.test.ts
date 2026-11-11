import { describe, expect, it } from 'vitest';
import { signInitData, verifyInitData } from './telegram-init-data.js';

const TOKEN = '123456:TEST-bot-token';
const NOW = Date.UTC(2026, 10, 11, 10, 0, 0);
const nowS = Math.floor(NOW / 1000);
const fields = (authDate = nowS) => ({
  auth_date: String(authDate),
  query_id: 'AAE',
  user: JSON.stringify({ id: 777000111, first_name: 'Ali', username: 'ali' }),
});

describe('verifyInitData (FR-AUTH-2, T-007)', () => {
  it("to'g'ri imzo — foydalanuvchi va auth_date", () => {
    const r = verifyInitData(signInitData(fields(), TOKEN), TOKEN, NOW);
    expect(r).toEqual({
      ok: true,
      authDate: nowS,
      user: { id: 777000111n, firstName: 'Ali', username: 'ali' },
    });
  });

  it("soxta initData: boshqa bot tokeni yoki o'zgartirilgan maydon — BAD_HASH", () => {
    expect(verifyInitData(signInitData(fields(), 'other:token'), TOKEN, NOW)).toEqual({
      ok: false,
      reason: 'BAD_HASH',
    });
    const tampered = signInitData(fields(), TOKEN).replace('777000111', '777000112');
    expect(verifyInitData(tampered, TOKEN, NOW)).toEqual({ ok: false, reason: 'BAD_HASH' });
  });

  it("eskirgan (24 soatdan ko'p) — EXPIRED; kelajakdagi — MALFORMED", () => {
    const stale = signInitData(fields(nowS - 24 * 3600 - 1), TOKEN);
    expect(verifyInitData(stale, TOKEN, NOW)).toEqual({ ok: false, reason: 'EXPIRED' });
    expect(verifyInitData(signInitData(fields(nowS - 24 * 3600), TOKEN), TOKEN, NOW).ok).toBe(true);
    expect(verifyInitData(signInitData(fields(nowS + 3600), TOKEN), TOKEN, NOW)).toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
  });

  it("hash'siz yoki noto'g'ri formatdagi ma'lumot — MALFORMED", () => {
    expect(verifyInitData('auth_date=1&user=x', TOKEN, NOW)).toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
    expect(
      verifyInitData(
        signInitData({ auth_date: String(nowS), user: 'not-json' }, TOKEN),
        TOKEN,
        NOW,
      ),
    ).toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
  });
});
