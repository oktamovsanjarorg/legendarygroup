import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { ClockModule } from '../../common/clock/clock.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { SchedulerModule } from '../../common/scheduler/scheduler.module.js';
import { FilesModule } from '../files/index.js';
import { SettingsModule } from '../settings/index.js';
import { StudentsModule } from '../students/index.js';
import { TelegramModule } from '../telegram/index.js';
import { BillingGeneratorService } from './billing-generator.service.js';
import { BillingController } from './billing.controller.js';
import { BillingCron } from './billing.cron.js';
import { BillingRepository } from './billing.repository.js';
import { BillingService } from './billing.service.js';
import { DebtorsController } from './debtors.controller.js';
import { DebtorsRepository } from './debtors.repository.js';
import { DebtorsService } from './debtors.service.js';
import { DiscountsRepository } from './discounts.repository.js';
import { DiscountsService } from './discounts.service.js';
import { PaymentsService } from './payments.service.js';
import { ReceiptPdfService } from './receipt-pdf.service.js';
import { StornoCashRepository } from './storno-cash.repository.js';
import { StornoCashService } from './storno-cash.service.js';
import { SubmissionsController } from './submissions.controller.js';
import { SubmissionsRepository } from './submissions.repository.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [
    DbModule,
    AuditModule,
    ClockModule,
    SchedulerModule,
    StudentsModule,
    SettingsModule,
    TelegramModule,
    FilesModule,
  ],
  controllers: [BillingController, DebtorsController, SubmissionsController],
  providers: [
    BillingRepository,
    BillingGeneratorService,
    BillingService,
    BillingCron,
    PaymentsService,
    DiscountsRepository,
    DiscountsService,
    StornoCashRepository,
    StornoCashService,
    DebtorsRepository,
    DebtorsService,
    ReceiptPdfService,
    SubmissionsRepository,
    SubmissionsService,
  ],
  exports: [
    BillingService,
    BillingRepository,
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
