import { createRoute } from '@tanstack/react-router';
import {
  StaffApprovalPage,
  StaffApprovalsPage,
  StaffQueuePage,
  StaffSearchPage,
} from './pages/staff.js';
import {
  StaffAnnouncementNewPage,
  StaffAnnouncementPage,
  StaffAnnouncementsPage,
} from './pages/staff-announcements.js';
import {
  StaffAttendancePage,
  StaffGroupAttendancePage,
  StaffLessonAttendancePage,
} from './pages/staff-attendance.js';
import { StaffAuditItemPage, StaffAuditPage } from './pages/staff-audit.js';
import {
  StaffCalendarPage,
  StaffHolidaysPage,
  StaffLessonCancelPage,
  StaffLessonMakeupPage,
  StaffLessonMovePage,
  StaffLessonNewPage,
  StaffLessonPage,
  StaffLessonReplacePage,
} from './pages/staff-calendar.js';
import { StaffCashPage } from './pages/staff-cash.js';
import {
  StaffCourseNewPage,
  StaffCoursePage,
  StaffCoursesPage,
  StaffRoomNewPage,
  StaffRoomPage,
  StaffRoomsPage,
} from './pages/staff-catalog.js';
import { StaffDebtorsPage } from './pages/staff-debtors.js';
import { StaffExpenseNewPage, StaffExpensePage, StaffFinancePage } from './pages/staff-finance.js';
import {
  StaffGroupEditPage,
  StaffGroupNewPage,
  StaffGroupPage,
  StaffGroupSchedulePage,
  StaffGroupsPage,
  StaffGroupTeacherPage,
} from './pages/staff-groups.js';
import { StaffLeadPage, StaffLeadsPage } from './pages/staff-leads.js';
import {
  StaffLeadConvertPage,
  StaffLeadEditPage,
  StaffLeadLostPage,
  StaffLeadNewPage,
  StaffLeadTrialPage,
} from './pages/staff-lead-forms.js';
import {
  StaffLinkApprovePage,
  StaffLinkRejectPage,
  StaffLinkRequestsPage,
} from './pages/staff-links.js';
import { StaffMorePage } from './pages/staff-more.js';
import { StaffNewPage } from './pages/staff-new.js';
import { StaffPayPage, StaffPaySearchPage } from './pages/staff-pay.js';
import { StaffSetupPage } from './pages/staff-setup.js';
import { StaffLeavePage, StaffStudentPage } from './pages/staff-student.js';
import { StaffTicketPage, StaffTicketsPage } from './pages/staff-tickets.js';
import { StaffUndeliveredPage } from './pages/staff-undelivered.js';
import { root } from './route-root.js';

/** Xodim rejimi (MS-*, 11-ux §2): Director/Admin marshrutlari. */
const route = <P extends string>(path: P, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => root, path, component });

export const staffRoutes = [
  route('/staff/queue', StaffQueuePage),
  route('/staff/approvals', StaffApprovalsPage),
  route('/staff/approvals/$id', StaffApprovalPage),
  route('/staff/search', StaffSearchPage),
  route('/staff/student/$id', StaffStudentPage),
  route('/staff/student/$id/leave/$enrollmentId', StaffLeavePage),
  route('/staff/student/$id/setup', StaffSetupPage),
  route('/staff/more', StaffMorePage),
  route('/staff/new', StaffNewPage),
  route('/staff/debtors', StaffDebtorsPage),
  route('/staff/pay', StaffPaySearchPage),
  route('/staff/student/$id/pay', StaffPayPage),
  route('/staff/leads', StaffLeadsPage),
  route('/staff/leads/new', StaffLeadNewPage),
  route('/staff/leads/$id', StaffLeadPage),
  route('/staff/leads/$id/edit', StaffLeadEditPage),
  route('/staff/leads/$id/lost', StaffLeadLostPage),
  route('/staff/leads/$id/trial', StaffLeadTrialPage),
  route('/staff/leads/$id/convert', StaffLeadConvertPage),
  route('/staff/link-requests', StaffLinkRequestsPage),
  route('/staff/link-requests/$id/link', StaffLinkApprovePage),
  route('/staff/link-requests/$id/reject', StaffLinkRejectPage),
  route('/staff/tickets', StaffTicketsPage),
  route('/staff/tickets/$id', StaffTicketPage),
  route('/staff/announcements', StaffAnnouncementsPage),
  route('/staff/announcements/new', StaffAnnouncementNewPage),
  route('/staff/announcements/$id', StaffAnnouncementPage),
  route('/staff/undelivered', StaffUndeliveredPage),
  route('/staff/audit', StaffAuditPage),
  route('/staff/audit/$id', StaffAuditItemPage),
  route('/staff/groups', StaffGroupsPage),
  route('/staff/groups/new', StaffGroupNewPage),
  route('/staff/groups/$id', StaffGroupPage),
  route('/staff/groups/$id/edit', StaffGroupEditPage),
  route('/staff/groups/$id/schedule', StaffGroupSchedulePage),
  route('/staff/groups/$id/teacher', StaffGroupTeacherPage),
  route('/staff/groups/$id/attendance', StaffGroupAttendancePage),
  route('/staff/calendar', StaffCalendarPage),
  route('/staff/calendar/new', StaffLessonNewPage),
  route('/staff/lessons/$id', StaffLessonPage),
  route('/staff/lessons/$id/attendance', StaffLessonAttendancePage),
  route('/staff/lessons/$id/cancel', StaffLessonCancelPage),
  route('/staff/lessons/$id/move', StaffLessonMovePage),
  route('/staff/lessons/$id/makeup', StaffLessonMakeupPage),
  route('/staff/lessons/$id/replace', StaffLessonReplacePage),
  route('/staff/holidays', StaffHolidaysPage),
  route('/staff/attendance', StaffAttendancePage),
  route('/staff/courses', StaffCoursesPage),
  route('/staff/courses/new', StaffCourseNewPage),
  route('/staff/courses/$id', StaffCoursePage),
  route('/staff/rooms', StaffRoomsPage),
  route('/staff/rooms/new', StaffRoomNewPage),
  route('/staff/rooms/$id', StaffRoomPage),
  route('/staff/cash', StaffCashPage),
  route('/staff/finance', StaffFinancePage),
  route('/staff/expenses/new', StaffExpenseNewPage),
  route('/staff/expenses/$id', StaffExpensePage),
] as const;
