/**
 * BR-38: Proporsional summa hamisha bitta domen funksiyasi orqali:
 * prorate(amount, part, total) = floor(amount × part / total) (bigint, avval ko'paytirish, keyin bo'lish).
 * total <= 0 yoki part <= 0 bo'lsa natija 0n.
 * Natija hech qachon amount'dan katta emas.
 */
export function prorate(amount: bigint, part: bigint | number, total: bigint | number): bigint {
  if (amount <= 0n) return 0n;
  const p = typeof part === 'bigint' ? part : BigInt(part);
  const t = typeof total === 'bigint' ? total : BigInt(total);
  if (t <= 0n || p <= 0n) return 0n;
  if (p >= t) return amount;
  return (amount * p) / t;
}

/**
 * BR-3: 1 000 so'mga karrali qilib pastga yaxlitlash (o'quvchi foydasiga).
 */
export function roundDownToThousand(amount: bigint): bigint {
  if (amount <= 0n) return 0n;
  return (amount / 1000n) * 1000n;
}
