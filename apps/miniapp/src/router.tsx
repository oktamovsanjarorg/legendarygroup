import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppLayout, ForbiddenPage } from './layout.js';
import { HomePage } from './pages/home.js';
import { SettingsPage } from './pages/settings.js';

const root = createRootRoute({ component: AppLayout, notFoundComponent: ForbiddenPage });
const home = createRoute({ getParentRoute: () => root, path: '/', component: HomePage });
const settings = createRoute({
  getParentRoute: () => root,
  path: '/settings',
  component: SettingsPage,
});
const forbidden = createRoute({
  getParentRoute: () => root,
  path: '/forbidden',
  component: ForbiddenPage,
});

const routeTree = root.addChildren([home, settings, forbidden]);

/**
 * Xotiradagi tarix: Telegram URL hash'ida `tgWebAppData` bor — unga tegmaymiz;
 * orqaga yurish faqat `BackButton` orqali. Boshlang'ich yo'l — deep link (screens.md §5).
 */
export const createAppRouter = (initialPath = '/') =>
  createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }) });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
