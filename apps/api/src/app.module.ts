import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { AuditModule } from './common/audit/audit.module.js';
import { ClockModule } from './common/clock/clock.module.js';
import { DbModule } from './common/db/db.module.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { QueueModule } from './common/queue/queue.module.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { SchedulerModule } from './common/scheduler/scheduler.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { ConfigModule } from './config/config.module.js';
import type { EnvService } from './config/env.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { InternalModule } from './modules/internal/internal.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { ApprovalsModule } from './modules/approvals/approvals.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { GradesModule } from './modules/grades/grades.module.js';
import { OrgModule } from './modules/org/org.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { TelegramModule } from './modules/telegram/telegram.module.js';
import { WorkerModule } from './worker/worker.module.js';

export interface AppModuleOptions {
  /** `worker` — relay, iste'molchilar, cron va Bull Board ham yuklanadi. */
  role: 'api' | 'worker';
  /** Qo'shimcha modullar (testlarda — handler/cron ro'yxatdan o'tkazuvchi test modullari). */
  extra?: (Type | DynamicModule)[];
}

@Module({})
export class AppModule {
  static forRoot(env: EnvService, opts: AppModuleOptions = { role: 'api' }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        ClockModule,
        DbModule,
        RedisModule,
        QueueModule,
        SchedulerModule,
        OutboxModule,
        TelegramModule,
        AuditModule,
        RateLimitModule,
        StorageModule,
        IdempotencyModule,
        AuthModule,
        RbacModule, // AuthModule'dan keyin: guard tartibi
        FilesModule,
        OrgModule,
        StudentsModule,
        SettingsModule,
        BillingModule,
        ApprovalsModule,
        AttendanceModule,
        GradesModule,
        HealthModule,
        InternalModule,
        ...(opts.role === 'worker' ? [WorkerModule] : []),
        ...(opts.extra ?? []),
      ],
    };
  }
}
