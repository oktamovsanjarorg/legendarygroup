import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/index.js';
import { StudentsModule } from '../students/index.js';
import { TicketsController } from './tickets.controller.js';
import { TicketNotifier } from './ticket-notifier.js';
import { TicketsRepository } from './tickets.repository.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [NotificationsModule, StudentsModule],
  controllers: [TicketsController],
  providers: [TicketsRepository, TicketsService, TicketNotifier],
  exports: [TicketsService],
})
export class TicketsModule {}
