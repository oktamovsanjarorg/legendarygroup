import { webMessages as t } from '@lg/i18n';
import { Button, LoadingState, OfflineBanner, cn } from '@lg/ui-web';
import { Link, Navigate, Outlet } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth.js';
import { visibleNav } from './nav.js';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Himoyalangan qism: kirmagan bo'lsa — W-01; chap menyu ruxsatga qarab (11-ux §2). */
export function AppLayout() {
  const { status, me, permissions, signOut } = useAuth();
  const online = useOnline();
  if (status === 'loading')
    return (
      <div className="p-8">
        <LoadingState />
      </div>
    );
  if (status === 'anonymous' || !me) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen flex-col">
      {!online && <OfflineBanner />}
      <div className="flex flex-1">
        <aside className="flex w-64 flex-col border-r border-border bg-bg p-4">
          <p className="mb-6 px-2 text-sm font-semibold text-text">Legendary Group</p>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Asosiy menyu">
            {visibleNav(permissions).map((item) => (
              <Link
                key={item.screen}
                to={item.to}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-text hover:bg-surface',
                )}
                activeProps={{ className: 'bg-surface font-semibold' }}
                activeOptions={{ exact: true }}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border pt-4">
            <p className="px-2 text-sm font-medium text-text">{me.fullName}</p>
            <p className="px-2 text-xs text-text-muted">
              {t.nav.role}: {t.roles[me.activeRole]}
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" aria-hidden />
              {t.nav.logout}
            </Button>
          </div>
        </aside>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
