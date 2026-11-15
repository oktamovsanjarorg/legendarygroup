import type { Permission } from '@lg/contracts';
import { miniappMessages as m, webMessages as t } from '@lg/i18n';
import {
  BadgePercent,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  CircleAlert,
  CheckCheck,
  Banknote,
  HandCoins,
  Home,
  Receipt,
  TrendingUp,
  Inbox,
  Link2,
  MessagesSquare,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserCog,
  Users,
  UsersRound,
  Wallet,
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
    screen: 'W-05',
    to: '/students',
    label: t.menu.students,
    icon: Users,
    permission: 'student.view',
  },
  {
    screen: 'W-33',
    to: '/link-requests',
    label: t.menu.linkRequests,
    icon: Link2,
    permission: 'student.manage',
  },
  { screen: 'W-08', to: '/leads', label: t.menu.leads, icon: Target, permission: 'lead.manage' },
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
  {
    screen: 'W-12',
    to: '/attendance',
    label: t.menu.attendance,
    icon: ClipboardCheck,
    permission: 'attendance.mark',
  },
  {
    screen: 'W-13',
    to: '/payments/new',
    label: t.payEntry.title,
    icon: Wallet,
    permission: 'payment.create',
  },
  {
    screen: 'W-14',
    to: '/payments/queue',
    label: t.queueWeb.title,
    icon: Inbox,
    permission: 'payment.review',
  },
  {
    screen: 'W-15',
    to: '/debtors',
    label: t.debtors.title,
    icon: CircleAlert,
    permission: 'payment.review',
  },
  {
    screen: 'W-18',
    to: '/discounts',
    label: t.discounts.title,
    icon: BadgePercent,
    permission: 'discount.grant',
  },
  { screen: 'W-16', to: '/cash', label: t.cash.title, icon: Banknote, permission: 'cash.close' },
  {
    screen: 'W-31',
    to: '/approvals',
    label: m.approvals.title,
    icon: CheckCheck,
    permission: 'approval.decide',
  },
  { screen: 'W-28', to: '/staff', label: t.menu.staff, icon: UserCog, permission: 'staff.manage' },
  {
    screen: 'W-23',
    to: '/expenses',
    label: t.expenses.title,
    icon: Receipt,
    permission: 'expense.manage',
  },
  {
    screen: 'W-25',
    to: '/payroll',
    label: t.payroll.title,
    icon: HandCoins,
    permission: 'payroll.manage',
  },
  { screen: 'W-24', to: '/pnl', label: t.pnl.title, icon: TrendingUp, permission: 'finance.view' },
  {
    screen: 'W-26',
    to: '/reports',
    label: t.reports.title,
    icon: ChartColumn,
    permission: 'stats.operational',
  },
  {
    screen: 'W-21',
    to: '/tickets',
    label: t.tickets.title,
    icon: MessagesSquare,
    permission: 'ticket.handle',
  },
  {
    screen: 'W-27',
    to: '/forecasts',
    label: t.forecasts.title,
    icon: Sparkles,
    permission: 'stats.operational',
  },
  {
    screen: 'W-30',
    to: '/audit',
    label: t.menu.audit,
    icon: ShieldCheck,
    permission: 'audit.view',
  },
  {
    screen: 'W-29',
    to: '/settings',
    label: t.menu.settings,
    icon: Settings,
    permission: 'settings.manage',
  },
  { screen: 'W-32', to: '/sessions', label: t.nav.sessions, icon: MonitorSmartphone },
];

/** Ruxsatga qarab menyu (UI faqat qulaylik — haqiqiy tekshiruv API'da). */
export const visibleNav = (
  permissions: ReadonlySet<string>,
  items: readonly NavItem[] = NAV,
): NavItem[] => items.filter((i) => !i.permission || permissions.has(i.permission));
