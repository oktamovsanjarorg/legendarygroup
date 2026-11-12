import { errorMessages, webMessages as t } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState, PageHeader } from '@lg/ui-web';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Home,
  Link2,
  Settings,
  ShieldCheck,
  Target,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AppShell, type ShellNavItem } from '../layout/app-shell.js';

/**
 * Maket (T-017c) uchun to'liq chap menyu — 11-ux §2 tartibida. Haqiqiy ilovada `nav.ts`
 * faqat qurilgan ekranlarni ko'rsatadi; bu ro'yxat — yakuniy ko'rinish.
 */
export const FULL_NAV: ShellNavItem[] = [
  { screen: 'W-04', to: '/', label: t.menu.home, icon: Home },
  { screen: 'W-05', to: '/students', label: t.menu.students, icon: Users },
  { screen: 'W-07', to: '/link-requests', label: t.menu.linkRequests, icon: Link2, badge: 2 },
  { screen: 'W-08', to: '/leads', label: t.menu.leads, icon: Target },
  { screen: 'W-09', to: '/courses', label: t.menu.courses, icon: BookOpen },
  { screen: 'W-10', to: '/groups', label: t.menu.groups, icon: UsersRound },
  { screen: 'W-11', to: '/calendar', label: t.menu.calendar, icon: CalendarDays },
  { screen: 'W-12', to: '/attendance', label: t.menu.attendance, icon: ClipboardCheck },
  { screen: 'W-13', to: '/payments', label: t.menu.payments, icon: Wallet, badge: 3 },
  { screen: 'W-23', to: '/finance', label: t.menu.finance, icon: WalletCards },
  { screen: 'W-26', to: '/reports', label: t.menu.reports, icon: BarChart3 },
  { screen: 'W-28', to: '/staff', label: t.menu.staff, icon: UserCog },
  { screen: 'W-29', to: '/settings', label: t.menu.settings, icon: Settings },
  { screen: 'W-30', to: '/audit', label: t.menu.audit, icon: ShieldCheck },
];

/** Web ekran ramkasi: haqiqiy `AppShell` (maket = ilova). */
export function WebFrame({
  active,
  offline = false,
  children,
}: {
  active: string;
  offline?: boolean;
  children: ReactNode;
}) {
  return (
    <AppShell
      nav={FULL_NAV}
      active={active}
      user={{ name: 'Bosh Direktor', role: t.roles.director }}
      offline={offline}
      onLogout={() => undefined}
      renderLink={(item, className, children) => (
        <a key={item.screen} href={`#${item.to}`} className={className}>
          {children}
        </a>
      )}
    >
      {children}
    </AppShell>
  );
}

const noop = () => undefined;

/** 5 holatning umumiylari (sahifa sarlavhasi bilan). */
export const webStates = (active: string, title: string) => ({
  Loading: {
    render: () => (
      <WebFrame active={active}>
        <PageHeader title={title} />
        <LoadingState rows={6} />
      </WebFrame>
    ),
  },
  Error: {
    render: () => (
      <WebFrame active={active}>
        <PageHeader title={title} />
        <ErrorState message={errorMessages.HTTP_ERROR} requestId="req_9a1f3c" onRetry={noop} />
      </WebFrame>
    ),
  },
  Forbidden: {
    render: () => (
      <WebFrame active={active}>
        <ForbiddenState onHome={noop} />
      </WebFrame>
    ),
  },
});

export function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("mock ma'lumot yo'q");
  return v;
}
