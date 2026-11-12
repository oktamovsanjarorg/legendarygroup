import { Module } from '@nestjs/common';
import { FilesModule } from '../files/index.js';
import { OrgModule } from '../org/index.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsQueryService } from './enrollments-query.service.js';
import { EnrollmentsService } from './enrollments.service.js';
import { FreezesService } from './freezes.service.js';
import { LeadConvertService } from './leads/lead-convert.service.js';
import { LeadsQueryService } from './leads/leads-query.service.js';
import { LeadsController } from './leads/leads.controller.js';
import { LeadsService } from './leads/leads.service.js';
import { PublicLeadsController } from './leads/public-leads.controller.js';
import { RosterController } from './roster.controller.js';
import { StudentGuardiansController } from './student-guardians.controller.js';
import { StudentGuardiansService } from './student-guardians.service.js';
import { StudentScopeService } from './student-scope.service.js';
import { StudentsQueryService } from './students-query.service.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

/**
 * O'quvchilar, ota-onalar (T-105) guruhga yozish (T-106) va lidlar (T-107). Scope va enrollment o'qish —
 * davomat/billing modullari uchun ochiq.
 */
@Module({
  imports: [FilesModule, OrgModule],
  controllers: [
    StudentsController,
    StudentGuardiansController,
    EnrollmentsController,
    RosterController,
    LeadsController,
    PublicLeadsController,
  ],
  providers: [
    EnrollmentsService,
    EnrollmentsQueryService,
    FreezesService,
    StudentsService,
    StudentsQueryService,
    StudentGuardiansService,
    StudentScopeService,
    LeadsQueryService,
    LeadsService,
    LeadConvertService,
  ],
  exports: [StudentScopeService, StudentsQueryService, EnrollmentsQueryService],
})
export class StudentsModule {}
