import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicCourse } from '@lg/contracts';
import { Public } from '../../common/decorators/public.decorator.js';
import { CoursesService } from './courses.service.js';

/** Landing (W-35, T-503): faol kurslar — autentifikatsiyasiz, faqat ommaviy maydonlar. */
@Public()
@ApiTags('Public')
@Controller('public/courses')
export class PublicCoursesController {
  constructor(@Inject(CoursesService) private readonly courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Faol kurslar (landing)' })
  async list(): Promise<PublicCourse[]> {
    const rows = await this.courses.list('active');
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      defaultMonthlyPrice: c.defaultMonthlyPrice,
      lessonDurationMin: c.lessonDurationMin,
      durationMonths: c.durationMonths,
    }));
  }
}
