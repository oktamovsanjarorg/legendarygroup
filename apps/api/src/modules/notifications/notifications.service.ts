import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_BRANCH_ID,
  NOTIFICATION_TYPES,
  STAFF_NOTIFICATION_TYPES,
  type NotificationPreference,
  type NotificationStatus,
  type NotificationType,
  type RoleCode,
  type UndeliveredNotificationItem,
} from '@lg/contracts';
import { type Database, type NotificationRow, users } from '@lg/db';
import {
  type Clock,
  isNotificationMandatory,
  NOTIFICATION_TITLES_UZ,
  renderNotificationTemplate,
  telegramMessage,
  validatePreferenceUpdate,
} from '@lg/domain';
import { eq } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { StaffDirectoryService } from '../rbac/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import { NotificationsRepository } from './notifications.repository.js';

/** `failedReason`: foydalanuvchida Telegram yo'q. */
export const NO_TELEGRAM = 'NO_TELEGRAM';
/** `failedReason`: navbatga (Redis) qo'yib bo'lmadi — W-22 dan qayta yuboriladi. */
export const ENQUEUE_FAILED = 'ENQUEUE_FAILED';

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  branchId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NotificationsRepository) private readonly repo: NotificationsRepository,
    @Inject(TelegramOutbox) private readonly telegramOutbox: TelegramOutbox,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /**
   * Bildirishnoma yuborish (AC: T-109 notify API). Qaytaradi: bildirishnoma ID'si (BullMQ job
   * ID'si emas); turi o'chirilgan yoki dedupe — `null`.
   */
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
      await this.enqueue(notif, recipient, params.dedupeKey);
      return notif.id;
    }

    // Telegram bog'lanmagan — yuborib bo'lmaydi: W-22 da ko'rinadi, bog'langach qayta yuboriladi.
    await this.repo.updateStatus(notif.id, 'failed', { failedReason: NO_TELEGRAM });
    return notif.id;
  }

  /**
   * Navbatga qo'yish: matn va (bo'lsa) fayl alohida xabar — caption 1024 belgi bilan cheklangan.
   * Navbat ishlamasa — `failed`: aks holda `queued` qator dedupe tufayli hech qachon yuborilmasdi.
   */
  async enqueue(notif: NotificationRow, chatId: string, dedupeKey?: string): Promise<void> {
    const payload = notif.payload;
    const rendered = renderNotificationTemplate(notif.type, payload);
    const base = { chatId, notificationId: notif.id };
    try {
      await this.telegramOutbox.enqueue(
        { ...base, method: 'sendMessage', payload: telegramMessage(rendered) },
        { dedupeKey },
      );
      if (typeof payload.fileId === 'string')
        await this.telegramOutbox.enqueue(
          {
            ...base,
            method: payload.fileType === 'image' ? 'sendPhoto' : 'sendDocument',
            payload: {},
            file: { id: payload.fileId, name: String(payload.fileName ?? 'fayl') },
          },
          { dedupeKey: dedupeKey && `${dedupeKey}-file` },
        );
    } catch (err) {
      await this.repo.updateStatus(notif.id, 'failed', { failedReason: ENQUEUE_FAILED });
      throw err;
    }
  }

  /** Telegram qabul qildi (worker). */
  async markSent(id: string): Promise<void> {
    await this.repo.markSent(id, this.clock.now());
  }

  /**
   * Q-99: yangi ish haqida botga ulangan faol Admin/Director'larga. `dedupeKey` — hodisa ID'si
   * (event qayta yetkazilsa ham har xodimga bir marta).
   */
  async notifyStaff(task: { title: string; body: string; dedupeKey: string }): Promise<void> {
    for (const userId of await this.staff.linkedManagerIds())
      await this.notify({
        userId,
        type: 'staff_task',
        dedupeKey: `${task.dedupeKey}-${userId}`,
        payload: { title: task.title, body: task.body },
      });
  }

  private async isTypeEnabled(userId: string, type: NotificationType): Promise<boolean> {
    if (isNotificationMandatory(type)) return true;
    const prefs = await this.repo.getUserPreferences(userId);
    const userPref = prefs.find((p) => p.type === type);
    return userPref ? userPref.enabled : true;
  }

  /** Foydalanuvchi bildirishnoma sozlamalarini oladi */
  async getUserPreferences(userId: string, role?: RoleCode): Promise<NotificationPreference[]> {
    const stored = await this.repo.getUserPreferences(userId);
    const storedMap = new Map(stored.map((s) => [s.type, s.enabled]));

    const staffOnly: readonly NotificationType[] = STAFF_NOTIFICATION_TYPES;
    const shown = NOTIFICATION_TYPES.filter((x) => role !== 'guardian' || !staffOnly.includes(x));
    return shown.map((type) => {
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
    updates: Partial<Record<NotificationType, boolean>>,
    role?: RoleCode,
  ): Promise<NotificationPreference[]> {
    for (const type of NOTIFICATION_TYPES) {
      const enabled = updates[type];
      if (enabled === undefined) continue;
      const validation = validatePreferenceUpdate(type, enabled);
      if (!validation.valid) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', validation.reason);
      }
      await this.repo.upsertUserPreference(userId, type, enabled);
    }
    return this.getUserPreferences(userId, role);
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
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Yetkazish holati (e'lon statistikasi uchun — boshqa modul jadvalga to'g'ridan-to'g'ri kirmaydi). */
  async deliveryOf(
    ids: string[],
  ): Promise<
    Map<string, { status: NotificationStatus; failedReason: string | null; sentAt: Date | null }>
  > {
    const rows = await this.repo.findStatuses(ids);
    return new Map(
      rows.map((r) => [r.id, { status: r.status, failedReason: r.failedReason, sentAt: r.sentAt }]),
    );
  }
}
