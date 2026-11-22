import { Module } from '@nestjs/common';
import { FilesModule } from '../files/index.js';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackRepository } from './feedback.repository.js';
import { FeedbackService } from './feedback.service.js';

@Module({
  imports: [FilesModule],
  controllers: [FeedbackController],
  providers: [FeedbackRepository, FeedbackService],
  exports: [FeedbackService, FeedbackRepository],
})
export class FeedbackModule {}
