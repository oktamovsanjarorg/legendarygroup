import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller.js';
import { AuditLogRepository } from './audit-log.repository.js';
import { AuditLogService } from './audit-log.service.js';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogRepository, AuditLogService],
  exports: [AuditLogService, AuditLogRepository],
})
export class AuditLogModule {}
