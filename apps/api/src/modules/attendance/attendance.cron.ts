import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { AttendanceService } from './attendance.service.js';

@Injectable()
export class AttendanceCron implements OnModuleInit {
  private readonly logger = new Logger(AttendanceCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(AttendanceService) private readonly service: AttendanceService,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: 'attendance.unmarked-reminder',
      pattern: '*/10 * * * *',
      run: async () => {
        try {
          const res = await this.service.sendAttendanceReminders();
          if (res.teacherReminders > 0 || res.adminReminders > 0) {
            this.logger.log(
              `Davomat eslatmalari: ustozlarga ${res.teacherReminders}, adminlarga ${res.adminReminders}`,
            );
          }
        } catch (err) {
          this.logger.error('Davomat eslatmalarida xatolik:', err);
        }
      },
    });
  }
}
