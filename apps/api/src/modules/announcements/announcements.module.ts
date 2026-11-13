import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/index.js';
import { AnnouncementsController } from './announcements.controller.js';
import { AnnouncementsRepository } from './announcements.repository.js';
import { AnnouncementsService } from './announcements.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsRepository, AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
