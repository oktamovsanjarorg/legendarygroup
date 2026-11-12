import {
  ForbiddenState,
  OfflineBanner,
  TabBar,
  useBackButton,
  useHaptic,
  useSettingsButton,
} from '@lg/ui-tg';
import { Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { useMe } from './session/session.js';
import { tabsFor } from './tabs.js';
import { useOnline } from './use-online.js';

/**
 * Mini App qobig'i: offline chiziq, xavfsiz zona, Telegram BackButton (ichki ekranlarda),
 * menyudagi "Sozlamalar" (C-04), rolga qarab pastki tablar (faqat tab ildizlarida).
 */
export function AppLayout() {
  const me = useMe();
  const online = useOnline();
  const router = useRouter();
  const navigate = useNavigate();
  const h = useHaptic();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = tabsFor(me.activeRole);
  const isRoot = path === '/' || tabs.some((t) => t.to === path);

  useBackButton(
    isRoot
      ? null
      : () => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/' })),
  );
  useSettingsButton(path === '/settings' ? null : () => void navigate({ to: '/settings' }));

  return (
    <div
      className="min-h-screen"
      style={{
        paddingTop: 'var(--lg-safe-top, 0px)',
        paddingLeft: 'var(--lg-safe-left, 0px)',
        paddingRight: 'var(--lg-safe-right, 0px)',
      }}
    >
      {!online && <OfflineBanner />}
      <div className={isRoot && tabs.length > 0 ? 'pb-20' : ''}>
        <Outlet />
      </div>
      {isRoot && tabs.length > 0 && (
        <TabBar
          items={tabs}
          active={path}
          onSelect={(item) => {
            h.selection();
            void navigate({ to: item.to });
          }}
        />
      )}
    </div>
  );
}

/** Deep link boshqa foydalanuvchi obyektiga yoki rolingizda yo'q ekranga (11-ux §4.9). */
export function ForbiddenPage() {
  const navigate = useNavigate();
  return <ForbiddenState onHome={() => void navigate({ to: '/', replace: true })} />;
}
