import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { miniappMessages } from '@lg/i18n';
import { NotificationsService } from '../notifications/index.js';
import { EventHandlers } from '../outbox/index.js';

const TYPES: Record<string, string> = miniappMessages.approvals.types;

/**
 * T-119: Director qarori (`ApprovalDecided`) → so'rov yaratgan xodimga Telegram xabari
 * (notifications navbati orqali). Dedupe — so'rov ID'si bo'yicha (qayta yetkazilsa takrorlanmaydi).
 */
@Injectable()
export class ApprovalNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.events.on('ApprovalDecided', 'approvals.notify-requester', async ({ payload: p }) => {
      await this.notifications.notify({
        userId: p.requestedBy,
        type: 'approval_decided',
        dedupeKey: `approval-decided-${p.requestId}`,
        payload: { decision: p.decision, typeLabel: TYPES[p.type] ?? p.type, note: p.note },
      });
    });
  }
}
