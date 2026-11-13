import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import type { TabItem } from '@lg/ui-tg';
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Ellipsis,
  House,
  Receipt,
  Search,
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

const ADMIN_TABS: readonly TabItem[] = [
  { screen: 'MS-01', to: '/', label: t.stabs.today, icon: CalendarCheck },
  { screen: 'MS-02', to: '/staff/queue', label: t.stabs.queue, icon: Receipt },
  { screen: 'MS-04', to: '/staff/search', label: t.stabs.search, icon: Search },
];

const DIRECTOR_TABS: readonly TabItem[] = [
  { screen: 'MS-01', to: '/', label: t.stabs.today, icon: CalendarCheck },
  { screen: 'MS-02', to: '/staff/queue', label: t.stabs.queue, icon: Receipt },
  { screen: 'MS-03', to: '/staff/approvals', label: t.stabs.approvals, icon: ClipboardCheck },
  { screen: 'MS-04', to: '/staff/search', label: t.stabs.search, icon: Search },
];

/**
 * Pastki menyu rolga qarab (11-ux §2: Ustoz — Bugun/Guruhlarim/Jadval/Profil; Ota-ona —
 * Asosiy/Natijalar/To'lovlar/Ko'proq; xodim — Bugun/Navbat/So'rovlar/Qidiruv).
 */
export const TABS: Readonly<Record<RoleCode, readonly TabItem[]>> = {
  director: DIRECTOR_TABS,
  admin: ADMIN_TABS,
  teacher: TEACHER_TABS,
  guardian: GUARDIAN_TABS,
};

export const tabsFor = (
  role: RoleCode,
  table: Readonly<Record<RoleCode, readonly TabItem[]>> = TABS,
): readonly TabItem[] => (table[role]?.length >= 2 ? table[role] : []);
