import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { OrgModule } from '../org/index.js';
import { StudentsModule } from '../students/index.js';
import { TelegramModule } from '../telegram/index.js';
import { GradesController } from './grades.controller.js';
import { GradesRepository } from './grades.repository.js';
import { GradesService } from './grades.service.js';

@Module({
  imports: [DbModule, AuditModule, OrgModule, StudentsModule, TelegramModule],
  controllers: [GradesController],
  providers: [GradesRepository, GradesService],
  exports: [GradesService, GradesRepository],
})
export class GradesModule {}
