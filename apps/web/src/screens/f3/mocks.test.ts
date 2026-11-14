import { describe, expect, it } from 'vitest';
import { MOCK_LANDING_COURSES, MOCK_REPORT_AGING, MOCK_REPORT_REVENUE } from './mock-analytics.js';
import {
  MOCK_EXPENSES,
  MOCK_EXPENSES_TOTAL,
  MOCK_PAYROLL_LIST,
  MOCK_PAYROLL_TOTAL,
  MOCK_PNL_MONTHS,
} from './mock-finance.js';

/**
 * Maket mock'lari o'zaro mos (docs/13 qoida 9): UI pulni hisoblamaydi, shuning uchun tayyor
 * yig'indilar mock'da to'g'ri bo'lishi shart — aks holda skrinshotlarda raqamlar zid ko'rinadi.
 */
const sum = (xs: readonly bigint[]) => xs.reduce((a, b) => a + b, 0n);
const PRICES: Record<string, bigint> = { Matematika: 550_000n, 'Ingliz tili (IELTS)': 650_000n };

describe('F3 mock maʼlumotlari', () => {
  it('xarajatlar: qatorlar yigʻindisi = jami', () => {
    expect(sum(MOCK_EXPENSES.map((e) => e.amount))).toBe(MOCK_EXPENSES_TOTAL);
  });

  it('P&L: tushum − xarajat = foyda, xarajat = oylik + operatsion, marja, tushum 72–80 mln', () => {
    for (const m of MOCK_PNL_MONTHS) {
      expect(m.totalExpenses).toBe(m.payroll + m.operational);
      expect(m.revenue - m.totalExpenses).toBe(m.netProfit);
      expect(m.marginPercent).toBe(Math.round(Number((m.netProfit * 1000n) / m.revenue) / 10));
      expect(m.revenue >= 72_000_000n && m.revenue <= 80_000_000n).toBe(true);
    }
  });

  it('oylik: jami = asosiy + bonus − avans; guruhlar boʻyicha yigʻindi = asosiy', () => {
    for (const p of MOCK_PAYROLL_LIST) {
      expect(p.total).toBe(p.baseAmount + p.bonus - p.advance);
      const parts = p.details.groupBreakdowns.map((g) => g.amount);
      if (parts.length > 0) expect(sum(parts)).toBe(p.baseAmount);
    }
    expect(sum(MOCK_PAYROLL_LIST.map((p) => p.total))).toBe(MOCK_PAYROLL_TOTAL);
  });

  it('hisobot: faqat markaz kurslari, tushum = oʻquvchilar × narx, ulush = 100%', () => {
    for (const r of MOCK_REPORT_REVENUE) {
      const price = PRICES[r.course];
      expect(price, r.course).toBeDefined();
      expect(r.revenue).toBe(BigInt(r.studentsCount) * (price ?? 0n));
    }
    const shares = (rows: readonly { sharePercent: number }[]) =>
      rows.reduce((a, r) => a + r.sharePercent, 0);
    expect(shares(MOCK_REPORT_REVENUE)).toBe(100);
    expect(shares(MOCK_REPORT_AGING)).toBe(100);
  });

  it('landing: kurs narxlari markaz narxlari bilan bir xil', () => {
    expect(MOCK_LANDING_COURSES.map((c) => c.pricePerMonth).sort()).toEqual(
      [550_000n, 650_000n].sort(),
    );
  });
});
