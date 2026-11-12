import { miniappMessages as t } from '@lg/i18n';
import { Navigate } from '@tanstack/react-router';
import { useMe } from '../session/session.js';
import { tabsFor } from '../tabs.js';

/** Bosh sahifa: rolning birinchi tabi; tab hali yo'q bo'lsa — salomlashish. */
export function HomePage() {
  const me = useMe();
  const first = tabsFor(me.activeRole)[0];
  if (first && first.to !== '/') return <Navigate to={first.to} replace />;
  return (
    <main className="flex flex-col gap-2 p-4">
      <h1 className="text-xl font-semibold text-text">
        {t.home.greeting.replace('{name}', me.fullName)}
      </h1>
      <p className="text-base text-text-muted">{t.home.intro}</p>
    </main>
  );
}
