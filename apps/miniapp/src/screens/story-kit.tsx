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
  Ellipsis,
  House,
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
