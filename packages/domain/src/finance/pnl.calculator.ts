/**
 * P&L (Foyda va zarar) hisoblash domeni — FR-FIN-2.
 * Hamma pul hisob-kitoblari butun so'mda (bigint), marjalar bazis punktlarda (int).
 */

export interface ExpenseItemLike {
  category: string;
  amount: bigint;
}

export interface PaymentItemLike {
  method: string;
  amount: bigint;
}

/**
 * Oylik sof foyda: Tushum − Xarajatlar − Oyliklar.
 */
export function calculateNetProfit(revenue: bigint, expenses: bigint, payroll: bigint): bigint {
  return revenue - expenses - payroll;
}

/**
 * Foyda marjasi (Profit Margin) bazis punktlarda (100% = 10000 bp).
 * Agar tushum nol yoki manfiy bo'lsa, marja 0 bp deb hisoblanadi.
 */
export function calculateProfitMarginBp(revenue: bigint, netProfit: bigint): number {
  if (revenue <= 0n) return 0;
  return Number((netProfit * 10000n) / revenue);
}

/**
 * Xarajatlarni kategoriya bo'yicha guruhlab yig'ish.
 */
export function aggregateExpensesByCategory(
  items: readonly ExpenseItemLike[],
): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  for (const item of items) {
    result[item.category] = (result[item.category] ?? 0n) + item.amount;
  }
  return result;
}

/**
 * Tushumni to'lov usuli bo'yicha guruhlab yig'ish.
 */
export function aggregateRevenueByMethod(
  items: readonly PaymentItemLike[],
): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  for (const item of items) {
    result[item.method] = (result[item.method] ?? 0n) + item.amount;
  }
  return result;
}
