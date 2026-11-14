import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  type NewNotificationRow,
  notificationPreferences,
  notifications,
  users,
} from '@lg/db';
import type { NotificationStatus, NotificationType } from '@lg/contracts';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface CreateNotificationParams {
  branchId: string;
  userId: string;
  type: NotificationType;
  channel?: 'telegram' | 'sms' | 'push';
  recipient: string;
  title: string | null;
  body: string;
  payload: Record<string, unknown>;
  status?: NotificationStatus;
  jobId?: string;
  dedupeKey?: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Bildirishnomani bazaga yozadi */
  async createNotification(params: CreateNotificationParams) {
    const row: NewNotificationRow = {
      branchId: params.branchId,
      userId: params.userId,
      type: params.type,
      channel: params.channel ?? 'telegram',
      recipient: params.recipient,
      title: params.title,
      body: params.body,
      payload: params.payload,
      status: params.status ?? 'queued',
      jobId: params.jobId,
      dedupeKey: params.dedupeKey ?? null,
    };

    const [created] = await this.db
      .insert(notifications)
      .values(row)
      .onConflictDoNothing()
      .returning();
    return created;
  }

  /** Foydalanuvchi sozlamalarini oladi */
  async getUserPreferences(userId: string) {
    return this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  /** Foydalanuvchi sozlamasini yangilaydi (upsert) */
  async upsertUserPreference(userId: string, type: NotificationType, enabled: boolean) {
    await this.db
      .insert(notificationPreferences)
      .values({ userId, type, enabled })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.type],
        set: { enabled, updatedAt: sql`now()` },
      });
  }

  /** Yetib bormagan (failed/blocked) bildirishnomalar ro'yxati */
  async getUndelivered(branchId: string, status?: 'failed' | 'blocked') {
    const targetStatuses: Array<'failed' | 'blocked' | 'queued' | 'sent'> = status
      ? [status]
      : ['failed', 'blocked'];

    return this.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        userName: users.fullName,
        recipient: notifications.recipient,
        type: notifications.type,
        status: notifications.status,
        failedReason: notifications.failedReason,
        attempts: notifications.attempts,
        createdAt: sql<string>`to_char(${notifications.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      })
      .from(notifications)
      .innerJoin(users, eq(users.id, notifications.userId))
      .where(
        and(eq(notifications.branchId, branchId), inArray(notifications.status, targetStatuses)),
      )
      .orderBy(desc(notifications.createdAt));
  }

  /** ID bo'yicha bildirishnomani topadi */
  async findById(id: string) {
    const [row] = await this.db.select().from(notifications).where(eq(notifications.id, id));
    return row;
  }

  /** Bildirishnoma holatini yangilaydi */
  async updateStatus(
    id: string,
    status: NotificationStatus,
    opts: { attempts?: number; failedReason?: string | null; sentAt?: Date | null } = {},
  ) {
    await this.db
      .update(notifications)
      .set({
        status,
        attempts: opts.attempts !== undefined ? opts.attempts : undefined,
        failedReason: opts.failedReason,
        sentAt: opts.sentAt,
        updatedAt: sql`now()`,
      })
      .where(eq(notifications.id, id));
  }

  /** Chat bloklanganda oxirgi xabarlarni 'blocked' ga o'tkazadi */
  async markChatBlocked(chatId: string, reason: string) {
    await this.db
      .update(notifications)
      .set({
        status: 'blocked',
        failedReason: reason,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(notifications.recipient, chatId),
          inArray(notifications.status, ['queued', 'failed']),
        ),
      );
  }
}
