import { webMessages as t } from '@lg/i18n';
import { Button, cn, OfflineBanner } from '@lg/ui-web';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ShellNavItem {
  screen: string;
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface Props {
  nav: readonly ShellNavItem[];
  active: string;
  user: { name: string; role: string };
  offline: boolean;
  onLogout: () => void;
  /** Haqiqiy ilovada — router `Link`; maketda — oddiy havola. */
  renderLink: (item: ShellNavItem, className: string, children: ReactNode) => ReactNode;
  children: ReactNode;
}

const linkClass =
  'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-text hover:bg-surface';

/** Web panel qobig'i (11-ux §2): chap menyu (ruxsatga qarab), foydalanuvchi, offline chizig'i. */
export function AppShell({ nav, active, user, offline, onLogout, renderLink, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      {offline && <OfflineBanner />}
      <div className="flex flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-bg p-4">
          <p className="mb-6 px-2 text-sm font-semibold text-text">Legendary Group</p>
          <nav className="flex flex-1 flex-col gap-0.5" aria-label={t.nav.home}>
            {nav.map((item) =>
              renderLink(
                item,
                cn(linkClass, item.to === active && 'bg-surface font-semibold'),
                <>
                  <item.icon className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-danger px-1.5 text-xs font-semibold tabular-nums text-primary-text">
                      {item.badge}
                    </span>
                  ) : null}
                </>,
              ),
            )}
          </nav>
          <div className="border-t border-border pt-4">
            <p className="px-2 text-sm font-medium text-text">{user.name}</p>
            <p className="px-2 text-xs text-text-muted">
              {t.nav.role}: {user.role}
            </p>
            <Button variant="ghost" className="mt-2 w-full justify-start" onClick={onLogout}>
              <LogOut className="size-4" aria-hidden />
              {t.nav.logout}
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
