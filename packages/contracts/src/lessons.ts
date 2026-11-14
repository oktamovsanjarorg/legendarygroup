import { z } from 'zod';

/** Darslar va bayramlar (T-104, FR-ORG-5/6, BR-3/BR-5). */

export const LESSON_STATUSES = ['scheduled', 'done', 'cancelled'] as const;
/** `regular` — jadvaldan generatsiya; `extra` — qo'shimcha; `makeup` — bekor qilingan o'rniga. */
export const LESSON_KINDS = ['regular', 'extra', 'makeup'] as const;
/** Bekor qilingan dars qoplanishi (BR-5, Q-16): tanlanmasa (`null`) — oy yopilishida kredit. */
export const LESSON_COMPENSATIONS = ['credit', 'makeup'] as const;
export const LESSON_CANCEL_SOURCES = ['manual', 'holiday'] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];
export type LessonKind = (typeof LESSON_KINDS)[number];
export type LessonCompensation = (typeof LESSON_COMPENSATIONS)[number];

/** Kalendar so'rovining eng uzun oralig'i (kun). */
export const LESSON_RANGE_MAX_DAYS = 62;

const IsoDate = z.iso.date();
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

const When = z.object({ date: IsoDate, startTime: Time, endTime: Time });
const timeOrdered = (v: { startTime: string; endTime: string }) =>
  minutes(v.endTime) - minutes(v.startTime) >= 15;
const TIME_RULE = { message: 'SLOT_TIME_RANGE', path: ['endTime'] };

export const LessonCalendarQuery = z
  .object({
    from: IsoDate,
    to: IsoDate,
    groupId: z.uuid().optional(),
    teacherId: z.uuid().optional(),
    roomId: z.uuid().optional(),
  })
  .refine((v) => v.to >= v.from && daysBetween(v.from, v.to) < LESSON_RANGE_MAX_DAYS, {
    message: 'DATE_RANGE',
    path: ['to'],
  });

export const CancelLessonRequest = z.object({
  reason: z.string().trim().min(3).max(300),
  /** `credit` — darhol kredit tanlovi; `null` — keyin (qo'shimcha dars yoki oy yopilishida kredit). */
  compensation: z.literal('credit').nullable().default(null),
});

/** Qoplovchi dars: `roomId` yuborilmasa — guruh xonasi. */
export const MakeupLessonRequest = When.extend({ roomId: z.uuid().nullable().optional() }).refine(
  timeOrdered,
  TIME_RULE,
);

/** Ko'chirish = bekor qilish + qoplovchi dars (bitta amal, BR-5: kredit berilmaydi). */
export const MoveLessonRequest = When.extend({
  roomId: z.uuid().nullable().optional(),
  reason: z.string().trim().min(3).max(300).nullable().default(null),
}).refine(timeOrdered, TIME_RULE);

export const CreateExtraLessonRequest = When.extend({
  groupId: z.uuid(),
  roomId: z.uuid().nullable().optional(),
  topic: z.string().trim().min(1).max(200).nullable().default(null),
}).refine(timeOrdered, TIME_RULE);

/**
 * Bitta dars uchun o'rinbosar ustoz / boshqa xona (FR-ORG-6, vaqtincha). `null` — guruhdagi
 * standartga qaytarish (asosiy ustoz / guruh xonasi).
 */
export const UpdateLessonRequest = z
  .object({ teacherId: z.uuid().nullable(), roomId: z.uuid().nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'EMPTY_PATCH' });

const Ref = z.object({ id: z.string(), name: z.string() });

export const Lesson = z.object({
  id: z.string(),
  group: Ref,
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  room: Ref.nullable(),
  teacher: Ref.nullable(),
  /** O'rinbosar (asosiy ustoz emas) — shu dars uchun. */
  isSubstitute: z.boolean(),
  roomOverridden: z.boolean(),
  status: z.enum(LESSON_STATUSES),
  kind: z.enum(LESSON_KINDS),
  cancelReason: z.string().nullable(),
  cancelSource: z.enum(LESSON_CANCEL_SOURCES).nullable(),
  compensation: z.enum(LESSON_COMPENSATIONS).nullable(),
  /** Bekor qilingan dars → uning qoplovchisi (va aksincha). */
  makeupLessonId: z.string().nullable(),
  makeupForLessonId: z.string().nullable(),
  topic: z.string().nullable(),
});

export const HolidayListQuery = z.object({ year: z.coerce.number().int().min(2020).max(2100) });
export const CreateHolidayRequest = z.object({
  date: IsoDate,
  name: z.string().trim().min(2).max(100),
});
export const Holiday = z.object({ date: z.string(), name: z.string() });

export type LessonCalendarQuery = z.infer<typeof LessonCalendarQuery>;
export type LessonDto = z.infer<typeof Lesson>;
export type HolidayDto = z.infer<typeof Holiday>;
