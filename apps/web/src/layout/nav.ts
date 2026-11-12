import type { Permission } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Home, MonitorSmartphone, type LucideIcon } from 'lucide-react';

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
  { screen: 'W-32', to: '/sessions', label: t.nav.sessions, icon: MonitorSmartphone },
];

/** Ruxsatga qarab menyu (UI faqat qulaylik — haqiqiy tekshiruv API'da). */
export const visibleNav = (
  permissions: ReadonlySet<string>,
  items: readonly NavItem[] = NAV,
): NavItem[] => items.filter((i) => !i.permission || permissions.has(i.permission));
