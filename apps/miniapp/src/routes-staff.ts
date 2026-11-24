import { createRoute } from '@tanstack/react-router';
import {
  StaffApprovalPage,
  StaffApprovalsPage,
  StaffQueuePage,
  StaffSearchPage,
} from './pages/staff.js';
import { StaffDebtorsPage } from './pages/staff-debtors.js';
import { StaffMorePage } from './pages/staff-more.js';
import { StaffNewPage } from './pages/staff-new.js';
import { StaffPayPage, StaffPaySearchPage } from './pages/staff-pay.js';
import { StaffSetupPage } from './pages/staff-setup.js';
import { StaffLeavePage, StaffStudentPage } from './pages/staff-student.js';
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
] as const;
