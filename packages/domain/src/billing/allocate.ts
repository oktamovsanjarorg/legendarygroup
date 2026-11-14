/** Ochiq (to'lanmagan qismi bor) invoice qatori. */
export interface OpenItem {
  id: string;
  /** To'lov muddati `YYYY-MM-DD` (Toshkent) — tartiblash uchun. */
  dueDate: string;
  /** To'lanmagan qoldiq, so'm; > 0. */
  outstanding: bigint;
}

export interface Allocation {
  /** Eng eskidan boshlab; faqat summa > 0 bo'lgan qatorlar. */
  parts: readonly { id: string; amount: bigint }[];
  /** Qarzdan ortgani — o'quvchi balansiga (avans). */
  advance: bigint;
}

const byAge = (a: OpenItem, b: OpenItem): number =>
  a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * BR-12: to'lov avval eng eski ochiq qarzga taqsimlanadi (FIFO); ortiqchasi — avans.
 * Faqat `bigint` (CLAUDE.md "Pul"). Teng muddatlilar — `id` bo'yicha (deterministik).
 */
export function allocateFifo(amount: bigint, items: readonly OpenItem[]): Allocation {
  if (amount <= 0n) throw new RangeError('allocateFifo: summa musbat boʻlishi shart');
  if (items.some((i) => i.outstanding <= 0n))
    throw new RangeError('allocateFifo: ochiq qoldiq musbat boʻlishi shart');
  let left = amount;
  const parts: { id: string; amount: bigint }[] = [];
  for (const item of [...items].sort(byAge)) {
    if (left === 0n) break;
    const take = left < item.outstanding ? left : item.outstanding;
    parts.push({ id: item.id, amount: take });
    left -= take;
  }
  return { parts, advance: left };
}
