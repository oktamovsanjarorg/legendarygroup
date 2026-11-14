import { Module } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { InternalFilesController } from './internal-files.controller.js';

@Module({
  controllers: [FilesController, InternalFilesController],
  providers: [FilesService, InternalTokenGuard],
  exports: [FilesService],
})
export class FilesModule {}
