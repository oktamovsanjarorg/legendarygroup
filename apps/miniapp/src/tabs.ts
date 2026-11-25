import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import type { TabItem } from '@lg/ui-tg';
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChartLine,
  Ellipsis,
  House,
  LayoutGrid,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

const TEACHER_TABS: readonly TabItem[] = [
  { screen: 'MT-01', to: '/', label: t.tabs.today, icon: CalendarCheck },
  { screen: 'MT-03', to: '/groups', label: t.tabs.groups, icon: Users },
  { screen: 'MT-05', to: '/schedule', label: t.tabs.schedule, icon: CalendarDays },
  { screen: 'MT-08', to: '/profile', label: t.tabs.profile, icon: UserRound },
];

const GUARDIAN_TABS: readonly TabItem[] = [
  { screen: 'MG-01', to: '/', label: t.gtabs.home, icon: House },
  { screen: 'MG-03', to: '/results', label: t.gtabs.results, icon: BarChart3 },
  { screen: 'MG-04', to: '/payments', label: t.gtabs.payments, icon: Wallet },
  { screen: 'MG-08', to: '/more', label: t.gtabs.more, icon: Ellipsis },
];

/** Ildizda ruxsati bo'lmagan tab ko'rsatilmaydi (masalan, `payment.create`siz Admin). */
export type RoleTab = TabItem & { permission?: string };

/**
 * Admin (Q-113): eng ko'p ishlatiladigan — o'quvchi topish va to'lov kiritish. Chek navbati va
 * so'rovlar «Bugun»da kutayotgan ishlar sifatida (son belgisi bilan).
 */
const ADMIN_TABS: readonly RoleTab[] = [
  { screen: 'MS-01', to: '/', label: t.stabs.today, icon: CalendarCheck },
  { screen: 'MS-04', to: '/staff/search', label: t.stabs.students, icon: Users },
  {
    screen: 'MS-07',
    to: '/staff/pay',
    label: t.stabs.pay,
    icon: Wallet,
    permission: 'payment.create',
  },
  { screen: 'MS-06', to: '/staff/more', label: t.stabs.menu, icon: LayoutGrid },
];

/** Director (Q-113): bosh sahifa, o'quvchilar, moliya, menyu. */
const DIRECTOR_TABS: readonly RoleTab[] = [
  { screen: 'MS-01', to: '/', label: t.stabs.today, icon: CalendarCheck },
  { screen: 'MS-04', to: '/staff/search', label: t.stabs.students, icon: Users },
  {
    screen: 'MS-19',
    to: '/staff/finance',
    label: t.stabs.finance,
    icon: ChartLine,
    permission: 'finance.view',
  },
  { screen: 'MS-06', to: '/staff/more', label: t.stabs.menu, icon: LayoutGrid },
];

const STUDENT_TABS: readonly TabItem[] = [
  { screen: 'M-STU-01', to: '/', label: t.tabs.today, icon: CalendarCheck },
  { screen: 'M-STU-02', to: '/schedule', label: t.tabs.schedule, icon: CalendarDays },
  { screen: 'M-STU-03', to: '/results', label: t.gtabs.results, icon: BarChart3 },
  { screen: 'M-STU-04', to: '/profile', label: t.tabs.profile, icon: UserRound },
];

/**
 * Pastki menyu rolga qarab (11-ux §2, Q-113): Ustoz — Bugun/Guruhlarim/Jadval/Profil; Ota-ona —
 * Asosiy/Natijalar/To'lovlar/Ko'proq; Admin — Bugun/O'quvchilar/To'lov/Menyu; Director —
 * Bugun/O'quvchilar/Moliya/Menyu; O'quvchi — Bugun/Jadval/Natijalar/Profil.
 */
export const TABS: Readonly<Record<RoleCode, readonly RoleTab[]>> = {
  director: DIRECTOR_TABS,
  admin: ADMIN_TABS,
  teacher: TEACHER_TABS,
  guardian: GUARDIAN_TABS,
  student: STUDENT_TABS,
};

export const tabsFor = (
  role: RoleCode,
  permissions: readonly string[] = [],
  table: Readonly<Record<RoleCode, readonly RoleTab[]>> = TABS,
): readonly RoleTab[] => {
  const list = (table[role] ?? []).filter(
    (x) => !x.permission || permissions.includes(x.permission),
  );
  return list.length >= 2 ? list : [];
};
