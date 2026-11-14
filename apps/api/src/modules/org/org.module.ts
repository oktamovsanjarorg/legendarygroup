import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { GroupScheduleController } from './group-schedule.controller.js';
import { GroupScheduleService } from './group-schedule.service.js';
import { GroupScopeService } from './group-scope.service.js';
import { GroupsQueryService } from './groups-query.service.js';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';
import { HolidaysController } from './lessons/holidays.controller.js';
import { HolidaysService } from './lessons/holidays.service.js';
import { LessonMakeupService } from './lessons/lesson-makeup.service.js';
import { LessonSyncService } from './lessons/lesson-sync.service.js';
import { LessonsQueryService } from './lessons/lessons-query.service.js';
import { LessonsController } from './lessons/lessons.controller.js';
import { LessonsService } from './lessons/lessons.service.js';
import { LessonsCron } from './lessons/lessons-cron.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

/** Tashkiliy tuzilma: kurslar, xonalar (T-102), guruhlar va jadval (T-103), darslar va bayramlar (T-104). */
@Module({
  controllers: [
    CoursesController,
    RoomsController,
    GroupsController,
    GroupScheduleController,
    LessonsController,
    HolidaysController,
  ],
  providers: [
    CoursesService,
    RoomsService,
    GroupScopeService,
    GroupsQueryService,
    GroupsService,
    GroupScheduleService,
    LessonSyncService,
    LessonsCron,
    LessonsQueryService,
    LessonsService,
    LessonMakeupService,
    HolidaysService,
  ],
  exports: [
    CoursesService,
    RoomsService,
    GroupScopeService,
    GroupsQueryService,
    LessonsQueryService,
  ],
})
export class OrgModule {}
