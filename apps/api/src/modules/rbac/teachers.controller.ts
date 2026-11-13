import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TeacherOption } from '@lg/contracts';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { StaffDirectoryService } from './staff-directory.service.js';

/**
 * Ustozlar katalogi (W-10 guruh formasi, W-11 o'rinbosar): `GET /staff` faqat Director'ga
 * (`staff.manage`), Admin esa ustoz tanlashi kerak. Faqat id va ism — telefon/holat yo'q.
 */
@ApiTags('Staff')
@ApiBearerAuth()
@Controller('teachers')
export class TeachersController {
  constructor(@Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService) {}

  @Get()
  @RequirePermission('group.view')
  @ApiOperation({ summary: 'Faol ustozlar (id, ism)' })
  list(): Promise<TeacherOption[]> {
    return this.staff.activeTeachers();
  }
}
