import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  aggregateExpensesByCategory,
  aggregateRevenueByMethod,
  calculateNetProfit,
  calculateProfitMarginBp,
} from './pnl.calculator.js';

describe('P&L Calculator (FR-FIN-2)', () => {
  it('sof foyda: revenue - expenses - payroll', () => {
    const net = calculateNetProfit(10_000_000n, 2_000_000n, 4_000_000n);
    expect(net).toBe(4_000_000n);

    // Zarar holati (manfiy natija)
    const loss = calculateNetProfit(5_000_000n, 3_000_000n, 4_000_000n);
    expect(loss).toBe(-2_000_000n);
  });

  it('marja: foiz bazis punktlarda (100% = 10000)', () => {
    expect(calculateProfitMarginBp(10_000_000n, 2_500_000n)).toBe(2500); // 25%
    expect(calculateProfitMarginBp(10_000_000n, -1_000_000n)).toBe(-1000); // -10%
    expect(calculateProfitMarginBp(0n, 100n)).toBe(0);
    expect(calculateProfitMarginBp(-100n, 100n)).toBe(0);
  });

  it('kategoriya boʻyicha yigʻish', () => {
    const items = [
      { category: 'rent', amount: 5_000_000n },
      { category: 'utilities', amount: 500_000n },
      { category: 'rent', amount: 1_000_000n },
      { category: 'marketing', amount: 2_000_000n },
    ];
    const grouped = aggregateExpensesByCategory(items);
    expect(grouped['rent']).toBe(6_000_000n);
    expect(grouped['utilities']).toBe(500_000n);
    expect(grouped['marketing']).toBe(2_000_000n);
  });

  it('toʻlov usuli boʻyicha yigʻish', () => {
    const items = [
      { method: 'cash', amount: 3_000_000n },
      { method: 'click', amount: 2_000_000n },
      { method: 'cash', amount: 1_500_000n },
    ];
    const grouped = aggregateRevenueByMethod(items);
    expect(grouped['cash']).toBe(4_500_000n);
    expect(grouped['click']).toBe(2_000_000n);
  });

  it('property-based: sof foyda qoʻshiluvchilar yigʻindisiga teng', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 1_000_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000_000n }),
        (rev, exp, pay) => {
          const net = calculateNetProfit(rev, exp, pay);
          expect(net + exp + pay).toBe(rev);
        },
      ),
    );
  });
});
