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
  invoices,
  studentGuardians,
  students,
  users,
} from '@lg/db';
import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
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
  fileUrl?: string | null;
  fileType?: AnnouncementFileType | null;
  status?: AnnouncementStatus;
  scheduledAt?: Date | null;
}

@Injectable()
export class AnnouncementsRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /** O'qituvchining ruxsat etilgan guruhlarini tekshirish */
  async isTeacherInGroup(teacherUserId: string, groupId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: groupTeachers.groupId })
      .from(groupTeachers)
      .where(and(eq(groupTeachers.teacherId, teacherUserId), eq(groupTeachers.groupId, groupId)));
    return Boolean(row);
  }

  /** E'lon auditoriyasini aniqlash */
  async findAudience(params: {
    branchId: string;
    targetType: AnnouncementTargetType;
    targetId?: string | null;
  }): Promise<AudienceRecipient[]> {
    const studentIds = await this.resolveStudentIds(params);
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
          sql`${guardians.userId} IS NOT NULL`,
        ),
      );

    return this.groupAudienceRows(rows);
  }

  private async resolveStudentIds(params: {
    branchId: string;
    targetType: AnnouncementTargetType;
    targetId?: string | null;
  }): Promise<string[]> {
    switch (params.targetType) {
      case 'group': {
        if (!params.targetId) return [];
        const rows = await this.db
          .select({ studentId: enrollments.studentId })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.groupId, params.targetId),
              or(isNull(enrollments.endDate), gte(enrollments.endDate, sql`CURRENT_DATE`)),
            ),
          );
        return rows.map((r) => r.studentId);
      }
      case 'course': {
        if (!params.targetId) return [];
        const rows = await this.db
          .select({ studentId: enrollments.studentId })
          .from(enrollments)
          .innerJoin(groups, eq(groups.id, enrollments.groupId))
          .where(
            and(
              eq(groups.courseId, params.targetId),
              or(isNull(enrollments.endDate), gte(enrollments.endDate, sql`CURRENT_DATE`)),
            ),
          );
        return rows.map((r) => r.studentId);
      }
      case 'debtors': {
        const rows = await this.db
          .selectDistinct({ studentId: invoices.studentId })
          .from(invoices)
          .where(
            and(
              eq(invoices.branchId, params.branchId),
              inArray(invoices.status, ['open', 'partially_paid']),
            ),
          );
        return rows.map((r) => r.studentId);
      }
      case 'all':
      default: {
        const rows = await this.db
          .select({ id: students.id })
          .from(students)
          .where(and(eq(students.branchId, params.branchId), isNull(students.archivedAt)));
        return rows.map((r) => r.id);
      }
    }
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
  async createAnnouncement(data: CreateAnnouncementInput) {
    const [row] = await this.db
      .insert(announcements)
      .values({
        branchId: data.branchId,
        authorId: data.authorId,
        title: data.title,
        body: data.body,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        fileUrl: data.fileUrl ?? null,
        fileType: data.fileType ?? null,
        status: data.status ?? 'draft',
        scheduledAt: data.scheduledAt ?? null,
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
    limit: number;
    offset: number;
  }) {
    const conditions = [eq(announcements.branchId, params.branchId)];
    if (params.targetType) conditions.push(eq(announcements.targetType, params.targetType));
    if (params.status) conditions.push(eq(announcements.status, params.status));

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
    items: Array<{
      announcementId: string;
      userId: string;
      recipientName: string;
      recipientPhone: string | null;
      status: 'queued' | 'sent' | 'failed' | 'blocked';
    }>,
  ) {
    if (items.length === 0) return [];
    return this.db.insert(announcementRecipients).values(items).returning();
  }

  /** E'lon hisoblagichlari va holatini yangilash */
  async updateAnnouncementStatus(
    id: string,
    data: {
      status?: AnnouncementStatus;
      sentAt?: Date | null;
      totalRecipients?: number;
      sentCount?: number;
      failedCount?: number;
      blockedCount?: number;
    },
  ) {
    const [row] = await this.db
      .update(announcements)
      .set({
        ...data,
        updatedAt: this.clock.now(),
      })
      .where(eq(announcements.id, id))
      .returning();
    return row;
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

  /** E'lon qabul qiluvchilari statistikasi */
  async findRecipients(announcementId: string) {
    return this.db
      .select()
      .from(announcementRecipients)
      .where(eq(announcementRecipients.announcementId, announcementId))
      .orderBy(desc(announcementRecipients.createdAt));
  }
}
