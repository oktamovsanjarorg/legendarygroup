import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  attendance,
  type Database,
  groups,
  guardians,
  lessons,
  studentGuardians,
  students,
} from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { NotificationsService } from '../notifications/index.js';

export interface AttendanceNoticeJobData {
  lessonId: string;
  studentId: string;
}

@Injectable()
export class AttendanceNoticeProcessor {
  private readonly logger = new Logger(AttendanceNoticeProcessor.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  /**
   * BR-31 3 daqiqalik tuzatish oynasi o'tgach, davomat holatini tekshirib
   * ota-onaga xabar yuboradi (yoki agar oyna ichida tuzatilgan bo'lsa o'tkazib yuboradi).
   */
  async process(data: AttendanceNoticeJobData): Promise<void> {
    const { lessonId, studentId } = data;

    const [current] = await this.db
      .select({
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        studentName: students.fullName,
        groupName: groups.name,
        date: lessons.date,
        branchId: groups.branchId,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .innerJoin(students, eq(students.id, attendance.studentId))
      .where(and(eq(attendance.lessonId, lessonId), eq(attendance.studentId, studentId)));

    if (!current) {
      this.logger.warn({ lessonId, studentId }, 'Davomat yozuvi topilmadi');
      return;
    }

    const isAbsent = current.status === 'absent';
    const isLateEligible = current.status === 'late' && (current.lateMinutes ?? 0) >= 15;

    // BR-31: Agar 3 daqiqalik oyna ichida o'quvchi "keldi"ga o'zgargan bo'lsa — xabar bekor!
    if (!isAbsent && !isLateEligible) {
      this.logger.log(
        { lessonId, studentId, status: current.status },
        'Davomat oyna ichida tuzatilgan, xabar bekor qilindi',
      );
      return;
    }

    // O'quvchining ota-onalarini topamiz
    const parentRows = await this.db
      .select({ guardianUserId: guardians.userId })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, studentId));

    const validParentUserIds = parentRows
      .map((r) => r.guardianUserId)
      .filter((id): id is string => Boolean(id));

    if (validParentUserIds.length === 0) {
      return;
    }

    const notifType = isAbsent ? 'attendance_absent' : 'attendance_late';

    for (const guardianUserId of validParentUserIds) {
      await this.notifications.notify({
        userId: guardianUserId,
        type: notifType,
        payload: {
          studentName: current.studentName,
          groupName: current.groupName,
          date: current.date,
          minutes: current.lateMinutes ?? 15,
        },
        dedupeKey: `att:${lessonId}:${studentId}:${guardianUserId}`,
        branchId: current.branchId,
      });
    }
  }
}
