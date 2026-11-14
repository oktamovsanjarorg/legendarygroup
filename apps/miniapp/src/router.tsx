import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppLayout, ForbiddenPage } from './layout.js';
import { HomePage } from './pages/home.js';
import { SettingsPage } from './pages/settings.js';
import {
  GuardianMorePage,
  GuardianPaymentsPage,
  GuardianResultsPage,
  StaffApprovalsPage,
  StaffQueuePage,
  StaffSearchPage,
  TeacherGroupsPage,
  TeacherProfilePage,
  TeacherSchedulePage,
} from './pages/tab-pages.js';

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

// Ustoz (teacher)
const teacherGroups = createRoute({
  getParentRoute: () => root,
  path: '/groups',
  component: TeacherGroupsPage,
});
const teacherSchedule = createRoute({
  getParentRoute: () => root,
  path: '/schedule',
  component: TeacherSchedulePage,
});
const teacherProfile = createRoute({
  getParentRoute: () => root,
  path: '/profile',
  component: TeacherProfilePage,
});

// Ota-ona (guardian)
const guardianResults = createRoute({
  getParentRoute: () => root,
  path: '/results',
  component: GuardianResultsPage,
});
const guardianPayments = createRoute({
  getParentRoute: () => root,
  path: '/payments',
  component: GuardianPaymentsPage,
});
const guardianMore = createRoute({
  getParentRoute: () => root,
  path: '/more',
  component: GuardianMorePage,
});

// Xodim (staff - admin/director)
const staffQueue = createRoute({
  getParentRoute: () => root,
  path: '/staff/queue',
  component: StaffQueuePage,
});
const staffApprovals = createRoute({
  getParentRoute: () => root,
  path: '/staff/approvals',
  component: StaffApprovalsPage,
});
const staffSearch = createRoute({
  getParentRoute: () => root,
  path: '/staff/search',
  component: StaffSearchPage,
});

const routeTree = root.addChildren([
  home,
  settings,
  forbidden,
  teacherGroups,
  teacherSchedule,
  teacherProfile,
  guardianResults,
  guardianPayments,
  guardianMore,
  staffQueue,
  staffApprovals,
  staffSearch,
]);

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
