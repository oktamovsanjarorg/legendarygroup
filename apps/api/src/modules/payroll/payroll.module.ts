import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { PayrollController } from './payroll.controller.js';
import { PayrollGenerator } from './payroll-generator.js';
import { PayrollMetricsRepository } from './payroll-metrics.repository.js';
import { PayrollTermsController } from './payroll-terms.controller.js';
import { PayrollTermsRepository } from './payroll-terms.repository.js';
import { PayrollTermsService } from './payroll-terms.service.js';
import { PayrollRepository } from './payroll.repository.js';
import { PayrollService } from './payroll.service.js';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [PayrollController, PayrollTermsController],
  providers: [
    PayrollRepository,
    PayrollTermsRepository,
    PayrollMetricsRepository,
    PayrollGenerator,
    PayrollService,
    PayrollTermsService,
  ],
  exports: [PayrollService, PayrollRepository],
})
export class PayrollModule {}
