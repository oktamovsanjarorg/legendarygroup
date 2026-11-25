import { miniappMessages as t } from '@lg/i18n';
import type { SideNavGroup, TabItem } from '@lg/ui-tg';
import { useStaffKpi } from './data/staff.js';
import { type StaffMenuKey, staffMenuFor } from './data/staff-menu.js';
import { STAFF_ICONS } from './screens/staff/menu-icons.js';
import { useMe } from './session/session.js';
import { tabsFor } from './tabs.js';

const isStaff = (role: string) => role === 'admin' || role === 'director';

/**
 * Navigatsiya modeli (Q-113): pastki tablar va keng ekran yon paneli bir manbadan.
 * «Bugun» son belgisi — kutayotgan ishlar (chek navbati + Director so'rovlari).
 */
export function useNavModel(): { tabs: readonly TabItem[]; side: readonly SideNavGroup[] } {
  const me = useMe();
  const staff = isStaff(me.activeRole);
  const kpi = useStaffKpi(me.activeRole === 'director', staff);
  const tabs = tabsFor(me.activeRole, me.permissions);
  const counts: Partial<Record<StaffMenuKey, number>> = {
    queue: kpi.data?.queue,
    approvals: kpi.data?.approvals,
  };
  const waiting = (counts.queue ?? 0) + (counts.approvals ?? 0);
  const withBadge = tabs.map((x) =>
    x.to === '/' && staff && waiting > 0 ? { ...x, badge: waiting } : x,
  );
  if (!staff) return { tabs: withBadge, side: [{ key: 'main', items: withBadge }] };
  // Yon panelda hamma bo'lim ko'rinadi: «Menyu» tabi kerak emas.
  const main = withBadge.filter((x) => x.to !== '/staff/more');
  const groups = staffMenuFor(
    me.permissions,
    main.map((x) => x.to),
  ).map((g) => ({
    key: g.section,
    title: t.staffMore.sections[g.section],
    items: g.items.map((i) => ({
      to: i.to,
      label: t.staffMore.items[i.key],
      icon: STAFF_ICONS[i.key],
      badge: counts[i.key] || undefined,
    })),
  }));
  return { tabs: withBadge, side: [{ key: 'main', items: main }, ...groups] };
}
