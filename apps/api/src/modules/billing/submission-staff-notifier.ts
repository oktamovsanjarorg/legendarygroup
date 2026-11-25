import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { botMessages } from '@lg/i18n';
import { NotificationsService } from '../notifications/index.js';
import { EventHandlers } from '../outbox/index.js';

/** BR-13: yangi chek → tekshiruvchi xodimlarga (MS-02 «bot orqali xabar beramiz» va'dasi). */
@Injectable()
export class SubmissionStaffNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.events.on('PaymentSubmissionCreated', 'billing.submission-staff', async ({ payload }) => {
      await this.notifications.notifyStaff({
        title: botMessages.staffTask.submissionTitle,
        body: botMessages.staffTask.submissionBody,
        dedupeKey: `submission-${payload.submissionId}`,
      });
    });
  }
}
