import { createHmac, timingSafeEqual } from 'node:crypto';

/** FR-AUTH-2: `auth_date` 24 soatdan eski bo'lsa rad etiladi. */
export const INIT_DATA_MAX_AGE_S = 24 * 60 * 60;
/** Soat farqi uchun ruxsat (kelajakdagi `auth_date`). */
const CLOCK_SKEW_S = 60;

export interface TelegramInitUser {
  id: bigint;
  firstName: string;
  username: string | null;
}

export type InitDataResult =
  | { ok: true; user: TelegramInitUser; authDate: number }
  | { ok: false; reason: 'MALFORMED' | 'BAD_HASH' | 'EXPIRED' };

/**
 * Telegram Mini App `initData` tekshiruvi (core.telegram.org/bots/webapps#validating-data):
 * `secret = HMAC_SHA256("WebAppData", botToken)`, `hash = HMAC_SHA256(secret, data_check_string)`,
 * `data_check_string` — `hash`dan boshqa juftlar, kalit bo'yicha saralangan, `\n` bilan.
 */
type Signed =
  | { ok: true; params: URLSearchParams; authDate: number }
  | { ok: false; reason: 'MALFORMED' | 'BAD_HASH' | 'EXPIRED' };

/** Imzo va `auth_date` (initData ham, `requestContact` javobi ham shu algoritmda). */
function verifySigned(raw: string, botToken: string, nowMs: number): Signed {
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return { ok: false, reason: 'MALFORMED' };
  params.delete('hash');

  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheck).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex')))
    return { ok: false, reason: 'BAD_HASH' };

  const authDate = Number(params.get('auth_date'));
  const nowS = Math.floor(nowMs / 1000);
  if (!Number.isInteger(authDate) || authDate > nowS + CLOCK_SKEW_S)
    return { ok: false, reason: 'MALFORMED' };
  if (nowS - authDate > INIT_DATA_MAX_AGE_S) return { ok: false, reason: 'EXPIRED' };
  return { ok: true, params, authDate };
}

/**
 * Telegram Mini App `initData` tekshiruvi (core.telegram.org/bots/webapps#validating-data):
 * `secret = HMAC_SHA256("WebAppData", botToken)`, `hash = HMAC_SHA256(secret, data_check_string)`,
 * `data_check_string` — `hash`dan boshqa juftlar, kalit bo'yicha saralangan, `\n` bilan.
 */
export function verifyInitData(initData: string, botToken: string, nowMs: number): InitDataResult {
  const signed = verifySigned(initData, botToken, nowMs);
  if (!signed.ok) return signed;
  const user = parseUser(signed.params.get('user'));
  return user ? { ok: true, authDate: signed.authDate, user } : { ok: false, reason: 'MALFORMED' };
}

export type ContactResult =
  | { ok: true; userId: bigint; phone: string; fullName: string }
  | { ok: false; reason: 'MALFORMED' | 'BAD_HASH' | 'EXPIRED' };

/**
 * `WebApp.requestContact` javobi (`response` qatori, Bot API 6.9+): Telegram imzolagan
 * `contact={phone_number,first_name,last_name,user_id}` — raqamni soxtalashtirib bo'lmaydi (Q-111).
 */
export function verifyContactResponse(raw: string, botToken: string, nowMs: number): ContactResult {
  const signed = verifySigned(raw, botToken, nowMs);
  if (!signed.ok) return signed;
  try {
    const c = JSON.parse(signed.params.get('contact') ?? '') as Record<string, unknown>;
    const { phone_number: phone, user_id: id } = c;
    if (typeof phone !== 'string' || typeof id !== 'number' || !Number.isSafeInteger(id))
      return { ok: false, reason: 'MALFORMED' };
    const fullName = [c['first_name'], c['last_name']]
      .filter((x) => typeof x === 'string')
      .join(' ');
    return { ok: true, userId: BigInt(id), phone, fullName };
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
}

function parseUser(json: string | null): TelegramInitUser | null {
  try {
    const raw = JSON.parse(json ?? '') as {
      id?: unknown;
      first_name?: unknown;
      username?: unknown;
    };
    if (typeof raw.id !== 'number' || !Number.isSafeInteger(raw.id)) return null;
    return {
      id: BigInt(raw.id),
      firstName: typeof raw.first_name === 'string' ? raw.first_name : '',
      username: typeof raw.username === 'string' ? raw.username : null,
    };
  } catch {
    return null;
  }
}

/** Testlar va lokal ishlab chiqish uchun: haqiqiy imzoli `initData` yasaydi. */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const dataCheck = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dataCheck).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}
