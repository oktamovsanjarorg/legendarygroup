import { z } from 'zod';

/** Guruhga yozish (T-106, FR-STU-3, BR-9, BR-32). */

/** Chiqish sababi (FR-STU-3): ketdi / ko'chirildi / tugatdi. */
export const ENROLLMENT_END_REASONS = ['left', 'transferred', 'finished'] as const;
/** Hisoblangan holat — saqlanmaydi (`enrollmentState`, `@lg/domain`). */
export const ENROLLMENT_STATES = ['upcoming', 'active', 'frozen', 'ended'] as const;

export type EnrollmentEndReason = (typeof ENROLLMENT_END_REASONS)[number];
export type EnrollmentStateCode = (typeof ENROLLMENT_STATES)[number];

const IsoDate = z.iso.date();
const Note = z.string().trim().max(500);

export const EnrollRequest = z.object({
  studentId: z.uuid(),
  groupId: z.uuid(),
  startDate: IsoDate,
});

/** `transferred` — faqat ko'chirish endpoint'i orqali. */
export const EndEnrollmentRequest = z.object({
  endDate: IsoDate,
  reason: z.enum(['left', 'finished']),
  note: Note.nullable().default(null),
});

/** Ko'chirish: eski guruhda `date - 1` gacha, yangisida `date` dan; chegirma saqlanadi. */
export const TransferEnrollmentRequest = z.object({
  toGroupId: z.uuid(),
  date: IsoDate,
  note: Note.nullable().default(null),
});

export const CreateFreezeRequest = z
  .object({ from: IsoDate, to: IsoDate, reason: z.string().trim().min(3).max(500) })
  .refine((v) => v.to >= v.from, { message: 'DATE_RANGE', path: ['to'] });

/** Muzlatishni erta tugatish (o'quvchi qaytdi). */
export const EndFreezeRequest = z.object({ to: IsoDate });

export const RosterQuery = z.object({ date: IsoDate.optional() });

export const FreezeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  reason: z.string(),
  approvedBy: z.string().nullable(),
});

export const EnrollmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  group: z.object({ id: z.string(), name: z.string() }),
  startDate: z.string(),
  endDate: z.string().nullable(),
  endReason: z.enum(ENROLLMENT_END_REASONS).nullable(),
  /** Doimiy chegirma foizi (BR-18) — T-203 o'rnatadi. */
  discountPercent: z.number().int().nullable(),
  /** Bugungi holat (Asia/Tashkent). */
  state: z.enum(ENROLLMENT_STATES),
  freezes: z.array(FreezeSchema),
});

/** Guruh ro'yxati sanada (BR-32): faqat o'sha kuni yozilganlar. Ustozga ham — PII'siz. */
export const RosterItem = z.object({
  enrollmentId: z.string(),
  studentId: z.string(),
  code: z.number().int(),
  fullName: z.string(),
  state: z.enum(ENROLLMENT_STATES),
});

export const RosterResult = z.object({
  date: z.string(),
  capacity: z.number().int(),
  items: z.array(RosterItem),
});

/** `GET /api/groups/student-counts` — guruhda shu kuni yozilganlar soni (W-10 "To'lganlik"). */
export const GroupStudentCounts = z.object({
  date: z.string(),
  counts: z.record(z.string(), z.number().int()),
});

export type GroupStudentCounts = z.infer<typeof GroupStudentCounts>;
export type EnrollmentDto = z.infer<typeof EnrollmentSchema>;
export type FreezeDto = z.infer<typeof FreezeSchema>;
export type RosterItem = z.infer<typeof RosterItem>;
export type RosterResult = z.infer<typeof RosterResult>;
