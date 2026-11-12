import { Module } from '@nestjs/common';
import { FilesModule } from '../files/index.js';
import { StudentScopeService } from './student-scope.service.js';
import { StudentsQueryService } from './students-query.service.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

/** O'quvchilar va ota-onalar (T-105). Scope servisi — davomat/billing modullari uchun ochiq. */
@Module({
  imports: [FilesModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsQueryService, StudentScopeService],
  exports: [StudentScopeService, StudentsQueryService],
})
export class StudentsModule {}
