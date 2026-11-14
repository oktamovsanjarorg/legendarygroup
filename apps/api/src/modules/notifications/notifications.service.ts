import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_BRANCH_ID,
  NOTIFICATION_TYPES,
  type NotificationPreference,
  type NotificationType,
  type UndeliveredNotificationItem,
} from '@lg/contracts';
import { type Database, users } from '@lg/db';
import {
  isNotificationMandatory,
  NOTIFICATION_TITLES_UZ,
  renderNotificationTemplate,
  validatePreferenceUpdate,
} from '@lg/domain';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { TelegramOutbox } from '../telegram/index.js';
import { NotificationsRepository } from './notifications.repository.js';

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  branchId?: string;
}

/** Telegram Markdown formatida maxsus belgilarni tozalaydi */
export function escapeTelegramMarkdown(str: string): string {
  return str
    .replaceAll('\\', '\\\\')
    .replaceAll('_', '\\_')
    .replaceAll('*', '\\*')
    .replaceAll('`', '\\`')
    .replaceAll('[', '\\[');
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NotificationsRepository) private readonly repo: NotificationsRepository,
    @Inject(TelegramOutbox) private readonly telegramOutbox: TelegramOutbox,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  /** Bildirishnoma yuborish (AC: T-109 notify API) */
  async notify(params: NotifyParams): Promise<string | null> {
    const enabled = await this.isTypeEnabled(params.userId, params.type);
    if (!enabled) return null;

    const [user] = await this.db.select().from(users).where(eq(users.id, params.userId));
    if (!user) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }

    const recipient = user.telegramId ? user.telegramId.toString() : user.phone;
    const branchId = params.branchId ?? DEFAULT_BRANCH_ID;
    const rendered = renderNotificationTemplate(params.type, params.payload);
    const safeTitle = rendered.title ? escapeTelegramMarkdown(rendered.title) : '';
    const safeBody = escapeTelegramMarkdown(rendered.body);
    const text = safeTitle ? `*${safeTitle}*\n\n${safeBody}` : safeBody;

    const notif = await this.repo.createNotification({
      branchId,
      userId: params.userId,
      type: params.type,
      recipient,
      title: rendered.title,
      body: rendered.body,
      payload: params.payload,
      status: 'queued',
      dedupeKey: params.dedupeKey,
    });

    if (!notif) return null;

    if (user.telegramId) {
      const jobId = await this.telegramOutbox.enqueue(
        {
          method: 'sendMessage',
          chatId: recipient,
          payload: { text, parse_mode: 'Markdown' },
        },
        { dedupeKey: params.dedupeKey },
      );
      await this.repo.updateStatus(notif.id, 'queued', { sentAt: null });
      return jobId;
    }

    return notif.id;
  }

  private async isTypeEnabled(userId: string, type: NotificationType): Promise<boolean> {
    if (isNotificationMandatory(type)) return true;
    const prefs = await this.repo.getUserPreferences(userId);
    const userPref = prefs.find((p) => p.type === type);
    return userPref ? userPref.enabled : true;
  }

  /** Foydalanuvchi bildirishnoma sozlamalarini oladi */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    const stored = await this.repo.getUserPreferences(userId);
    const storedMap = new Map(stored.map((s) => [s.type, s.enabled]));

    return NOTIFICATION_TYPES.map((type) => {
      const isMandatory = isNotificationMandatory(type);
      const enabled = isMandatory ? true : (storedMap.get(type) ?? true);
      return {
        type,
        enabled,
        isMandatory,
        titleUz: NOTIFICATION_TITLES_UZ[type] ?? type,
      };
    });
  }

  /** Foydalanuvchi sozlamalarini yangilaydi (FR-RPT-4) */
  async updateUserPreferences(
    userId: string,
    updates: Record<NotificationType, boolean>,
  ): Promise<NotificationPreference[]> {
    for (const [key, enabled] of Object.entries(updates)) {
      const type = key as NotificationType;
      const validation = validatePreferenceUpdate(type, enabled);
      if (!validation.valid) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', validation.reason);
      }
      await this.repo.upsertUserPreference(userId, type, enabled);
    }
    return this.getUserPreferences(userId);
  }

  /** Admin uchun "yetib bormagan xabarlar" ro'yxati */
  async getUndelivered(
    branchId: string,
    status?: 'failed' | 'blocked',
  ): Promise<UndeliveredNotificationItem[]> {
    const rows = await this.repo.getUndelivered(branchId, status);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      recipient: r.recipient,
      type: r.type as NotificationType,
      status: r.status as 'failed' | 'blocked',
      failedReason: r.failedReason,
      attempts: r.attempts,
      createdAt: r.createdAt,
    }));
  }

  /** Yetib bormagan xabarni qayta yuborish */
  async retryNotification(id: string): Promise<void> {
    const notif = await this.repo.findById(id);
    if (!notif) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }

    const rendered = renderNotificationTemplate(
      notif.type as NotificationType,
      notif.payload as Record<string, unknown>,
    );
    const safeTitle = rendered.title ? escapeTelegramMarkdown(rendered.title) : '';
    const safeBody = escapeTelegramMarkdown(rendered.body);
    const text = safeTitle ? `*${safeTitle}*\n\n${safeBody}` : safeBody;

    await this.telegramOutbox.enqueue({
      method: 'sendMessage',
      chatId: notif.recipient,
      payload: { text, parse_mode: 'Markdown' },
    });

    await this.repo.updateStatus(notif.id, 'queued', {
      attempts: notif.attempts + 1,
      failedReason: null,
    });
  }
}
