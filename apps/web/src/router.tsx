import { webMessages as t } from '@lg/i18n';
import { EmptyState } from '@lg/ui-web';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import { AppLayout } from './layout/app-layout.js';
import { HomePage } from './pages/home.js';
import { InvitePage } from './pages/invite.js';
import { LoginPage } from './pages/login.js';
import { SessionsPage } from './pages/sessions.js';
import { StaffPage } from './routes/staff/index.js';

const root = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <EmptyState title={t.states.notFound} />,
});
const login = createRoute({
  getParentRoute: () => root,
  path: '/login',
  component: () => <LoginPage />,
});
const invite = createRoute({
  getParentRoute: () => root,
  path: '/invite/$token',
  component: function Invite() {
    return <InvitePage token={invite.useParams().token} />;
  },
});
const app = createRoute({ getParentRoute: () => root, id: 'app', component: AppLayout });
const home = createRoute({ getParentRoute: () => app, path: '/', component: HomePage });
const sessions = createRoute({
  getParentRoute: () => app,
  path: '/sessions',
  component: SessionsPage,
});
const staff = createRoute({ getParentRoute: () => app, path: '/staff', component: StaffPage });

const routeTree = root.addChildren([login, invite, app.addChildren([home, staff, sessions])]);

/** Testlarda — `createMemoryHistory`. */
export const createAppRouter = (history?: RouterHistory) => createRouter({ routeTree, history });

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
