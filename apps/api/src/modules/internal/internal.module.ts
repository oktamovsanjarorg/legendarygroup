import { Module } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/index.js';
import { InternalController } from './internal.controller.js';

@Module({
  controllers: [InternalController],
  providers: [InternalTokenGuard],
  exports: [InternalTokenGuard],
})
export class InternalModule {}
