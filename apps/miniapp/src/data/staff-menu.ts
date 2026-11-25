/**
 * MS-06 Koʻproq (11-ux §2, T-130): xodim rejimidagi ekranlar katalogi. Har band — ruxsat
 * (02 matritsa) va yoʻl; tabda turgan ekran Koʻproq'da takrorlanmaydi. Yangi ekran (T-131…T-143)
 * shu roʻyxatga qoʻshiladi — qurilmagan ekran koʻrsatilmaydi.
 */
export type StaffSection = 'students' | 'money' | 'lessons' | 'comms' | 'director' | 'self';
export type StaffMenuKey =
  | 'newStudent'
  | 'leads'
  | 'linkRequests'
  | 'pay'
  | 'debtors'
  | 'payments'
  | 'discounts'
  | 'queue'
  | 'cash'
  | 'addExpense'
  | 'groups'
  | 'calendar'
  | 'attendance'
  | 'courses'
  | 'rooms'
  | 'holidays'
  | 'tickets'
  | 'announcements'
  | 'undelivered'
  | 'approvals'
  | 'finance'
  | 'payroll'
  | 'reports'
  | 'forecasts'
  | 'people'
  | 'settings'
  | 'audit'
  | 'help'
  | 'sessions';

export interface StaffMenuItem {
  key: StaffMenuKey;
  section: StaffSection;
  /** `null` — har xodimga. */
  permission: string | null;
  to: string;
}

export const STAFF_SECTIONS: readonly StaffSection[] = [
  'students',
  'money',
  'lessons',
  'comms',
  'director',
  'self',
];

export const STAFF_MENU: readonly StaffMenuItem[] = [
  { key: 'newStudent', section: 'students', permission: 'student.manage', to: '/staff/new' },
  { key: 'leads', section: 'students', permission: 'lead.manage', to: '/staff/leads' },
  {
    key: 'linkRequests',
    section: 'students',
    permission: 'student.manage',
    to: '/staff/link-requests',
  },
  { key: 'pay', section: 'money', permission: 'payment.create', to: '/staff/pay' },
  // `billing.view` ota-onada ham bor — markaz ro'yxati faqat xodimga (web W-15 bilan bir xil)
  { key: 'debtors', section: 'money', permission: 'payment.review', to: '/staff/debtors' },
  { key: 'payments', section: 'money', permission: 'payment.review', to: '/staff/payments' },
  { key: 'discounts', section: 'money', permission: 'discount.grant', to: '/staff/discounts' },
  { key: 'queue', section: 'money', permission: 'payment.review', to: '/staff/queue' },
  { key: 'cash', section: 'money', permission: 'cash.close', to: '/staff/cash' },
  {
    key: 'addExpense',
    section: 'money',
    permission: 'expense.manage',
    to: '/staff/expenses/new',
  },
  // `group.view` ustozda ham bor — xodim menyusi faqat Admin/Director tablari bilan ko'rinadi
  { key: 'groups', section: 'lessons', permission: 'group.view', to: '/staff/groups' },
  { key: 'calendar', section: 'lessons', permission: 'lesson.manage', to: '/staff/calendar' },
  {
    key: 'attendance',
    section: 'lessons',
    permission: 'attendance.edit_past',
    to: '/staff/attendance',
  },
  { key: 'courses', section: 'lessons', permission: 'course.manage', to: '/staff/courses' },
  { key: 'rooms', section: 'lessons', permission: 'course.manage', to: '/staff/rooms' },
  { key: 'holidays', section: 'lessons', permission: 'lesson.manage', to: '/staff/holidays' },
  { key: 'tickets', section: 'comms', permission: 'ticket.handle', to: '/staff/tickets' },
  {
    key: 'announcements',
    section: 'comms',
    permission: 'announcement.send',
    to: '/staff/announcements',
  },
  {
    key: 'undelivered',
    section: 'comms',
    permission: 'student.manage',
    to: '/staff/undelivered',
  },
  {
    key: 'approvals',
    section: 'director',
    permission: 'approval.decide',
    to: '/staff/approvals',
  },
  { key: 'finance', section: 'director', permission: 'finance.view', to: '/staff/finance' },
  { key: 'payroll', section: 'director', permission: 'payroll.manage', to: '/staff/payroll' },
  // `stats.operational` ustozda ham bor (scope bilan) — markaz hisobotlari faqat xodim menyusida
  { key: 'reports', section: 'director', permission: 'stats.operational', to: '/staff/reports' },
  {
    key: 'forecasts',
    section: 'director',
    permission: 'stats.operational',
    to: '/staff/forecasts',
  },
  { key: 'people', section: 'director', permission: 'staff.manage', to: '/staff/people' },
  { key: 'settings', section: 'director', permission: 'settings.manage', to: '/staff/settings' },
  { key: 'audit', section: 'director', permission: 'audit.view', to: '/staff/audit' },
  { key: 'help', section: 'self', permission: null, to: '/staff/help' },
  { key: 'sessions', section: 'self', permission: null, to: '/staff/sessions' },
];

/** Ruxsat bor va tabda yoʻq bandlar, boʻlimlar tartibida. */
export function staffMenuFor(
  permissions: Iterable<string>,
  tabPaths: readonly string[],
  menu: readonly StaffMenuItem[] = STAFF_MENU,
): { section: StaffSection; items: StaffMenuItem[] }[] {
  const has = new Set(permissions);
  const shown = menu.filter(
    (i) => (i.permission === null || has.has(i.permission)) && !tabPaths.includes(i.to),
  );
  return STAFF_SECTIONS.map((section) => ({
    section,
    items: shown.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0);
}
