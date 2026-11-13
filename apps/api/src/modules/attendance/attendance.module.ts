import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { ClockModule } from '../../common/clock/clock.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { QueueModule } from '../../common/queue/queue.module.js';
import { NotificationsModule } from '../notifications/index.js';
import { OrgModule } from '../org/index.js';
import { OutboxModule } from '../outbox/index.js';
import { SettingsModule } from '../settings/index.js';
import { StudentsModule } from '../students/index.js';
import { TelegramModule } from '../telegram/index.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceNoticeProcessor } from './attendance-notice.processor.js';
import { AttendanceNoticeService } from './attendance-notice.service.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [
    DbModule,
    AuditModule,
    ClockModule,
    QueueModule,
    OrgModule,
    StudentsModule,
    TelegramModule,
    OutboxModule,
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceRepository,
    AttendanceService,
    AttendanceNoticeService,
    AttendanceNoticeProcessor,
  ],
  exports: [
    AttendanceService,
    AttendanceRepository,
    AttendanceNoticeService,
    AttendanceNoticeProcessor,
  ],
})
export class AttendanceModule {}
