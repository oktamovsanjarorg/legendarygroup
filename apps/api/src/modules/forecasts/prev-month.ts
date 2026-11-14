/**
 * O'tgan kalendar oyi (Toshkent sanasi bo'yicha): `[start, endExclusive)`. `new Date()`/`setMonth`
 * emas — 31-martda `setMonth(-1)` "31-fevral" → 3-mart beradi, `-31` esa 30 kunlik oyda
 * mavjud bo'lmagan sana (Postgres xatosi).
 */
export function prevMonthRange(todayYmd: string): {
  period: string;
  start: string;
  endExclusive: string;
} {
  const y = Number(todayYmd.slice(0, 4));
  const m = Number(todayYmd.slice(5, 7));
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const period = `${py}-${String(pm).padStart(2, '0')}`;
  return { period, start: `${period}-01`, endExclusive: `${todayYmd.slice(0, 7)}-01` };
}
