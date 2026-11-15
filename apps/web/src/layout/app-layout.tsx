import { webMessages as t } from '@lg/i18n';
import { LoadingState } from '@lg/ui-web';
import { Link, Navigate, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth.js';
import { AppShell } from './app-shell.js';
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

/** W-13: `Alt+P` — istalgan sahifadan to'lov kiritish (FR-PAY-2). */
function usePayHotkey(enabled: boolean) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyP') {
        e.preventDefault();
        void navigate({ to: '/payments/new' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, navigate]);
}

/** Himoyalangan qism: kirmagan bo'lsa — W-01; chap menyu ruxsatga qarab (11-ux §2). */
export function AppLayout() {
  const { status, me, permissions, signOut } = useAuth();
  const online = useOnline();
  const path = useRouterState({ select: (s) => s.location.pathname });
  usePayHotkey(permissions.has('payment.create'));
  if (status === 'loading')
    return (
      <div className="p-8">
        <LoadingState />
      </div>
    );
  if (status === 'anonymous' || !me) return <Navigate to="/login" />;
  // Ichki sahifa (masalan `/students/<id>`) ham o'z bo'limini belgilaydi.
  const nav = visibleNav(permissions);
  return (
    <AppShell
      nav={nav}
      active={nav.find((i) => path === i.to || path.startsWith(`${i.to}/`))?.to ?? path}
      user={{ name: me.fullName, role: t.roles[me.activeRole] }}
      offline={!online}
      onLogout={() => void signOut()}
      renderLink={(item, className, children) => (
        <Link key={item.screen} to={item.to} className={className}>
          {children}
        </Link>
      )}
    >
      <Outlet />
    </AppShell>
  );
}
