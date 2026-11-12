import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { GroupScopeService } from './group-scope.service.js';
import { GroupsQueryService } from './groups-query.service.js';
import { GroupsController } from './groups.controller.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

/** Tashkiliy tuzilma: kurslar, xonalar (T-102), guruhlar va jadval (T-103). */
@Module({
  controllers: [CoursesController, RoomsController, GroupsController],
  providers: [CoursesService, RoomsService, GroupScopeService, GroupsQueryService],
  exports: [CoursesService, RoomsService, GroupScopeService, GroupsQueryService],
})
export class OrgModule {}
