import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DbModule } from '../../common/db/db.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [DbModule, AuditModule],
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
