import { z } from 'zod';

/**
 * Tashkiliy ma'lumotlar (T-102, FR-ORG-1/2): kurslar va xonalar.
 * Pul JSON'da string (`"650000"`), ichkarida `bigint` (12-ai-playbook.md §5).
 */

/** Baho shkalasi (BR-33): `0_5` — standart, `0_100`. Guruh o'z sozlamasida almashtira oladi (T-103). */
export const GRADE_SCALES = ['0_5', '0_100'] as const;
export type GradeScale = (typeof GRADE_SCALES)[number];

/** Yagona filial (05 konvensiyasi, T-102): migratsiyada yaratiladi, `branch_id` standarti. */
export const DEFAULT_BRANCH_ID = '01900000-0000-7000-8000-000000000001';

/** Pul maydoni: butun so'm, manfiy emas, ≤ 1 mlrd (oylik narx uchun yetarli chegara). */
const PriceSchema = z.coerce.bigint().nonnegative().max(1_000_000_000n);

const Name = z.string().trim().min(2).max(100);
const Level = z.string().trim().min(1).max(40);

/** Maydonlar standart qiymatsiz — PATCH'da yuborilmagan maydon o'zgarmasligi uchun. */
const CourseFields = z.object({
  name: Name,
  description: z.string().trim().max(1000).nullable(),
  /** Darajalar (FR-ORG-1), masalan `["A1", "A2", "B1"]`; tartib saqlanadi, takror yo'q. */
  levels: z
    .array(Level)
    .max(20)
    .refine((xs) => new Set(xs.map((x) => x.toLowerCase())).size === xs.length, {
      message: 'DUPLICATE_LEVEL',
    }),
  defaultMonthlyPrice: PriceSchema,
  lessonDurationMin: z.number().int().min(15).max(480),
  /** Kurs davomiyligi oylarda (W-09); `null` — cheklanmagan. */
  durationMonths: z.number().int().min(1).max(60).nullable(),
  gradeScale: z.enum(GRADE_SCALES),
});

export const CreateCourseRequest = CourseFields.extend({
  description: CourseFields.shape.description.default(null),
  levels: CourseFields.shape.levels.default([]),
  durationMonths: CourseFields.shape.durationMonths.default(null),
  gradeScale: CourseFields.shape.gradeScale.default('0_5'),
});

/** PATCH: faqat yuborilgan maydonlar o'zgaradi; bo'sh body — 400. */
export const UpdateCourseRequest = CourseFields.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'EMPTY_PATCH',
});

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  levels: z.array(z.string()),
  defaultMonthlyPrice: z.string(),
  lessonDurationMin: z.number().int(),
  durationMonths: z.number().int().nullable(),
  gradeScale: z.enum(GRADE_SCALES),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateRoomRequest = z.object({
  name: Name,
  capacity: z.number().int().min(1).max(500),
});

export const UpdateRoomRequest = CreateRoomRequest.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'EMPTY_PATCH' },
);

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().int(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Ro'yxat filtri: `active` (standart) — arxivlanmaganlar, `archived`, `all`. */
export const ORG_LIST_FILTERS = ['active', 'archived', 'all'] as const;
export const OrgListQuery = z.object({
  status: z.enum(ORG_LIST_FILTERS).default('active'),
});

export type CreateCourseRequest = z.input<typeof CreateCourseRequest>;
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequest>;
export type Course = z.infer<typeof CourseSchema>;
export type CreateRoomRequest = z.infer<typeof CreateRoomRequest>;
export type UpdateRoomRequest = z.infer<typeof UpdateRoomRequest>;
export type Room = z.infer<typeof RoomSchema>;
export type OrgListFilter = (typeof ORG_LIST_FILTERS)[number];
