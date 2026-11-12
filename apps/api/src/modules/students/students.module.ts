import { Module } from '@nestjs/common';
import { FilesModule } from '../files/index.js';
import { OrgModule } from '../org/index.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';
import { FreezesService } from './freezes.service.js';
import { StudentGuardiansController } from './student-guardians.controller.js';
import { StudentGuardiansService } from './student-guardians.service.js';
import { StudentScopeService } from './student-scope.service.js';
import { StudentsQueryService } from './students-query.service.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

/** O'quvchilar va ota-onalar (T-105). Scope servisi — davomat/billing modullari uchun ochiq. */
@Module({
  imports: [FilesModule, OrgModule],
  controllers: [StudentsController, StudentGuardiansController, EnrollmentsController],
  providers: [
    EnrollmentsService,
    FreezesService,
    StudentsService,
    StudentsQueryService,
    StudentGuardiansService,
    StudentScopeService,
  ],
  exports: [StudentScopeService, StudentsQueryService],
})
export class StudentsModule {}
