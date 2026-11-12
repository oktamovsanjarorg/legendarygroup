import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

/** Tashkiliy tuzilma (T-102): kurslar, xonalar; T-103 — guruhlar va jadval. */
@Module({
  controllers: [CoursesController, RoomsController],
  providers: [CoursesService, RoomsService],
  exports: [CoursesService, RoomsService],
})
export class OrgModule {}
