import { Module } from '@nestjs/common';
import { ApprovalExecutorService } from './approval-executor.service.js';
import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsRepository } from './approvals.repository.js';
import { ApprovalsService } from './approvals.service.js';

@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsRepository, ApprovalsService, ApprovalExecutorService],
  exports: [ApprovalsService, ApprovalsRepository],
})
export class ApprovalsModule {}
