import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';

/** Tashkiliy tuzilma (T-102): kurslar, xonalar; T-103 — guruhlar va jadval. */
@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class OrgModule {}
