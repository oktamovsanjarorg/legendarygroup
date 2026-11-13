import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import { PermissionsService } from './permissions.service.js';
import { InternalStaffController } from './internal-staff.controller.js';
import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import { StaffDirectoryService } from './staff-directory.service.js';
import { StaffLinkService } from './staff-link.service.js';
import { StaffQueryService } from './staff-query.service.js';
import { StaffController } from './staff.controller.js';
import { TeachersController } from './teachers.controller.js';
import { StaffService } from './staff.service.js';

/**
 * RBAC (T-008) va xodimlarni boshqarish (T-101). `PermissionsGuard` global va `AuthModule`dan KEYIN ro'yxatdan o'tadi
 * (avval token, keyin ruxsat) — `AppModule.imports` tartibi muhim.
 */
@Global()
@Module({
  controllers: [RbacController, StaffController, TeachersController, InternalStaffController],
  providers: [
    PermissionsService,
    RbacService,
    StaffService,
    StaffQueryService,
    StaffLinkService,
    StaffDirectoryService,
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [PermissionsService, RbacService, StaffDirectoryService],
})
export class RbacModule {}
