import { createRoute } from '@tanstack/react-router';
import {
  StaffApprovalPage,
  StaffApprovalsPage,
  StaffQueuePage,
  StaffSearchPage,
  StaffStudentPage,
} from './pages/staff.js';
import { StaffMorePage } from './pages/staff-more.js';
import { StaffPayPage, StaffPaySearchPage } from './pages/staff-pay.js';
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
  route('/staff/more', StaffMorePage),
  route('/staff/pay', StaffPaySearchPage),
  route('/staff/student/$id/pay', StaffPayPage),
] as const;
