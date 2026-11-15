import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/index.js';
import { BillingModule } from '../billing/index.js';
import { NotificationsModule } from '../notifications/index.js';
import { ApprovalNotifier } from './approval-notifier.js';
import { ApprovalExecutor } from './approval-executor.service.js';
import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsRepository } from './approvals.repository.js';
import { ApprovalsService } from './approvals.service.js';

@Module({
  imports: [BillingModule, AttendanceModule, NotificationsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsRepository, ApprovalsService, ApprovalExecutor, ApprovalNotifier],
  exports: [ApprovalsService, ApprovalsRepository],
})
export class ApprovalsModule {}
