import { createRoute } from '@tanstack/react-router';
import {
  StaffApprovalPage,
  StaffApprovalsPage,
  StaffQueuePage,
  StaffSearchPage,
} from './pages/staff.js';
import { StaffCashPage } from './pages/staff-cash.js';
import { StaffDebtorsPage } from './pages/staff-debtors.js';
import { StaffExpenseNewPage, StaffExpensePage, StaffFinancePage } from './pages/staff-finance.js';
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
  route('/staff/link-requests', StaffLinkRequestsPage),
  route('/staff/link-requests/$id/link', StaffLinkApprovePage),
  route('/staff/link-requests/$id/reject', StaffLinkRejectPage),
  route('/staff/tickets', StaffTicketsPage),
  route('/staff/tickets/$id', StaffTicketPage),
  route('/staff/cash', StaffCashPage),
  route('/staff/finance', StaffFinancePage),
  route('/staff/expenses/new', StaffExpenseNewPage),
  route('/staff/expenses/$id', StaffExpensePage),
] as const;
