export const PERMISSIONS = [
  // Staff & system
  'staff.manage',
  'staff.permissions',
  'settings.manage',
  'audit.view',

  // Organization
  'course.manage',
  'group.manage',
  'group.view',
  'lesson.manage',

  // Students
  'student.manage',
  'student.view',
  'lead.manage',

  // Attendance & grading
  'attendance.mark',
  'attendance.edit_past',
  'absence.notify',
  'grade.write',
  'test.manage',
  'results.view',

  // Payments & billing
  'payment.create',
  'payment.submit',
  'payment.review',
  'payment.reverse',
  'payment.refund',
  'discount.grant',
  'penalty.waive',
  'billing.view',
  'cash.close',

  // Finance & payroll
  'expense.manage',
  'finance.view',
  'payroll.manage',
  'payroll.view_own',

  // Communication
  'announcement.send',
  'ticket.handle',
  'ticket.create',

  // Statistics & approvals
  'stats.operational',
  'approval.decide',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
