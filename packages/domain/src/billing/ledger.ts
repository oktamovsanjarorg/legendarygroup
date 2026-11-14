/**
 * BR-20: Ledger yig'indisi va balans hisobi.
 *
 * Ishora qoidasi (05-data-model.md ledger_entries):
 * - amount > 0: o'quvchi qarzi oshadi (invoice, jarima, refund);
 * - amount < 0: qarz kamayadi (to'lov, chegirma, kredit);
 * - Σ amount > 0 -> qarz;
 * - Σ amount < 0 -> avans;
 * - UI'da ota-onaga "Balans" = -Σ amount (hisobida pul bor bo'lsa musbat).
 */

export interface StudentBalanceSummary {
  /** Ledger sof yig'indisi: musbat bo'lsa qarz, manfiy bo'lsa avans. */
  ledgerNet: bigint;
  /** Qarz summasi (>= 0n). */
  debt: bigint;
  /** Avans summasi (>= 0n). */
  advance: bigint;
  /** Ota-ona ko'radigan balans: -ledgerNet (musbat = puli bor, manfiy = qarzdor). */
  displayBalance: bigint;
}

/**
 * Barcha ledger yozuvlari yig'indisini hisoblaydi.
 */
export function computeLedgerNet(entries: readonly { amount: bigint }[]): bigint {
  let sum = 0n;
  for (const e of entries) {
    sum += e.amount;
  }
  return sum;
}

/**
 * BR-20: O'quvchi balansi xulosasini hisoblaydi.
 */
export function computeStudentBalance(
  entries: readonly { amount: bigint }[],
): StudentBalanceSummary {
  const ledgerNet = computeLedgerNet(entries);
  const debt = ledgerNet > 0n ? ledgerNet : 0n;
  const advance = ledgerNet < 0n ? -ledgerNet : 0n;
  const displayBalance = -ledgerNet;

  return {
    ledgerNet,
    debt,
    advance,
    displayBalance,
  };
}

/**
 * BR-22: Kritik qarzdorlik tekshiruvi:
 * Qarz >= 1 oylik narx va to'lov muddatidan >= 14 kun o'tsa — kritik.
 */
export function isDebtCritical(params: {
  debt: bigint;
  monthlyPrice: bigint;
  overdueDays: number;
  criticalDaysThreshold?: number; // standart 14
}): boolean {
  const { debt, monthlyPrice, overdueDays } = params;
  const thresholdDays = params.criticalDaysThreshold ?? 14;

  if (monthlyPrice <= 0n || debt <= 0n) return false;
  return debt >= monthlyPrice && overdueDays >= thresholdDays;
}
