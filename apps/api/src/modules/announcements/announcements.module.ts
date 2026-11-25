import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/index.js';
import { BillingModule } from '../billing/index.js';
import { FilesModule } from '../files/index.js';
import { AnnouncementDispatcher } from './announcement-dispatcher.js';
import { AnnouncementsController } from './announcements.controller.js';
import { AnnouncementsRepository } from './announcements.repository.js';
import { AnnouncementsService } from './announcements.service.js';

@Module({
  imports: [NotificationsModule, BillingModule, FilesModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsRepository, AnnouncementsService, AnnouncementDispatcher],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
