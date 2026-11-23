/**
 * MS-06 Koʻproq (11-ux §2, T-130): xodim rejimidagi ekranlar katalogi. Har band — ruxsat
 * (02 matritsa) va yoʻl; tabda turgan ekran Koʻproq'da takrorlanmaydi. Yangi ekran (T-131…T-143)
 * shu roʻyxatga qoʻshiladi — qurilmagan ekran koʻrsatilmaydi.
 */
export type StaffSection = 'students' | 'money' | 'lessons' | 'comms' | 'director';
export type StaffMenuKey = 'newStudent' | 'pay' | 'queue' | 'approvals';

export interface StaffMenuItem {
  key: StaffMenuKey;
  section: StaffSection;
  permission: string;
  to: string;
}

export const STAFF_SECTIONS: readonly StaffSection[] = [
  'students',
  'money',
  'lessons',
  'comms',
  'director',
];

export const STAFF_MENU: readonly StaffMenuItem[] = [
  { key: 'newStudent', section: 'students', permission: 'student.manage', to: '/staff/new' },
  { key: 'pay', section: 'money', permission: 'payment.create', to: '/staff/pay' },
  { key: 'queue', section: 'money', permission: 'payment.review', to: '/staff/queue' },
  {
    key: 'approvals',
    section: 'director',
    permission: 'approval.decide',
    to: '/staff/approvals',
  },
];

/** Ruxsat bor va tabda yoʻq bandlar, boʻlimlar tartibida. */
export function staffMenuFor(
  permissions: Iterable<string>,
  tabPaths: readonly string[],
  menu: readonly StaffMenuItem[] = STAFF_MENU,
): { section: StaffSection; items: StaffMenuItem[] }[] {
  const has = new Set(permissions);
  const shown = menu.filter((i) => has.has(i.permission) && !tabPaths.includes(i.to));
  return STAFF_SECTIONS.map((section) => ({
    section,
    items: shown.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0);
}
