import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { ClockModule } from '../../common/clock/clock.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { SchedulerModule } from '../../common/scheduler/scheduler.module.js';
import { FilesModule } from '../files/index.js';
import { SettingsModule } from '../settings/index.js';
import { StudentsModule } from '../students/index.js';
import { NotificationsModule } from '../notifications/index.js';
import { TelegramModule } from '../telegram/index.js';
import { BillingGeneratorService } from './billing-generator.service.js';
import { MonthCloseRepository } from './month-close.repository.js';
import { MonthCloseService } from './month-close.service.js';
import { BillingController } from './billing.controller.js';
import { BillingCron } from './billing.cron.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingRepository } from './billing.repository.js';
import { BillingService } from './billing.service.js';
import { DebtorsController } from './debtors.controller.js';
import { DebtorsRepository } from './debtors.repository.js';
import { DebtorsService } from './debtors.service.js';
import { DiscountsRepository } from './discounts.repository.js';
import { DiscountsService } from './discounts.service.js';
import { PaymentPreviewController } from './payment-preview.controller.js';
import { CashDayService } from './cash-day.service.js';
import { DiscountListService } from './discount-list.service.js';
import { PaymentPreviewService } from './payment-preview.service.js';
import { PaymentViewService } from './payment-view.service.js';
import { PaymentsService } from './payments.service.js';
import { ReceiptPdfService } from './receipt-pdf.service.js';
import { StornoCashRepository } from './storno-cash.repository.js';
import { StornoCashService } from './storno-cash.service.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsRepository } from './submissions.repository.js';
import { SubmissionsService } from './submissions.service.js';
import { StudentBillingSetupController } from './student-setup.controller.js';
import { StudentBillingSetupService } from './student-setup.service.js';
import { EnrollmentBillingService } from './enrollment-billing.service.js';
import { EnrollmentRemoveController } from './enrollment-remove.controller.js';
import { EnrollmentRemoveService } from './enrollment-remove.service.js';

@Module({
  imports: [
    DbModule,
    AuditModule,
    ClockModule,
    SchedulerModule,
    StudentsModule,
    SettingsModule,
    TelegramModule,
    NotificationsModule,
    FilesModule,
  ],
  controllers: [
    PaymentPreviewController,
    BillingController,
    DebtorsController,
    SubmissionsController,
    StudentBillingSetupController,
    EnrollmentRemoveController,
  ],
  providers: [
    MonthCloseRepository,
    MonthCloseService,
    BillingRepository,
    BillingBalanceRepository,
    BillingGeneratorService,
    BillingService,
    BillingCron,
    PaymentsService,
    PaymentPreviewService,
    DiscountListService,
    CashDayService,
    PaymentViewService,
    DiscountsRepository,
    DiscountsService,
    StornoCashRepository,
    StornoCashService,
    DebtorsRepository,
    DebtorsService,
    ReceiptPdfService,
    SubmissionsRepository,
    SubmissionsService,
    StudentBillingSetupService,
    EnrollmentBillingService,
    EnrollmentRemoveService,
  ],
  exports: [
    BillingService,
    BillingRepository,
    BillingBalanceRepository,
    BillingGeneratorService,
    PaymentsService,
    DiscountsService,
    DiscountsRepository,
    StornoCashService,
    StornoCashRepository,
    DebtorsService,
    DebtorsRepository,
    ReceiptPdfService,
    SubmissionsService,
    SubmissionsRepository,
  ],
})
export class BillingModule {}
