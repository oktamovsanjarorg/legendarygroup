import { Global, Module } from '@nestjs/common';
import { CronJobs } from './cron-jobs.js';

@Global()
@Module({ providers: [CronJobs], exports: [CronJobs] })
export class SchedulerModule {}
