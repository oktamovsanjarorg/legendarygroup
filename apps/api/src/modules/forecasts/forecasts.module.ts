import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/index.js';
import { ForecastsController } from './forecasts.controller.js';
import { ForecastsCron } from './forecasts.cron.js';
import { ForecastsRepository } from './forecasts.repository.js';
import { ForecastsService } from './forecasts.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ForecastsController],
  providers: [ForecastsRepository, ForecastsService, ForecastsCron],
  exports: [ForecastsService, ForecastsRepository],
})
export class ForecastsModule {}
