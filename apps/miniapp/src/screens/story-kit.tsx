import { errorMessages, miniappMessages as t } from '@lg/i18n';
import {
  ErrorState,
  ForbiddenState,
  LoadingState,
  OfflineBanner,
  TabBar,
  type TabItem,
} from '@lg/ui-tg';
import { CalendarCheck, CalendarDays, UserRound, Users } from 'lucide-react';
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

/** Tab ildiz ekrani: pastda Ustoz menyusi. */
export function TabRoot({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="pb-20">
      {children}
      <TabBar items={TEACHER_TABS} active={active} onSelect={() => undefined} />
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
