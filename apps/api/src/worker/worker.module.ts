import { Module } from '@nestjs/common';
import { AttendanceModule } from '../modules/attendance/index.js';
import { FilesModule } from '../modules/files/index.js';
import { NotificationsModule } from '../modules/notifications/index.js';
import { BoardServer } from './board.server.js';
import { ConsumersRunner } from './consumers.runner.js';
import { RelayRunner } from './relay.runner.js';
import { TelegramSender } from './telegram.sender.js';

/** Faqat worker jarayonida yuklanadi (`bootstrapWorker`): relay, iste'molchilar, cron, Bull Board. */
@Module({
  imports: [AttendanceModule, FilesModule, NotificationsModule],
  providers: [RelayRunner, ConsumersRunner, TelegramSender, BoardServer],
})
export class WorkerModule {}
