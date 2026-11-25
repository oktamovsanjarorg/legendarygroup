import { Inject, Injectable } from '@nestjs/common';
import type {
  AnnouncementFileType,
  AnnouncementStatus,
  AnnouncementTargetType,
} from '@lg/contracts';
import {
  announcementRecipients,
  announcements,
  type Database,
  enrollments,
  groupTeachers,
  groups,
  guardians,
  studentGuardians,
  students,
  type Transaction,
  users,
} from '@lg/db';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

export interface AudienceRecipient {
  userId: string;
  guardianName: string;
  phone: string | null;
  studentNames: string[];
  branchId: string;
}

export interface CreateAnnouncementInput {
  branchId: string;
  authorId: string;
  title: string;
  body: string;
  targetType: AnnouncementTargetType;
  targetId?: string | null;
  fileId?: string | null;
  fileType?: AnnouncementFileType | null;
  status: AnnouncementStatus;
  totalRecipients: number;
  sentAt: Date | null;
}

@Injectable()
export class AnnouncementsRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /** Q-62: e'lonni faqat guruhning bugungi asosiy (`main`) ustozi yuboradi. */
  async isMainTeacher(teacherUserId: string, groupId: string, today: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: groupTeachers.groupId })
      .from(groupTeachers)
      .where(
        and(
          eq(groupTeachers.teacherId, teacherUserId),
          eq(groupTeachers.groupId, groupId),
          eq(groupTeachers.role, 'main'),
          lte(groupTeachers.fromDate, today),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, today)),
        ),
      );
    return Boolean(row);
  }

  /** O'quvchilarning botga ulangan (foydalanuvchisi bor) ota-onalari. */
  async guardiansOf(studentIds: string[]): Promise<AudienceRecipient[]> {
    if (studentIds.length === 0) return [];
    const rows = await this.db
      .select({
        userId: guardians.userId,
        guardianName: guardians.fullName,
        phone: guardians.phone,
        studentName: students.fullName,
        branchId: guardians.branchId,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .innerJoin(students, eq(students.id, studentGuardians.studentId))
      .where(
        and(
          inArray(studentGuardians.studentId, studentIds),
          eq(studentGuardians.notify, true),
          isNotNull(guardians.userId),
          isNull(students.archivedAt),
        ),
      );
    return this.groupAudienceRows(rows);
  }

  /** Hali chiqmagan (chiqish kuni bugundan oldin emas) a'zolar. */
  async enrolledStudentIds(
    by: { groupId: string } | { courseId: string },
    today: string,
  ): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ studentId: enrollments.studentId })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          'groupId' in by ? eq(groups.id, by.groupId) : eq(groups.courseId, by.courseId),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, today)),
        ),
      );
    return rows.map((r) => r.studentId);
  }

  async activeStudentIds(branchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.branchId, branchId), isNull(students.archivedAt)));
    return rows.map((r) => r.id);
  }

  private groupAudienceRows(
    rows: Array<{
      userId: string | null;
      guardianName: string;
      phone: string;
      studentName: string;
      branchId: string;
    }>,
  ): AudienceRecipient[] {
    const map = new Map<string, AudienceRecipient>();
    for (const r of rows) {
      if (!r.userId) continue;
      const existing = map.get(r.userId);
      if (existing) {
        if (!existing.studentNames.includes(r.studentName)) {
          existing.studentNames.push(r.studentName);
        }
      } else {
        map.set(r.userId, {
          userId: r.userId,
          guardianName: r.guardianName,
          phone: r.phone,
          studentNames: [r.studentName],
          branchId: r.branchId,
        });
      }
    }
    return Array.from(map.values());
  }

  /** Yangi e'lon yaratish */
  async createAnnouncement(tx: Transaction, data: CreateAnnouncementInput) {
    const [row] = await tx
      .insert(announcements)
      .values({
        branchId: data.branchId,
        authorId: data.authorId,
        title: data.title,
        body: data.body,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        fileId: data.fileId ?? null,
        fileType: data.fileType ?? null,
        status: data.status,
        totalRecipients: data.totalRecipients,
        sentAt: data.sentAt,
        createdAt: this.clock.now(),
      })
      .returning();
    if (!row) throw new Error('Announcement not created');
    return row;
  }

  /** ID bo'yicha e'lonni topish */
  async findById(id: string) {
    const [row] = await this.db
      .select({
        announcement: announcements,
        authorName: users.fullName,
      })
      .from(announcements)
      .innerJoin(users, eq(users.id, announcements.authorId))
      .where(eq(announcements.id, id));
    return row ?? null;
  }

  /** E'lonlar ro'yxati */
  async listAnnouncements(params: {
    branchId: string;
    targetType?: AnnouncementTargetType;
    status?: AnnouncementStatus;
    authorId?: string;
    limit: number;
    offset: number;
  }) {
    const conditions = [eq(announcements.branchId, params.branchId)];
    if (params.targetType) conditions.push(eq(announcements.targetType, params.targetType));
    if (params.status) conditions.push(eq(announcements.status, params.status));
    if (params.authorId) conditions.push(eq(announcements.authorId, params.authorId));

    const rows = await this.db
      .select({
        announcement: announcements,
        authorName: users.fullName,
      })
      .from(announcements)
      .innerJoin(users, eq(users.id, announcements.authorId))
      .where(and(...conditions))
      .orderBy(desc(announcements.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    return rows;
  }

  /** Qabul qiluvchilar ro'yxatini kiritish */
  async insertRecipients(
    tx: Transaction,
    items: Array<{
      announcementId: string;
      userId: string;
      recipientName: string;
      recipientPhone: string | null;
      status: 'queued' | 'sent' | 'failed' | 'blocked';
    }>,
  ) {
    if (items.length === 0) return [];
    return tx.insert(announcementRecipients).values(items).returning();
  }

  /** Hamma qabul qiluvchi navbatga qo'yildi. */
  async markCompleted(id: string, at: Date) {
    await this.db
      .update(announcements)
      .set({ status: 'completed', sentAt: at, updatedAt: at })
      .where(eq(announcements.id, id));
  }

  /** Ikki marta bosish: shu muallifning `since`dan keyingi aynan shu e'loni (muallif qulflanadi). */
  async findDuplicate(
    tx: Transaction,
    data: Pick<CreateAnnouncementInput, 'authorId' | 'title' | 'body' | 'targetType' | 'targetId'>,
    since: Date,
  ): Promise<string | null> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${data.authorId}))`);
    const [row] = await tx
      .select({ id: announcements.id })
      .from(announcements)
      .where(
        and(
          eq(announcements.authorId, data.authorId),
          eq(announcements.title, data.title),
          eq(announcements.body, data.body),
          eq(announcements.targetType, data.targetType),
          data.targetId
            ? eq(announcements.targetId, data.targetId)
            : isNull(announcements.targetId),
          gte(announcements.createdAt, since),
        ),
      );
    return row?.id ?? null;
  }

  /** Qabul qiluvchini notificationId va holati bilan yangilash */
  async updateRecipientDelivery(
    announcementId: string,
    userId: string,
    data: {
      notificationId?: string | null;
      status: 'queued' | 'sent' | 'failed' | 'blocked';
      sentAt?: Date | null;
      failedReason?: string | null;
    },
  ) {
    await this.db
      .update(announcementRecipients)
      .set({
        ...data,
        updatedAt: this.clock.now(),
      })
      .where(
        and(
          eq(announcementRecipients.announcementId, announcementId),
          eq(announcementRecipients.userId, userId),
        ),
      );
  }

  /** Qabul qiluvchilar (bir yoki bir nechta e'lon uchun). */
  async findRecipients(...announcementIds: string[]) {
    if (announcementIds.length === 0) return [];
    return this.db
      .select()
      .from(announcementRecipients)
      .where(inArray(announcementRecipients.announcementId, announcementIds))
      .orderBy(asc(announcementRecipients.recipientName));
  }
}
