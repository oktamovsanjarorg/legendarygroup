import { NotificationsModule } from '../notifications/index.js';
import { TestResultsNotifier } from './test-results-notifier.js';
import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { FilesModule } from '../files/index.js';
import { TestTemplateDeliveryService } from './test-template-delivery.service.js';
import { OutboxModule } from '../outbox/index.js';
import { OrgModule } from '../org/index.js';
import { StudentsModule } from '../students/index.js';
import { ExcelTestService } from './excel-test.service.js';
import { TestsController } from './tests.controller.js';
import { TestsRepository } from './tests.repository.js';
import { TestsService } from './tests.service.js';

@Module({
  imports: [
    DbModule,
    AuditModule,
    OrgModule,
    StudentsModule,
    OutboxModule,
    NotificationsModule,
    FilesModule,
  ],
  controllers: [TestsController],
  providers: [
    TestsRepository,
    ExcelTestService,
    TestsService,
    TestResultsNotifier,
    TestTemplateDeliveryService,
  ],
  exports: [TestsService, TestsRepository, ExcelTestService],
})
export class TestsModule {}
