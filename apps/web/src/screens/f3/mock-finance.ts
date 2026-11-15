import type { ExpenseItem, PayrollRow, PnlMonthRow } from './types.js';
import { at } from './mock-time.js';

export const MOCK_EXPENSES: readonly ExpenseItem[] = [
  {
    id: 'exp-1',
    date: at('2026-11-01'),
    category: 'rent',
    description: 'Bosh bino oylik ijara toʻlovi (noyabr)',
    amount: 8_000_000n,
    hasReceipt: true,
    author: 'Sardor Aliyev (Direktor)',
  },
  {
    id: 'exp-2',
    date: at('2026-11-03'),
    category: 'marketing',
    description: 'Instagram va Telegram target reklamasi',
    amount: 2_500_000n,
    hasReceipt: true,
    author: 'Malika Karimova (Admin)',
  },
  {
    id: 'exp-3',
    date: at('2026-11-05'),
    category: 'utilities',
    description: 'Elektr energiyasi va internet provayder',
    amount: 1_300_000n,
    hasReceipt: true,
    author: 'Malika Karimova (Admin)',
  },
  {
    id: 'exp-4',
    date: at('2026-11-08'),
    category: 'supplies',
    description: 'Ofis qogʻozi va oʻquv materiallari bosmasi',
    amount: 700_000n,
    hasReceipt: true,
    author: 'Aziz Rahimov (Ustoz)',
  },
];

/** UI pul hisoblamaydi — mock'da tayyor yig'indi. */
export const MOCK_EXPENSES_TOTAL = 12_500_000n;
/** O'tgan oyga nisbatan o'sish: 12 020 000 → 12 500 000 (+4%, KPI delta bilan mos). */
export const MOCK_EXPENSES_MONTH_DELTA = 480_000n;

// P&L: tushum ~72-80 mln (W-04 bilan mos), revenue - totalExpenses = netProfit, totalExpenses = payroll + operational
export const MOCK_PNL_MONTHS: readonly PnlMonthRow[] = [
  {
    month: '2026-08',
    revenue: 72_000_000n,
    payroll: 32_000_000n,
    operational: 14_000_000n,
    totalExpenses: 46_000_000n,
    netProfit: 26_000_000n,
    marginPercent: 36,
  },
  {
    month: '2026-09',
    revenue: 75_000_000n,
    payroll: 33_000_000n,
    operational: 15_000_000n,
    totalExpenses: 48_000_000n,
    netProfit: 27_000_000n,
    marginPercent: 36,
  },
  {
    month: '2026-10',
    revenue: 78_650_000n,
    payroll: 34_500_000n,
    operational: 15_500_000n,
    totalExpenses: 50_000_000n,
    netProfit: 28_650_000n,
    marginPercent: 36,
  },
];

export const MOCK_PAYROLL_LIST: readonly PayrollRow[] = [
  {
    id: 'pay-1',
    staffName: 'Aziz Rahimov',
    earned: 18_400_000n,
    extras: 2_000_000n,
    advances: 3_000_000n,
    total: 17_400_000n,
    lines: [
      { kind: 'percent', amount: 18_400_000n, note: 'Guruh toʻlovlaridan 40%' },
      { kind: 'bonus', amount: 2_000_000n, note: 'Olimpiada natijasi' },
      { kind: 'advance', amount: -3_000_000n, note: 'Avans ushlab qolindi' },
    ],
  },
  {
    id: 'pay-2',
    staffName: 'Jamshid Qodirov',
    earned: 7_000_000n,
    extras: 1_000_000n,
    advances: 0n,
    total: 8_000_000n,
    lines: [
      { kind: 'fixed', amount: 5_000_000n, note: null },
      { kind: 'percent', amount: 2_000_000n, note: null },
      { kind: 'bonus', amount: 1_000_000n, note: null },
    ],
  },
];

export const MOCK_PAYROLL_TOTAL = 25_400_000n;
