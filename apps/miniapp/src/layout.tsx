import {
  ForbiddenState,
  OfflineBanner,
  SideNav,
  type SideNavGroup,
  TabBar,
  type TabItem,
  useBackButton,
  useHaptic,
  useDesktopFullscreen,
  useSettingsButton,
  useWebApp,
  useWide,
} from '@lg/ui-tg';
import { Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { useAttendanceQueueFlush } from './data/attendance.js';
import { useNavModel } from './nav-model.js';
import { SplitView, useSplit } from './split-view.js';
import { useOnline } from './use-online.js';

/** Qaysi navigatsiya ko'rinadi: telefonda — tab ildizida pastki menyu; keng ekranda — yon panel. */
function shellFlags(
  path: string,
  tabs: readonly TabItem[],
  side: readonly SideNavGroup[],
  wide: boolean,
) {
  const isRoot = path === '/' || tabs.some((t) => t.to === path);
  return {
    isRoot,
    showTabs: !wide && isRoot && tabs.length > 0,
    showSide: wide && side.some((g) => g.items.length > 0),
  };
}

/**
 * Mini App qobig'i: offline chiziq, xavfsiz zona, Telegram BackButton (ichki ekranlarda),
 * menyudagi "Sozlamalar" (C-04), rolga qarab pastki tablar (faqat tab ildizlarida).
 * Keng ekranda (T-164, Q-113) — pastki menyu o'rniga doimiy yon panel, kontent markazda.
 */
export function AppLayout() {
  const online = useOnline();
  useAttendanceQueueFlush();
  const router = useRouter();
  const navigate = useNavigate();
  const h = useHaptic();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { tabs, side } = useNavModel();
  const { isRoot, showTabs, showSide } = shellFlags(path, tabs, side, useWide());
  const split = useSplit(path);
  useDesktopFullscreen(useWebApp(), side.length > 1);
  const go = (to: string) => {
    h.selection();
    void navigate({ to });
  };

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
      <div className={showSide ? 'flex' : ''}>
        {showSide && <SideNav groups={side} active={path} onSelect={(i) => go(i.to)} />}
        <div className={`min-w-0 flex-1 ${showTabs ? 'pb-20' : ''}`}>
          {showSide && split ? (
            <SplitView split={split.split} detail={split.detail} />
          ) : (
            <div className={showSide ? 'mx-auto max-w-3xl' : ''}>
              <Outlet />
            </div>
          )}
        </div>
      </div>
      {showTabs && <TabBar items={tabs} active={path} onSelect={(item) => go(item.to)} />}
    </div>
  );
}

/** Deep link boshqa foydalanuvchi obyektiga yoki rolingizda yo'q ekranga (11-ux §4.9). */
export function ForbiddenPage() {
  const navigate = useNavigate();
  return <ForbiddenState onHome={() => void navigate({ to: '/', replace: true })} />;
}
