import { Inject, Injectable } from '@nestjs/common';
import type { UnmarkedLessonItem, UnmarkedLessonsQuery } from '@lg/contracts';
import { addDays, type Clock, hhmm, tashkentInstant } from '@lg/domain';
import { botMessages } from '@lg/i18n';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { NotificationsService } from '../notifications/index.js';
import { SettingsService } from '../settings/index.js';
import { AttendanceRepository } from './attendance.repository.js';

const texts = botMessages.attendanceReminder;
const fill = (text: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((out, [k, v]) => out.replace(`{${k}}`, v), text);

/** Sanasiz so'rovda belgilanmagan darslar shu kungacha orqaga qaraladi. */
const UNMARKED_DAYS = 31;
/** FR-ATT-5: Admin'ga eslatma. */
const ADMIN_AFTER_MIN = 120;

/** FR-ATT-5: belgilanmagan darslar ro'yxati va eslatmalar (ustoz — sozlangan daqiqa, Admin — 2 soat). */
@Injectable()
export class UnmarkedLessonsService {
  constructor(
    @Inject(AttendanceRepository) private readonly repo: AttendanceRepository,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async getUnmarkedLessons(
    user: RequestUser,
    query: UnmarkedLessonsQuery,
  ): Promise<{ items: UnmarkedLessonItem[] }> {
    const branchId = user.role === 'admin' || user.role === 'director' ? query.branchId : undefined;
    const to = query.date ?? this.clock.today();
    const rows = await this.repo.findUnmarkedLessons({
      from: query.date ?? addDays(to, -UNMARKED_DAYS),
      to,
      branchId,
    });

    const now = this.clock.now();
    const items: UnmarkedLessonItem[] = [];

    for (const r of rows) {
      const lessonStartTime = tashkentInstant(r.date, r.startTime);
      const minutesPassed = Math.floor((now.getTime() - lessonStartTime.getTime()) / 60000);

      if (minutesPassed > 0) {
        items.push({
          lessonId: r.lessonId,
          groupId: r.groupId,
          groupName: r.groupName,
          courseName: r.courseName,
          teacherId: r.teacherId ?? '',
          teacherName: r.teacherName ?? '',
          date: r.date,
          startTime: hhmm(r.startTime),
          endTime: hhmm(r.endTime),
          minutesPassed,
        });
      }
    }

    return { items };
  }

  async sendAttendanceReminders(): Promise<{ teacherReminders: number; adminReminders: number }> {
    const now = this.clock.now();
    const today = this.clock.today();
    const unmarked = await this.repo.findUnmarkedLessons({ from: today, to: today });

    const { notificationTimes } = await this.settings.getSettings();
    const remindAfter = notificationTimes.attendanceReminderMinutes;

    let teacherReminders = 0;
    let adminReminders = 0;
    const admins = await this.repo.findAdminUsers();

    for (const lesson of unmarked) {
      const lessonStartTime = tashkentInstant(lesson.date, lesson.startTime);
      const minutesPassed = Math.floor((now.getTime() - lessonStartTime.getTime()) / 60000);

      if (lesson.teacherId && minutesPassed >= remindAfter && minutesPassed < ADMIN_AFTER_MIN) {
        await this.notifications.notify({
          userId: lesson.teacherId,
          type: 'announcement',
          payload: {
            title: texts.teacherTitle,
            message: fill(texts.teacherBody, {
              group: lesson.groupName,
              min: String(minutesPassed),
            }),
          },
          dedupeKey: `att_rem_teacher_${lesson.lessonId}_${lesson.date}`,
        });
        teacherReminders += 1;
      }

      if (minutesPassed >= ADMIN_AFTER_MIN) {
        for (const admin of admins) {
          await this.notifications.notify({
            userId: admin.id,
            type: 'announcement',
            payload: {
              title: texts.adminTitle,
              message: fill(texts.adminBody, {
                teacher: lesson.teacherName ?? texts.noTeacher,
                group: lesson.groupName,
              }),
            },
            dedupeKey: `att_rem_admin_${admin.id}_${lesson.lessonId}_${lesson.date}`,
          });
          adminReminders += 1;
        }
      }
    }

    return { teacherReminders, adminReminders };
  }
}
