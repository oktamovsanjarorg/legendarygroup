import type { Permission } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import {
  BookOpen,
  CalendarDays,
  Home,
  MonitorSmartphone,
  UserCog,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** docs/ux/screens.md ekran ID'si. */
  screen: string;
  to: string;
  label: string;
  icon: LucideIcon;
  /** Ko'rinish uchun kerakli ruxsat; yo'q — har kirgan xodimga. */
  permission?: Permission;
}

/**
 * Chap menyu (11-ux §2). Faqat **qurilgan** ekranlar — har yangi ekran vazifasi shu ro'yxatga
 * qo'shadi (W-05 O'quvchilar — T-105, W-13 To'lov kiritish — T-204 ...). Bo'sh "tez orada" sahifa yo'q.
 */
export const NAV: readonly NavItem[] = [
  { screen: 'W-04', to: '/', label: t.nav.home, icon: Home },
  {
    screen: 'W-09',
    to: '/courses',
    label: t.menu.courses,
    icon: BookOpen,
    permission: 'course.manage',
  },
  {
    screen: 'W-10',
    to: '/groups',
    label: t.menu.groups,
    icon: UsersRound,
    permission: 'group.view',
  },
  {
    screen: 'W-11',
    to: '/calendar',
    label: t.menu.calendar,
    icon: CalendarDays,
    permission: 'group.view',
  },
  { screen: 'W-28', to: '/staff', label: t.menu.staff, icon: UserCog, permission: 'staff.manage' },
  { screen: 'W-32', to: '/sessions', label: t.nav.sessions, icon: MonitorSmartphone },
];

/** Ruxsatga qarab menyu (UI faqat qulaylik — haqiqiy tekshiruv API'da). */
export const visibleNav = (
  permissions: ReadonlySet<string>,
  items: readonly NavItem[] = NAV,
): NavItem[] => items.filter((i) => !i.permission || permissions.has(i.permission));
