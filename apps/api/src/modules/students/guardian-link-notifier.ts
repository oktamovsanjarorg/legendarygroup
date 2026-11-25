import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { type Database, guardianLinkRequests } from '@lg/db';
import { botMessages } from '@lg/i18n';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { NotificationsService } from '../notifications/index.js';
import { EventHandlers } from '../outbox/index.js';

const m = botMessages.staffTask;

/** T-135 (FR-AUTH-1): yangi so'rov → xodimlarga; tasdiq → ota-onaga (ilgari hech kim bilmasdi). */
@Injectable()
export class GuardianLinkNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  onModuleInit(): void {
    this.events.on('GuardianLinkRequested', 'students.link-request-staff', async ({ payload }) => {
      const [req] = await this.db
        .select({ fullName: guardianLinkRequests.fullName })
        .from(guardianLinkRequests)
        .where(eq(guardianLinkRequests.id, payload.requestId));
      if (!req) return;
      await this.notifications.notifyStaff({
        title: m.linkTitle,
        body: m.linkBody.replace('{name}', req.fullName),
        dedupeKey: `link-request-${payload.requestId}`,
      });
    });
    this.events.on('GuardianLinkApproved', 'students.link-approved', async ({ payload }) => {
      await this.notifications.notify({
        userId: payload.userId,
        type: 'link_approved',
        dedupeKey: `link-approved-${payload.requestId}`,
        payload: {},
      });
    });
  }
}
