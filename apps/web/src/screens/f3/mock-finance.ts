import type { ExpenseItem, PayrollItem, PnlMonthRow } from './types.js';

export const MOCK_EXPENSES: readonly ExpenseItem[] = [
  {
    id: 'exp-1',
    date: '2026-11-01',
    category: 'rent',
    description: 'Bosh bino oylik ijara toʻlovi (noyabr)',
    amount: 8_000_000n,
    method: 'bank',
    receiptUrl: '/receipts/rent-nov.pdf',
    author: 'Sardor Aliyev (Direktor)',
  },
  {
    id: 'exp-2',
    date: '2026-11-03',
    category: 'marketing',
    description: 'Instagram va Telegram target reklamasi',
    amount: 2_500_000n,
    method: 'card',
    receiptUrl: '/receipts/target-nov.jpg',
    author: 'Malika Karimova (Admin)',
  },
  {
    id: 'exp-3',
    date: '2026-11-05',
    category: 'utilities',
    description: 'Elektr energiyasi va internet provayder',
    amount: 1_300_000n,
    method: 'bank',
    receiptUrl: '/receipts/utilities-nov.pdf',
    author: 'Malika Karimova (Admin)',
  },
  {
    id: 'exp-4',
    date: '2026-11-08',
    category: 'supplies',
    description: 'Ofis qogʻozi va oʻquv materiallari bosmasi',
    amount: 700_000n,
    method: 'cash',
    receiptUrl: '/receipts/supplies-nov.jpg',
    author: 'Aziz Rahimov (Ustoz)',
  },
];

/** UI pul hisoblamaydi — mock'da tayyor yig'indi. */
export const MOCK_EXPENSES_TOTAL = 12_500_000n;

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

export const MOCK_PAYROLL_LIST: readonly PayrollItem[] = [
  {
    id: 'pay-1',
    staffName: 'Aziz Rahimov',
    role: 'Katta matematika ustozi',
    contractType: 'percent',
    baseAmount: 18_400_000n,
    bonus: 2_000_000n,
    advance: 3_000_000n,
    total: 17_400_000n,
    status: 'paid',
    details: {
      lessonsCount: 48,
      studentsCount: 36,
      formula: 'Guruh toʻlovlaridan 40%',
      groupBreakdowns: [
        { group: 'Algebra-101', amount: 9_200_000n },
        { group: 'Geometriya-201', amount: 9_200_000n },
      ],
    },
  },
  {
    id: 'pay-2',
    staffName: 'Jamshid Qodirov',
    role: 'Matematika ustozi',
    contractType: 'mixed',
    baseAmount: 7_000_000n,
    bonus: 1_000_000n,
    advance: 0n,
    total: 8_000_000n,
    status: 'approved',
    details: {
      lessonsCount: 32,
      studentsCount: 22,
      formula: '2 000 000 fiks + 25% foiz',
      groupBreakdowns: [{ group: 'Matematika-102', amount: 7_000_000n }],
    },
  },
  {
    id: 'pay-3',
    staffName: 'Malika Karimova',
    role: 'Bosh administrator',
    contractType: 'fixed',
    baseAmount: 8_000_000n,
    bonus: 1_000_000n,
    advance: 1_000_000n,
    total: 8_000_000n,
    status: 'draft',
    details: {
      lessonsCount: 0,
      studentsCount: 0,
      formula: 'Qatʼiy oylik stavka',
      groupBreakdowns: [],
    },
  },
];

/** UI pul hisoblamaydi — mock'da tayyor yig'indi. */
export const MOCK_PAYROLL_TOTAL = 33_400_000n;
