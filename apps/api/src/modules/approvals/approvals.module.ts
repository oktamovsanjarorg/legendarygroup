import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsRepository } from './approvals.repository.js';
import { ApprovalsService } from './approvals.service.js';

@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsRepository, ApprovalsService],
  exports: [ApprovalsService, ApprovalsRepository],
})
export class ApprovalsModule {}
