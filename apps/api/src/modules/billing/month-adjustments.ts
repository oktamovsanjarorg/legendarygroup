import type { MonthAdjustment } from './month-close.service.js';

export interface PreparedLine {
  enrollmentId: string;
  /** Qator summasi (o'qishda — kreditdan keyingi net). */
  amount: bigint;
  description: string;
  kind: 'tuition' | 'penalty';
  /** BR-5/9 kredit: ledger'da `invoice` (+brutto) va `credit` (−kredit) alohida. */
  credit?: bigint;
}

const min = (a: bigint, b: bigint) => (a < b ? a : b);

function withCredit(l: PreparedLine, available: bigint, note: string | null): PreparedLine {
  const credit = min(available, l.amount);
  if (credit <= 0n || l.kind !== 'tuition') return l;
  return {
    ...l,
    amount: l.amount - credit,
    credit: (l.credit ?? 0n) + credit,
    description: `${l.description}; kredit −${credit} (${note ?? ''})`,
  };
}

/**
 * BR-2: o'tgan oy yopilishi tuzatishlarini yangi oy qatorlariga qo'llash (manfiy qator yo'q).
 * Kredit avval o'sha a'zolik qatoridan; ortgani (yoki a'zolik ko'chirilgan bo'lsa — Q-103)
 * o'quvchining boshqa o'qish qatorlaridan ayriladi.
 */
export function applyAdjustments(
  lines: PreparedLine[],
  adj: readonly MonthAdjustment[],
): PreparedLine[] {
  const out = [...lines];
  for (const a of adj) {
    let left = a.credit;
    const own = out.findIndex((l) => l.enrollmentId === a.enrollmentId);
    const order = [own, ...out.keys()].filter((i, n, all) => i >= 0 && all.indexOf(i) === n);
    for (const i of order) {
      const line = out[i];
      if (!line || left <= 0n) continue;
      out[i] = withCredit(line, left, a.creditNote);
      left -= line.amount - (out[i]?.amount ?? line.amount);
    }
  }
  const penalties = adj
    .filter((a) => a.penalty > 0n)
    .map((a) => ({
      enrollmentId: a.enrollmentId,
      amount: a.penalty,
      kind: 'penalty' as const,
      description: `Jarima: ${a.penaltyNote ?? ''}`,
    }));
  return [...out, ...penalties];
}
