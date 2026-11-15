import { describe, expect, it } from 'vitest';
import { MOCK_LANDING_COURSES, MOCK_REPORT_REVENUE } from './mock-analytics.js';
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

  it('oylik: jami = ishlangan + qoʻshimcha − avans = qatorlar yigʻindisi', () => {
    for (const p of MOCK_PAYROLL_LIST) {
      expect(p.total).toBe(p.earned + p.extras - p.advances);
      expect(sum(p.lines.map((l) => l.amount))).toBe(p.total);
    }
    expect(sum(MOCK_PAYROLL_LIST.map((p) => p.total))).toBe(MOCK_PAYROLL_TOTAL);
  });

  it('hisobot: faqat markaz kurslari, tushum = oʻquvchilar × narx', () => {
    for (const r of MOCK_REPORT_REVENUE) {
      const price = PRICES[r.name];
      expect(price, r.name).toBeDefined();
      expect(r.revenue).toBe(BigInt(r.students) * (price ?? 0n));
    }
  });

  it('landing: kurs narxlari markaz narxlari bilan bir xil', () => {
    expect(MOCK_LANDING_COURSES.map((c) => c.pricePerMonth).sort()).toEqual(
      [550_000n, 650_000n].sort(),
    );
  });
});
