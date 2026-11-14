import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { OutboxModule } from '../outbox/index.js';
import { StudentsModule } from '../students/index.js';
import { ExcelTestService } from './excel-test.service.js';
import { TestsController } from './tests.controller.js';
import { TestsRepository } from './tests.repository.js';
import { TestsService } from './tests.service.js';

@Module({
  imports: [DbModule, AuditModule, StudentsModule, OutboxModule],
  controllers: [TestsController],
  providers: [TestsRepository, ExcelTestService, TestsService],
  exports: [TestsService, TestsRepository, ExcelTestService],
})
export class TestsModule {}
