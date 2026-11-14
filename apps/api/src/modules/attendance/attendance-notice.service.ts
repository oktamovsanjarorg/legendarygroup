import { Inject, Injectable, Logger, type OnModuleInit, Optional } from '@nestjs/common';
import type { EventPayloads } from '@lg/contracts';
import { type Database, groups, lessons, notifications, students } from '@lg/db';
import { and, eq, inArray, like } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { QUEUES, QueueService } from '../../common/queue/queue.service.js';
import { EventHandlers } from '../outbox/index.js';
import { NotificationsService } from '../notifications/index.js';
import { SettingsService } from '../settings/index.js';

@Injectable()
export class AttendanceNoticeService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceNoticeService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(QueueService) private readonly queues: QueueService,
    @Inject(EventHandlers) private readonly eventHandlers: EventHandlers,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Optional() @Inject(SettingsService) private readonly settings?: SettingsService,
  ) {}

  onModuleInit(): void {
    this.eventHandlers.on('AttendanceMarked', 'attendance.notice-scheduler', async (event) => {
      await this.handleAttendanceMarked(event.payload);
    });
  }

  async handleAttendanceMarked(payload: EventPayloads['AttendanceMarked']): Promise<void> {
    const isLateEligible = payload.status === 'late' && (payload.lateMinutes ?? 0) >= 15;
    const isAbsentEligible = payload.status === 'absent';

    if (isAbsentEligible || isLateEligible) {
      await this.scheduleNotice(payload.lessonId, payload.studentId);
      return;
    }

    if (
      payload.status === 'present' &&
      (payload.previousStatus === 'absent' || payload.previousStatus === 'late')
    ) {
      await this.handlePossibleCorrection(payload.lessonId, payload.studentId);
    }
  }

  /** BR-31: 3 daqiqalik tuzatish oynasi bilan delayed job rejalashtirish. */
  async scheduleNotice(lessonId: string, studentId: string, customDelayMs?: number): Promise<void> {
    let delayMs = customDelayMs;
    if (delayMs === undefined) {
      const windowMinutes = await this.resolveNoticeWindowMinutes();
      delayMs = windowMinutes * 60 * 1000;
    }

    const queue = this.queues.queue(QUEUES.attendanceNotice);
    await queue.add(
      'send-absence-notice',
      { lessonId, studentId },
      {
        delay: delayMs,
        jobId: `att-notice:${lessonId}:${studentId}`,
        removeOnComplete: 100,
      },
    );
  }

  /**
   * BR-31: Oynadan keyingi tuzatishda xato tuzatilsa tuzatish xabari
   * ("Uzr, xatolik: farzandingiz darsda").
   */
  async handlePossibleCorrection(lessonId: string, studentId: string): Promise<void> {
    const dedupePrefix = `att:${lessonId}:${studentId}:%`;
    const sentNotifs = await this.db
      .select({
        id: notifications.id,
        recipient: notifications.recipient,
        userId: notifications.userId,
      })
      .from(notifications)
      .where(
        and(
          like(notifications.dedupeKey, dedupePrefix),
          inArray(notifications.status, ['sent', 'queued']),
        ),
      );

    if (sentNotifs.length === 0) {
      // Demak, oyna ichida tuzatilgan — ota-onaga hali xabar ketmagan.
      return;
    }

    const info = await this.getStudentLessonInfo(lessonId, studentId);
    if (!info) return;

    for (const notif of sentNotifs) {
      await this.notifications.notify({
        userId: notif.userId,
        type: 'attendance_correction',
        payload: {
          studentName: info.studentName,
          groupName: info.groupName,
          date: info.date,
        },
        dedupeKey: `att:corr:${lessonId}:${studentId}:${notif.userId}`,
        branchId: info.branchId,
      });
    }
  }

  private async resolveNoticeWindowMinutes(): Promise<number> {
    try {
      if (this.settings) {
        const sys = await this.settings.getSettings();
        return sys.absenceNoticeWindowMinutes ?? 3;
      }
    } catch {
      // Standart qiymatga qaytamiz
    }
    return 3;
  }

  private async getStudentLessonInfo(lessonId: string, studentId: string) {
    const [row] = await this.db
      .select({
        studentName: students.fullName,
        groupName: groups.name,
        date: lessons.date,
        branchId: groups.branchId,
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .innerJoin(students, eq(students.id, studentId))
      .where(eq(lessons.id, lessonId));
    return row ?? null;
  }
}
