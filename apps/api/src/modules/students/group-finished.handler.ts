import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { SYSTEM_ACTOR } from '../../common/audit/audit.service.js';
import { EventHandlers } from '../outbox/index.js';
import { EnrollmentsService } from './enrollments.service.js';

/**
 * Q-102: guruh yakunlansa ochiq a'zoliklar ham yopiladi. Ilgari ochiq qolardi: har oy hisob
 * yozilaverardi va o'quvchini arxivlab bo'lmasdi (Q-93).
 */
@Injectable()
export class GroupFinishedHandler implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
  ) {}

  onModuleInit(): void {
    this.events.on('GroupFinished', 'students.group-finished', ({ payload }, tx) =>
      this.enrollments.finishGroup(SYSTEM_ACTOR, payload, tx),
    );
  }
}
