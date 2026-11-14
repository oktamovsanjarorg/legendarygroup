import { z } from 'zod';
import { ACQUISITION_SOURCES, CreateStudentRequest, PhoneInput } from './students.js';

/** Lidlar (T-107, FR-STU-4, W-08, W-35). */

export const LEAD_STATUSES = ['new', 'contacted', 'trial', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Lid holatlari oqimi (FR-STU-4): yangi → bog'lanildi → sinov → yozildi / rad etdi.
 * `won` — faqat o'quvchiga aylantirish orqali; rad etilgan lid qayta ochilishi mumkin (`new`).
 * API (`@lg/domain`) va UI (W-08 tugmalari) bitta jadvaldan.
 */
export const LEAD_STATUS_FLOW = {
  new: ['contacted', 'trial', 'lost'],
  contacted: ['trial', 'lost'],
  trial: ['contacted', 'lost'],
  lost: ['new'],
  won: [],
} as const satisfies Record<LeadStatus, readonly LeadStatus[]>;

/** 409 `LEAD_EXISTS` xatosining `details` maydoni. */
export const LeadExistsDetails = z.object({ leadId: z.string() });

const FullName = z.string().trim().min(2).max(120);
const Notes = z.string().trim().max(2000);
const IsoDate = z.iso.date();

const LeadFields = z.object({
  fullName: FullName,
  phone: PhoneInput,
  courseId: z.uuid().nullable(),
  source: z.enum(ACQUISITION_SOURCES).nullable(),
  /** Mas'ul xodim (Admin) — qo'ng'iroq qiluvchi. */
  assignedTo: z.uuid().nullable(),
  notes: Notes.nullable(),
});

/** `POST /api/leads`. Telefon bo'yicha ochiq lid bo'lsa — 409 `LEAD_EXISTS` (`details.leadId`). */
export const CreateLeadRequest = LeadFields.partial()
  .required({ fullName: true, phone: true })
  .extend({ source: LeadFields.shape.source.default(null) });

export const UpdateLeadRequest = LeadFields.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'EMPTY_PATCH',
});

/** Holat (kanban ustuni). `won` — faqat `convert` orqali; `lost` — sabab majburiy. */
export const ChangeLeadStatusRequest = z
  .object({
    status: z.enum(['new', 'contacted', 'trial', 'lost']),
    lostReason: z.string().trim().min(3).max(300).nullable().default(null),
  })
  .refine((v) => v.status !== 'lost' || v.lostReason !== null, {
    message: 'LOST_REASON_REQUIRED',
    path: ['lostReason'],
  });

/** Sinov darsiga yozish: rejalashtirilgan, hali o'tmagan dars. Holat → `trial`. */
export const ScheduleTrialRequest = z.object({ lessonId: z.uuid() });

/**
 * Lid → o'quvchi (ma'lumot ko'chadi): `student` — kartochka (ism/telefon/manba lid'dan
 * to'ldiriladi, yuborilsa — ustun), ixtiyoriy — guruhga yozish. Bitta tranzaksiya.
 */
export const ConvertLeadRequest = z.object({
  student: CreateStudentRequest.partial({ fullName: true }).default({
    guardians: [],
    allowDuplicate: false,
  }),
  enroll: z.object({ groupId: z.uuid(), startDate: IsoDate }).nullable().default(null),
});

export const LeadListQuery = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  courseId: z.uuid().optional(),
  source: z.enum(ACQUISITION_SOURCES).optional(),
  assignedTo: z.uuid().optional(),
  /** Ism (normalizatsiya bilan) yoki telefon. */
  q: z.string().trim().max(100).optional(),
});

export const LeadStatsQuery = z
  .object({ from: IsoDate, to: IsoDate })
  .refine((v) => v.to >= v.from, { message: 'DATE_RANGE', path: ['to'] });

/**
 * Landing (W-35) ochiq formasi. `website` — bot tuzog'i (odam ko'rmaydi): to'ldirilgan bo'lsa
 * so'rov jimgina qabul qilingandek javob oladi, lid yaratilmaydi.
 */
export const PublicLeadRequest = z.object({
  fullName: FullName,
  phone: PhoneInput,
  courseId: z.uuid().nullable().default(null),
  comment: Notes.max(500).nullable().default(null),
  website: z.string().max(200).optional(),
});

const Ref = z.object({ id: z.string(), name: z.string() });

export const Lead = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  course: Ref.nullable(),
  source: z.enum(ACQUISITION_SOURCES).nullable(),
  status: z.enum(LEAD_STATUSES),
  assignedTo: Ref.nullable(),
  notes: z.string().nullable(),
  lostReason: z.string().nullable(),
  trial: z
    .object({ lessonId: z.string(), date: z.string(), startTime: z.string(), group: Ref })
    .nullable(),
  studentId: z.string().nullable(),
  statusChangedAt: z.string(),
  createdAt: z.string(),
});

const Funnel = z.object({
  total: z.number().int(),
  contacted: z.number().int(),
  trial: z.number().int(),
  won: z.number().int(),
  lost: z.number().int(),
  conversionPercent: z.number(),
});

/** Manba statistikasi (W-08, W-26): davrda yaratilgan lidlar — qaysi bosqichgacha yetgani. */
export const LeadStats = z.object({
  from: z.string(),
  to: z.string(),
  total: Funnel,
  bySource: z.array(Funnel.extend({ source: z.enum(ACQUISITION_SOURCES).nullable() })),
});

export type CreateLeadRequest = z.output<typeof CreateLeadRequest>;
export type UpdateLeadRequest = z.output<typeof UpdateLeadRequest>;
export type ConvertLeadRequest = z.output<typeof ConvertLeadRequest>;
export type LeadListQuery = z.output<typeof LeadListQuery>;
export type LeadDto = z.infer<typeof Lead>;
export type LeadStatsDto = z.infer<typeof LeadStats>;
