import { z } from 'zod';
import { GRADE_SCALES } from './org.js';

/** Guruhlar va jadval (T-103, FR-ORG-3/4/6). */

export const GROUP_STATUSES = ['forming', 'active', 'paused', 'finished'] as const;
export const GROUP_TEACHER_ROLES = ['main', 'assistant'] as const;
/** Baholanadigan turlar (BR-33). */
export const GRADED_KINDS = ['homework', 'activity'] as const;

export type GroupStatus = (typeof GROUP_STATUSES)[number];

/**
 * Guruh holatlari (FR-ORG-3): yig'ilmoqda → faol ⇄ to'xtatilgan → yakunlangan.
 * Yakunlangan — oxirgi holat. API (`@lg/domain`) va UI (W-10 tugmalari) bitta jadvaldan.
 */
export const GROUP_STATUS_FLOW = {
  forming: ['active', 'finished'],
  active: ['paused', 'finished'],
  paused: ['active', 'finished'],
  finished: [],
} as const satisfies Record<GroupStatus, readonly GroupStatus[]>;
export type GroupTeacherRole = (typeof GROUP_TEACHER_ROLES)[number];

const IsoDate = z.iso.date();
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const Price = z.coerce.bigint().nonnegative().max(1_000_000_000n);

export const SlotInput = z
  .object({
    /** 1 — dushanba … 7 — yakshanba. */
    weekday: z.number().int().min(1).max(7),
    startTime: Time,
    endTime: Time,
  })
  .refine((s) => minutes(s.endTime) - minutes(s.startTime) >= 15, {
    message: 'SLOT_TIME_RANGE',
    path: ['endTime'],
  });

export const GradingConfig = z.object({
  scale: z.enum(GRADE_SCALES),
  kinds: z.array(z.enum(GRADED_KINDS)).max(GRADED_KINDS.length),
});

const GroupFields = z.object({
  name: z.string().trim().min(2).max(100),
  roomId: z.uuid().nullable(),
  /** Kursdan meros (FR-ORG-3); yuborilmasa — `courses.default_monthly_price`. */
  monthlyPrice: Price,
  maxStudents: z.number().int().min(1).max(500),
  startDate: IsoDate,
  endDate: IsoDate.nullable(),
  gradingConfig: GradingConfig,
});

const datesOrdered = (v: { startDate?: string; endDate?: string | null }) =>
  !v.startDate || !v.endDate || v.endDate >= v.startDate;

export const CreateGroupRequest = GroupFields.partial({ monthlyPrice: true, gradingConfig: true })
  .extend({
    courseId: z.uuid(),
    roomId: GroupFields.shape.roomId.default(null),
    endDate: GroupFields.shape.endDate.default(null),
    slots: z.array(SlotInput).max(14).default([]),
    /** Boshlanish sanasidan biriktiriladi; asosiy ustoz ko'pi bilan bitta. */
    teachers: z
      .array(z.object({ teacherId: z.uuid(), role: z.enum(GROUP_TEACHER_ROLES) }))
      .max(4)
      .default([]),
  })
  .refine(datesOrdered, { message: 'DATE_RANGE', path: ['endDate'] });

/** `startDate` — faqat yig'ilayotgan guruhda o'zgaradi (service tekshiradi). */
export const UpdateGroupRequest = GroupFields.partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'EMPTY_PATCH' })
  .refine(datesOrdered, { message: 'DATE_RANGE', path: ['endDate'] });

export const ChangeGroupStatusRequest = z.object({ status: z.enum(GROUP_STATUSES) });

/** Jadvalni sanadan almashtirish: eski slotlar `from - 1` da yopiladi (o'tmish saqlanadi). */
export const ReplaceScheduleRequest = z.object({
  from: IsoDate,
  slots: z.array(SlotInput).max(14),
});

/**
 * Ustoz biriktirish (FR-ORG-6, doimiy): yangi asosiy ustoz qo'shilsa — amaldagisi `from - 1`
 * da avtomatik yopiladi. Vaqtincha (bitta dars) o'rinbosar — T-104 (`lessons.teacher_id`).
 */
export const AssignTeacherRequest = z.object({
  teacherId: z.uuid(),
  role: z.enum(GROUP_TEACHER_ROLES),
  from: IsoDate,
});
export const EndAssignmentRequest = z.object({ to: IsoDate });

export const GroupListQuery = z.object({
  status: z.enum([...GROUP_STATUSES, 'current', 'all']).default('current'),
  courseId: z.uuid().optional(),
  roomId: z.uuid().optional(),
  teacherId: z.uuid().optional(),
});

const Ref = z.object({ id: z.string(), name: z.string() });

export const GroupSlot = z.object({
  id: z.string(),
  weekday: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
});

export const GroupTeacher = z.object({
  id: z.string(),
  teacherId: z.string(),
  fullName: z.string(),
  role: z.enum(GROUP_TEACHER_ROLES),
  from: z.string(),
  to: z.string().nullable(),
});

export const GroupListItem = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(GROUP_STATUSES),
  course: Ref,
  room: Ref.nullable(),
  monthlyPrice: z.string(),
  maxStudents: z.number().int(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  /** Bugun amaldagi asosiy ustoz. */
  mainTeacher: z.object({ id: z.string(), fullName: z.string() }).nullable(),
  /** Bugun amaldagi jadval. */
  slots: z.array(GroupSlot),
});

export const GroupDetail = GroupListItem.extend({
  gradingConfig: GradingConfig,
  /** Barcha biriktirishlar (tarix bilan). */
  teachers: z.array(GroupTeacher),
  /** Barcha slotlar (tarix bilan). */
  schedule: z.array(GroupSlot),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** 409 `SCHEDULE_CONFLICT` tafsiloti — UI tushunarli xabar ko'rsatadi (W-10). */
export const ScheduleConflict = z.object({
  kind: z.enum(['room', 'teacher']),
  resourceId: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  weekday: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
});

/** 409 `SCHEDULE_CONFLICT` xatosining `details` maydoni. */
export const ScheduleConflictDetails = z.object({ conflicts: z.array(ScheduleConflict) });

export type CreateGroupRequest = z.input<typeof CreateGroupRequest>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequest>;
export type SlotInput = z.infer<typeof SlotInput>;
export type GradingConfig = z.infer<typeof GradingConfig>;
export type GroupSlot = z.infer<typeof GroupSlot>;
export type GroupTeacher = z.infer<typeof GroupTeacher>;
export type GroupListItem = z.infer<typeof GroupListItem>;
export type GroupDetail = z.infer<typeof GroupDetail>;
export type ScheduleConflict = z.infer<typeof ScheduleConflict>;
export type GroupListFilter = z.infer<typeof GroupListQuery>['status'];
