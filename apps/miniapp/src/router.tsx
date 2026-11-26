import { createMemoryHistory, createRoute, createRouter } from '@tanstack/react-router';
import { ForbiddenPage } from './layout.js';
import { root } from './route-root.js';
import { staffRoutes } from './routes-staff.js';
import { HomePage } from './pages/home.js';
import { SettingsPage } from './pages/settings.js';
import {
  StudentProfilePage,
  StudentResultsPage,
  StudentSchedulePage,
} from './pages/student-panel.js';
import { useMe } from './session/session.js';
import {
  GuardianMorePage,
  GuardianPaymentsPage,
  GuardianReceiptPage,
  GuardianResultsPage,
} from './pages/guardian.js';
import {
  GuardianAbsencePage,
  GuardianPayPage,
  GuardianSubmissionPage,
  GuardianTicketsPage,
} from './pages/guardian-actions.js';
import { LessonAttendancePage } from './pages/lesson.js';
import { LessonGradesPage } from './pages/lesson-grades.js';
import { TeacherCommentPage, TeacherStudentPage } from './pages/student.js';
import {
  TeacherGroupPage,
  TeacherGroupsPage,
  TeacherPayrollPage,
  TeacherProfilePage,
  TeacherSchedulePage,
} from './pages/teacher.js';
import { TeacherAnnouncePage } from './pages/teacher-announce.js';
import { TeacherCodesPage } from './pages/teacher-codes.js';
import { TeacherTestCreatePage } from './pages/teacher-test-create.js';
import { TeacherTestImportPage } from './pages/teacher-test-import.js';
import { TeacherTestsPage } from './pages/teacher-tests.js';

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

function ScheduleRoute() {
  const me = useMe();
  if (me.activeRole === 'student') return <StudentSchedulePage />;
  return <TeacherSchedulePage />;
}

function ResultsRoute() {
  const me = useMe();
  if (me.activeRole === 'student') return <StudentResultsPage />;
  return <GuardianResultsPage />;
}

function ProfileRoute() {
  const me = useMe();
  if (me.activeRole === 'student') return <StudentProfilePage />;
  return <TeacherProfilePage />;
}

// Ustoz (teacher)
const teacherGroups = createRoute({
  getParentRoute: () => root,
  path: '/groups',
  component: TeacherGroupsPage,
});
const teacherSchedule = createRoute({
  getParentRoute: () => root,
  path: '/schedule',
  component: ScheduleRoute,
});
const teacherLesson = createRoute({
  getParentRoute: () => root,
  path: '/lesson/$id',
  component: LessonAttendancePage,
});
const teacherLessonGrades = createRoute({
  getParentRoute: () => root,
  path: '/lesson/$id/grades',
  component: LessonGradesPage,
});
const teacherGroup = createRoute({
  getParentRoute: () => root,
  path: '/group/$id',
  component: TeacherGroupPage,
});
const teacherTests = createRoute({
  getParentRoute: () => root,
  path: '/group/$id/tests',
  component: TeacherTestsPage,
});
const teacherTestCreate = createRoute({
  getParentRoute: () => root,
  path: '/group/$id/tests/new',
  component: TeacherTestCreatePage,
});
const teacherTestImport = createRoute({
  getParentRoute: () => root,
  path: '/group/$id/tests/$testId/import',
  component: TeacherTestImportPage,
});
const teacherCodes = createRoute({
  getParentRoute: () => root,
  path: '/group/$id/codes',
  component: TeacherCodesPage,
});
const teacherAnnounce = createRoute({
  getParentRoute: () => root,
  path: '/group/$id/announce',
  component: TeacherAnnouncePage,
});
const teacherStudent = createRoute({
  getParentRoute: () => root,
  path: '/group/$groupId/student/$id',
  component: TeacherStudentPage,
});
const teacherComment = createRoute({
  getParentRoute: () => root,
  path: '/group/$groupId/student/$id/comment/$lessonId',
  component: TeacherCommentPage,
});
const teacherProfile = createRoute({
  getParentRoute: () => root,
  path: '/profile',
  component: ProfileRoute,
});

const teacherPayroll = createRoute({
  getParentRoute: () => root,
  path: '/payroll/$id',
  component: TeacherPayrollPage,
});

// Ota-ona (guardian)
const guardianResults = createRoute({
  getParentRoute: () => root,
  path: '/results',
  component: ResultsRoute,
});
const guardianPayments = createRoute({
  getParentRoute: () => root,
  path: '/payments',
  component: GuardianPaymentsPage,
});
const guardianReceipt = createRoute({
  getParentRoute: () => root,
  path: '/receipt/$number',
  component: function ReceiptRoute() {
    const { number } = guardianReceipt.useParams();
    return <GuardianReceiptPage number={number} />;
  },
});
const guardianMore = createRoute({
  getParentRoute: () => root,
  path: '/more',
  component: GuardianMorePage,
});

// Xodim (staff - admin/director)

const guardianPay = createRoute({
  getParentRoute: () => root,
  path: '/pay',
  component: GuardianPayPage,
});
const guardianSubmission = createRoute({
  getParentRoute: () => root,
  path: '/submission/$id',
  component: GuardianSubmissionPage,
});
const guardianAbsence = createRoute({
  getParentRoute: () => root,
  path: '/absence',
  component: GuardianAbsencePage,
});
const guardianTickets = createRoute({
  getParentRoute: () => root,
  path: '/tickets',
  component: GuardianTicketsPage,
});

const routeTree = root.addChildren([
  home,
  settings,
  forbidden,
  teacherGroups,
  teacherSchedule,
  teacherLesson,
  teacherLessonGrades,
  teacherGroup,
  teacherTests,
  teacherTestCreate,
  teacherTestImport,
  teacherAnnounce,
  teacherCodes,
  teacherStudent,
  teacherComment,
  teacherProfile,
  teacherPayroll,
  guardianResults,
  guardianPayments,
  guardianReceipt,
  guardianMore,
  guardianPay,
  guardianSubmission,
  guardianAbsence,
  guardianTickets,
  ...staffRoutes,
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
