import { webMessages as t } from '@lg/i18n';
import { EmptyState, ErrorState } from '@lg/ui-web';
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
import { VerifyPage } from './pages/verify.js';
import { DebtorsPage } from './routes/billing/debtors.js';
import { ApprovalsPage } from './routes/billing/approvals.js';
import { CashPage } from './routes/billing/cash.js';
import { DiscountsPage } from './routes/billing/discounts.js';
import { PayEntryPage } from './routes/billing/pay-entry.js';
import { PaymentDetailPage } from './routes/billing/payment-detail.js';
import { QueuePage } from './routes/billing/queue.js';
import { AttendancePage } from './routes/attendance/index.js';
import { AnnouncementsPage } from './routes/announcements/index.js';
import { AuditPage } from './routes/audit/index.js';
import { CalendarPage } from './routes/calendar/index.js';
import { CoursesPage } from './routes/courses/index.js';
import { ExpensesPage } from './routes/finance/expenses.js';
import { PayrollPage } from './routes/finance/payroll.js';
import { PnlPage } from './routes/finance/pnl.js';
import { FailedMessagesPage } from './routes/failed-messages/index.js';
import { ForecastsPage } from './routes/forecasts/index.js';
import { ReportsPage } from './routes/reports/index.js';
import { TestsPage } from './routes/tests/index.js';
import { TicketsPage } from './routes/tickets/index.js';
import { GroupsPage } from './routes/groups/index.js';
import { LandingPage } from './routes/landing/index.js';
import { LeadsPage } from './routes/leads/index.js';
import { LinkRequestsPage } from './routes/link-requests/index.js';
import { SettingsPage } from './routes/settings/index.js';
import { StaffPage } from './routes/staff/index.js';
import { StudentCardPage } from './routes/students/card.js';
import { StudentsPage } from './routes/students/index.js';
import { WizardPage } from './routes/wizard/index.js';

const root = createRootRoute({
  component: Outlet,
  notFoundComponent: () => <EmptyState title={t.states.notFound} />,
  // Ekrandagi kutilmagan xato butun ilovani oq sahifaga aylantirmasin.
  errorComponent: ({ reset }) => <ErrorState message={t.states.crashed} onRetry={reset} />,
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
const verify = createRoute({
  getParentRoute: () => root,
  path: '/verify/$token',
  component: function Verify() {
    return <VerifyPage token={verify.useParams().token} />;
  },
});
const landing = createRoute({
  getParentRoute: () => root,
  path: '/landing',
  component: () => <LandingPage />,
});
const app = createRoute({ getParentRoute: () => root, id: 'app', component: AppLayout });
const home = createRoute({ getParentRoute: () => app, path: '/', component: HomePage });
const sessions = createRoute({
  getParentRoute: () => app,
  path: '/sessions',
  component: SessionsPage,
});
const courses = createRoute({
  getParentRoute: () => app,
  path: '/courses',
  component: CoursesPage,
});
const groups = createRoute({ getParentRoute: () => app, path: '/groups', component: GroupsPage });
const calendar = createRoute({
  getParentRoute: () => app,
  path: '/calendar',
  component: CalendarPage,
});
const students = createRoute({
  getParentRoute: () => app,
  path: '/students',
  component: StudentsPage,
});
const studentCard = createRoute({
  getParentRoute: () => app,
  path: '/students/$id',
  component: function StudentCard() {
    const { id } = studentCard.useParams();
    return <StudentCardPage key={id} id={id} />;
  },
});
const leads = createRoute({ getParentRoute: () => app, path: '/leads', component: LeadsPage });
const staff = createRoute({ getParentRoute: () => app, path: '/staff', component: StaffPage });
const payNew = createRoute({
  getParentRoute: () => app,
  path: '/payments/new',
  component: PayEntryPage,
});
const payment = createRoute({
  getParentRoute: () => app,
  path: '/payments/$id',
  component: function Payment() {
    const { id } = payment.useParams();
    return <PaymentDetailPage key={id} id={id} />;
  },
});
const queue = createRoute({
  getParentRoute: () => app,
  path: '/payments/queue',
  component: QueuePage,
});
const debtors = createRoute({
  getParentRoute: () => app,
  path: '/debtors',
  component: DebtorsPage,
});
const discounts = createRoute({
  getParentRoute: () => app,
  path: '/discounts',
  component: DiscountsPage,
});
const cash = createRoute({ getParentRoute: () => app, path: '/cash', component: CashPage });
const approvals = createRoute({
  getParentRoute: () => app,
  path: '/approvals',
  component: ApprovalsPage,
});
const attendanceGrid = createRoute({
  getParentRoute: () => app,
  path: '/attendance',
  component: AttendancePage,
});
const settings = createRoute({
  getParentRoute: () => app,
  path: '/settings',
  component: SettingsPage,
});
const linkRequests = createRoute({
  getParentRoute: () => app,
  path: '/link-requests',
  component: LinkRequestsPage,
});
const expensesRoute = createRoute({
  getParentRoute: () => app,
  path: '/expenses',
  component: ExpensesPage,
});
const pnl = createRoute({ getParentRoute: () => app, path: '/pnl', component: PnlPage });
const payroll = createRoute({
  getParentRoute: () => app,
  path: '/payroll',
  component: PayrollPage,
});
const reports = createRoute({
  getParentRoute: () => app,
  path: '/reports',
  component: ReportsPage,
});
const forecasts = createRoute({
  getParentRoute: () => app,
  path: '/forecasts',
  component: ForecastsPage,
});
const tickets = createRoute({
  getParentRoute: () => app,
  path: '/tickets',
  component: TicketsPage,
});
const failedMessages = createRoute({
  getParentRoute: () => app,
  path: '/failed-messages',
  component: FailedMessagesPage,
});
const announcements = createRoute({
  getParentRoute: () => app,
  path: '/announcements',
  component: AnnouncementsPage,
});
const testsRoute = createRoute({
  getParentRoute: () => app,
  path: '/tests',
  component: TestsPage,
});
const audit = createRoute({ getParentRoute: () => app, path: '/audit', component: AuditPage });
const wizard = createRoute({ getParentRoute: () => app, path: '/wizard', component: WizardPage });

const routeTree = root.addChildren([
  login,
  invite,
  verify,
  landing,
  app.addChildren([
    home,
    students,
    studentCard,
    leads,
    courses,
    groups,
    calendar,
    staff,
    sessions,
    wizard,
    payNew,
    audit,
    reports,
    forecasts,
    announcements,
    testsRoute,
    tickets,
    failedMessages,
    payroll,
    pnl,
    expensesRoute,
    linkRequests,
    settings,
    attendanceGrid,
    debtors,
    approvals,
    cash,
    discounts,
    payment,
    queue,
  ]),
]);

/** Testlarda — `createMemoryHistory`. */
export const createAppRouter = (history?: RouterHistory) => createRouter({ routeTree, history });

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
