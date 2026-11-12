import { ACQUISITION_SOURCES, LEAD_STATUSES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, primaryUuid, updatedAt } from './common.js';
import { lessons } from './lessons.js';
import { branchId, courses } from './org.js';
import { students } from './students.js';
import { users } from './users.js';

/**
 * Lidlar (FR-STU-4, T-107). Telefon — E.164; bir telefonda bitta **ochiq** lid (partial unique).
 * `search_name` — `normalizeUz(full_name)`, `pg_trgm` GIN. `won` ⇔ `student_id` bor.
 */
export const leads = pgTable(
  'leads',
  {
    id: primaryUuid(),
    branchId: branchId(),
    fullName: text('full_name').notNull(),
    searchName: text('search_name').notNull(),
    phone: text('phone').notNull(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'restrict' }),
    source: text('source', { enum: ACQUISITION_SOURCES }),
    status: text('status', { enum: LEAD_STATUSES }).notNull().default('new'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'restrict' }),
    notes: text('notes'),
    lostReason: text('lost_reason'),
    trialLessonId: uuid('trial_lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    studentId: uuid('student_id').references(() => students.id, { onDelete: 'restrict' }),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('leads_open_phone_uq')
      .on(t.phone)
      .where(sql`${t.status} IN ('new', 'contacted', 'trial')`),
    index('leads_status_idx').on(t.status, t.statusChangedAt),
    index('leads_created_at_idx').on(t.createdAt),
    index('leads_course_id_idx').on(t.courseId),
    index('leads_assigned_to_idx').on(t.assignedTo),
    index('leads_trial_lesson_id_idx').on(t.trialLessonId),
    index('leads_student_id_idx').on(t.studentId),
    index('leads_search_name_trgm_idx').using('gin', sql`${t.searchName} gin_trgm_ops`),
    check('leads_status_check', oneOf(t.status, LEAD_STATUSES)),
    check('leads_source_check', oneOf(t.source, ACQUISITION_SOURCES)),
    check('leads_won_student_check', sql`(${t.status} = 'won') = (${t.studentId} IS NOT NULL)`),
    check('leads_lost_reason_check', sql`${t.status} <> 'lost' OR ${t.lostReason} IS NOT NULL`),
  ],
);

/**
 * Holat tarixi — konversiya voronkasi uchun (lid `trial`gacha yetib, keyin rad etgan bo'lsa ham
 * hisoblanadi). Faqat qo'shiladi.
 */
export const leadEvents = pgTable(
  'lead_events',
  {
    id: primaryUuid(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'restrict' }),
    status: text('status', { enum: LEAD_STATUSES }).notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('lead_events_lead_id_idx').on(t.leadId),
    index('lead_events_actor_id_idx').on(t.actorId),
    check('lead_events_status_check', oneOf(t.status, LEAD_STATUSES)),
  ],
);

export type LeadRow = typeof leads.$inferSelect;
