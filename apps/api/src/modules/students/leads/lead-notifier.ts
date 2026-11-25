import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { type Database, leads } from '@lg/db';
import { botMessages } from '@lg/i18n';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { NotificationsService } from '../../notifications/index.js';
import { EventHandlers } from '../../outbox/index.js';

const m = botMessages.staffTask;

/** T-133 (FR-STU-4): saytdagi ariza xodimlarga botda — ilgari lidlar sahifasi ochilguncha bilinmasdi. */
@Injectable()
export class LeadNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  onModuleInit(): void {
    this.events.on('LeadSubmitted', 'students.lead-staff', async ({ payload }) => {
      const [lead] = await this.db
        .select({ fullName: leads.fullName })
        .from(leads)
        .where(eq(leads.id, payload.leadId));
      if (!lead) return;
      await this.notifications.notifyStaff({
        title: m.leadTitle,
        body: m.leadBody.replace('{name}', lead.fullName),
        dedupeKey: `lead-${payload.leadId}`,
      });
    });
  }
}
