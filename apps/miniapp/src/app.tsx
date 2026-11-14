import type { RoleCode } from '@lg/contracts';
import { TelegramProvider, type WebApp } from '@lg/ui-tg';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { createApi } from './api.js';
import { type DeepLink, deepLinkPath, parseStartParam, roleForLink } from './deep-link.js';
import { SessionGate } from './pages/gate.js';
import { createAppRouter } from './router.js';
import { cloudRoleStore } from './session/role-store.js';
import { SessionProvider, useSession } from './session/session.js';

/** Deep link → boshlang'ich yo'l; foydalanuvchida link roli yo'q — "Ruxsat yo'q". */
function initialPath(link: DeepLink | null, roles: readonly RoleCode[], active: RoleCode): string {
  if (!link) return '/';
  if (!link.roles.includes(active) && roleForLink(link, roles, active) === null)
    return '/forbidden';
  return deepLinkPath(link) ?? '/';
}

function Routes() {
  const { state, link } = useSession();
  const me = state.status === 'ready' ? state.me : null;
  // Router sessiya boshida bir marta; rol almashsa — o'sha router, bosh sahifaga o'tiladi.
  const [router] = useState(() =>
    createAppRouter(me ? initialPath(link, me.roles, me.activeRole) : '/'),
  );
  return <RouterProvider router={router} />;
}

export function App({ webApp }: { webApp: WebApp }) {
  const deps = useMemo(() => {
    const roleRef: { current: RoleCode | undefined } = { current: undefined };
    return {
      roleRef,
      api: createApi(webApp.initData, () => roleRef.current),
      store: cloudRoleStore(webApp),
      link: parseStartParam(webApp.initDataUnsafe.start_param),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
    };
  }, [webApp]);
  return (
    <TelegramProvider webApp={webApp}>
      <QueryClientProvider client={deps.queryClient}>
        <SessionProvider
          api={deps.api}
          initData={webApp.initData}
          store={deps.store}
          link={deps.link}
          roleRef={deps.roleRef}
        >
          <SessionGate>
            <Routes />
          </SessionGate>
        </SessionProvider>
      </QueryClientProvider>
    </TelegramProvider>
  );
}
