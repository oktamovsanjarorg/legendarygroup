import { errorMessages, miniappMessages as t } from '@lg/i18n';
import {
  ErrorState,
  ForbiddenState,
  LoadingState,
  OfflineBanner,
  TabBar,
  type TabItem,
} from '@lg/ui-tg';
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
import type { ReactNode } from 'react';

/**
 * Maket (T-017c) yordamchilari: har ekranning 5 holati (11-ux §4.6) bir xil ko'rinishda.
 * Faqat Storybook uchun — ilova kodi bularni import qilmaydi.
 */
export const TEACHER_TABS: TabItem[] = [
  { screen: 'MT-01', to: '/', label: t.tabs.today, icon: CalendarCheck },
  { screen: 'MT-04', to: '/groups', label: t.tabs.groups, icon: Users },
  { screen: 'MT-09', to: '/schedule', label: t.tabs.schedule, icon: CalendarDays },
  { screen: 'MT-11', to: '/profile', label: t.tabs.profile, icon: UserRound },
];

export const GUARDIAN_TABS: TabItem[] = [
  { screen: 'MG-01', to: '/', label: t.gtabs.home, icon: House },
  { screen: 'MG-02', to: '/results', label: t.gtabs.results, icon: BarChart3 },
  { screen: 'MG-05', to: '/payments', label: t.gtabs.payments, icon: Wallet },
  { screen: 'MG-11', to: '/more', label: t.gtabs.more, icon: Ellipsis },
];

export const STUDENT_TABS: TabItem[] = [
  { screen: 'M-STU-01', to: '/', label: t.tabs.today, icon: CalendarCheck },
  { screen: 'M-STU-02', to: '/schedule', label: t.tabs.schedule, icon: CalendarDays },
  { screen: 'M-STU-03', to: '/results', label: t.gtabs.results, icon: BarChart3 },
  { screen: 'M-STU-04', to: '/profile', label: t.tabs.profile, icon: UserRound },
];

/** Xodim rejimi (Q-113): «Bugun»da kutayotgan ishlar soni. */
export const STAFF_TABS: TabItem[] = [
  { screen: 'MS-01', to: '/', label: t.stabs.today, icon: CalendarCheck, badge: 2 },
  { screen: 'MS-04', to: '/search', label: t.stabs.students, icon: Users },
  { screen: 'MS-19', to: '/finance', label: t.stabs.finance, icon: ChartLine },
  { screen: 'MS-06', to: '/more', label: t.stabs.menu, icon: LayoutGrid },
];

/** Tab ildiz ekrani: pastda rol menyusi (standart — Ustoz). */
export function TabRoot({
  active,
  tabs = TEACHER_TABS,
  children,
}: {
  active: string;
  tabs?: TabItem[];
  children: ReactNode;
}) {
  return (
    <div className="pb-20">
      {children}
      <TabBar items={tabs} active={active} onSelect={() => undefined} />
    </div>
  );
}

const noop = () => undefined;

/** Mock massiv elementi (noUncheckedIndexedAccess): yo'q bo'lsa — darhol xato. */
export function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("mock ma'lumot yo'q");
  return v;
}

export const stateStories = {
  Loading: { render: () => <LoadingState /> },
  Error: {
    render: () => (
      <ErrorState message={errorMessages.HTTP_ERROR} requestId="req_7c41e0" onRetry={noop} />
    ),
  },
  Forbidden: { render: () => <ForbiddenState onHome={noop} /> },
};

/** Offline: chiziq + keshdagi ma'lumot. */
export function OfflineFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
