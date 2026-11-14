import { Module } from '@nestjs/common';
import { AttendanceModule } from '../modules/attendance/index.js';
import { BoardServer } from './board.server.js';
import { ConsumersRunner } from './consumers.runner.js';
import { RelayRunner } from './relay.runner.js';
import { TelegramSender } from './telegram.sender.js';

/** Faqat worker jarayonida yuklanadi (`bootstrapWorker`): relay, iste'molchilar, cron, Bull Board. */
@Module({
  imports: [AttendanceModule],
  providers: [RelayRunner, ConsumersRunner, TelegramSender, BoardServer],
})
export class WorkerModule {}
