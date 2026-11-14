import { z } from 'zod';

export const TEACHER_CONTRACT_TYPES = ['fixed', 'percent', 'mixed'] as const;
export type TeacherContractType = (typeof TEACHER_CONTRACT_TYPES)[number];

export const PAYROLL_BASES = ['collected', 'accrued'] as const;
export type PayrollBase = (typeof PAYROLL_BASES)[number];

export const PAYROLL_RUN_STATUSES = ['draft', 'approved', 'paid'] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYROLL_ITEM_KINDS = [
  'fixed',
  'percent',
  'per_lesson',
  'bonus',
  'penalty',
  'advance',
  'adjustment',
] as const;
export type PayrollItemKind = (typeof PAYROLL_ITEM_KINDS)[number];

export const TeacherContractSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  teacherId: z.string().uuid(),
  teacherName: z.string().optional(),
  groupId: z.string().uuid().nullable(),
  groupName: z.string().optional(),
  type: z.enum(TEACHER_CONTRACT_TYPES),
  fixedAmount: z.string(), // bigint string
  percentBp: z.number().int().min(0).max(10000),
  perLessonRate: z.string(), // bigint string
  base: z.enum(PAYROLL_BASES),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TeacherContract = z.infer<typeof TeacherContractSchema>;

export const CreateTeacherContractRequest = z.object({
  teacherId: z.string().uuid(),
  groupId: z.string().uuid().optional().nullable(),
  type: z.enum(TEACHER_CONTRACT_TYPES),
  fixedAmount: z.string().regex(/^\d+$/).default('0'),
  percentBp: z.number().int().min(0).max(10000).default(0),
  perLessonRate: z.string().regex(/^\d+$/).default('0'),
  base: z.enum(PAYROLL_BASES).default('collected'),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});
export type CreateTeacherContractRequest = z.infer<typeof CreateTeacherContractRequest>;

export const CreateTeacherAdvanceRequest = z.object({
  teacherId: z.string().uuid(),
  amount: z.string().regex(/^[1-9]\d*$/), // musbat summa
  givenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(255).optional(),
});
export type CreateTeacherAdvanceRequest = z.infer<typeof CreateTeacherAdvanceRequest>;

export const AddPayrollAdjustmentRequest = z.object({
  teacherId: z.string().uuid(),
  kind: z.enum(['bonus', 'penalty']),
  amount: z.string().regex(/^[1-9]\d*$/),
  note: z.string().min(3).max(255),
});
export type AddPayrollAdjustmentRequest = z.infer<typeof AddPayrollAdjustmentRequest>;

export const GeneratePayrollRunRequest = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});
export type GeneratePayrollRunRequest = z.infer<typeof GeneratePayrollRunRequest>;

export const PayrollItemSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  teacherId: z.string().uuid(),
  teacherName: z.string().optional(),
  kind: z.enum(PAYROLL_ITEM_KINDS),
  amount: z.string(), // bigint string (musbat yoki manfiy)
  details: z.record(z.string(), z.unknown()),
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type PayrollItem = z.infer<typeof PayrollItemSchema>;

export const TeacherPayrollSummarySchema = z.object({
  teacherId: z.string().uuid(),
  teacherName: z.string(),
  totalNet: z.string(), // to'lanadigan jami summa
  items: z.array(PayrollItemSchema),
});
export type TeacherPayrollSummary = z.infer<typeof TeacherPayrollSummarySchema>;

export const PayrollRunDetailSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  period: z.string(),
  status: z.enum(PAYROLL_RUN_STATUSES),
  totalAmount: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  paidBy: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  teachers: z.array(TeacherPayrollSummarySchema),
});
export type PayrollRunDetail = z.infer<typeof PayrollRunDetailSchema>;
