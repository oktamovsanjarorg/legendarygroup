import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { PayrollController } from './payroll.controller.js';
import { PayrollRepository } from './payroll.repository.js';
import { PayrollService } from './payroll.service.js';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [PayrollController],
  providers: [PayrollRepository, PayrollService],
  exports: [PayrollService, PayrollRepository],
})
export class PayrollModule {}
