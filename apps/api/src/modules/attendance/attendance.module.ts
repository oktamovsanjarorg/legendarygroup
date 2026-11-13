import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { ClockModule } from '../../common/clock/clock.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { OrgModule } from '../org/index.js';
import { StudentsModule } from '../students/index.js';
import { TelegramModule } from '../telegram/index.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [DbModule, AuditModule, ClockModule, OrgModule, StudentsModule, TelegramModule],
  controllers: [AttendanceController],
  providers: [AttendanceRepository, AttendanceService],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
