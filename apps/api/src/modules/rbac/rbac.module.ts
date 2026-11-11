import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import { PermissionsService } from './permissions.service.js';
import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';

/**
 * RBAC (T-008). `PermissionsGuard` global va `AuthModule`dan KEYIN ro'yxatdan o'tadi
 * (avval token, keyin ruxsat) — `AppModule.imports` tartibi muhim.
 */
@Global()
@Module({
  controllers: [RbacController],
  providers: [PermissionsService, RbacService, { provide: APP_GUARD, useClass: PermissionsGuard }],
  exports: [PermissionsService, RbacService],
})
export class RbacModule {}
