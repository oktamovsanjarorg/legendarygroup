import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { botMessages } from '@lg/i18n';
import { NotificationsService } from '../notifications/index.js';
import { EventHandlers } from '../outbox/index.js';
import { TicketsRepository } from './tickets.repository.js';

/** FR-RPT-7 (T-138): xodim javobi → murojaat egasiga; egasining xabari → xodimlarga. */
@Injectable()
export class TicketNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(TicketsRepository) private readonly repo: TicketsRepository,
  ) {}

  onModuleInit(): void {
    this.events.on('TicketMessageCreated', 'tickets.notify', async ({ payload }) => {
      const row = await this.repo.messageWithTicket(payload.messageId);
      if (!row) return;
      const { message, ticket } = row;
      const dedupeKey = `ticket-message-${message.id}`;
      if (message.authorId !== ticket.authorId) {
        await this.notifications.notify({
          userId: ticket.authorId,
          type: 'ticket_reply',
          dedupeKey,
          payload: { subject: ticket.subject, text: message.text },
        });
        return;
      }
      await this.notifications.notifyStaff({
        title: botMessages.staffTask.ticketTitle.replace('{name}', row.authorName),
        body: message.text,
        dedupeKey,
      });
    });
  }
}
