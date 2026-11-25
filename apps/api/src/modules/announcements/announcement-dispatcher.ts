import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { AnnouncementRecipientRow, AnnouncementRow } from '@lg/db';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { NotificationsService } from '../notifications/index.js';
import { EventHandlers } from '../outbox/index.js';
import { AnnouncementsRepository } from './announcements.repository.js';

/** `failedReason`: ota-ona e'lon xabarlarini o'chirgan (FR-RPT-4). */
export const OPTED_OUT = 'OPTED_OUT';

/**
 * E'lon yuborish (T-139, FR-RPT-5/6): har qabul qiluvchi uchun bitta bildirishnoma (dedupe —
 * e'lon+foydalanuvchi). Qayta yetkazilsa — faqat qolganlar yuboriladi.
 */
@Injectable()
export class AnnouncementDispatcher implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(AnnouncementsRepository) private readonly repo: AnnouncementsRepository,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.events.on('AnnouncementCreated', 'announcements.dispatch', async ({ payload }) =>
      this.dispatch(payload.announcementId),
    );
  }

  private async dispatch(id: string): Promise<void> {
    const row = await this.repo.findById(id);
    if (!row) return;
    for (const r of await this.repo.findRecipients(id))
      if (r.notificationId === null && r.status === 'queued')
        await this.sendOne(row.announcement, r);
    await this.repo.markCompleted(id, this.clock.now());
  }

  private async sendOne(a: AnnouncementRow, r: AnnouncementRecipientRow): Promise<void> {
    const notificationId = await this.notifications.notify({
      userId: r.userId,
      type: 'announcement',
      branchId: a.branchId,
      dedupeKey: `announcement-${a.id}-${r.userId}`,
      payload: {
        title: a.title,
        body: a.body,
        ...(a.fileId ? { fileId: a.fileId, fileType: a.fileType, fileName: a.title } : {}),
      },
    });
    const d = notificationId
      ? (await this.notifications.deliveryOf([notificationId])).get(notificationId)
      : undefined;
    const failed = notificationId === null || d?.status === 'failed';
    await this.repo.updateRecipientDelivery(a.id, r.userId, {
      notificationId,
      // Haqiqiy holat (navbatda/yetdi/bloklandi) — bildirishnomaning o'zidan o'qiladi.
      status: failed ? 'failed' : 'queued',
      failedReason: failed ? (d?.failedReason ?? OPTED_OUT) : null,
    });
  }
}
