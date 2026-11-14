import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Database, groups } from '@lg/db';
import { eq, inArray } from 'drizzle-orm';
import { DB_TOKEN } from '../../../common/db/db.tokens.js';
import { CronJobs } from '../../../common/scheduler/cron-jobs.js';
import { LessonSyncService } from './lesson-sync.service.js';

export const LESSONS_CRON_ID = 'org.lessons-generate';

/**
 * Har kuni 00:15 (Toshkent) darslarni gorizontgacha generatsiya qilish (FR-ORG-5). Har guruh —
 * alohida tranzaksiya (guruh qatori qulflanadi); bitta guruh xatosi qolganlarini to'xtatmaydi,
 * lekin job xato bilan tugaydi (qayta urinish, so'ng dead-letter + alert). Idempotent.
 */
@Injectable()
export class LessonsCron implements OnModuleInit {
  private readonly logger = new Logger(LessonsCron.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(LessonSyncService) private readonly sync: LessonSyncService,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: LESSONS_CRON_ID,
      pattern: '15 0 * * *',
      run: async () => void (await this.run()),
    });
  }

  async run(): Promise<{ groups: number; created: number; skipped: number; failed: number }> {
    const rows = await this.db
      .select({ id: groups.id })
      .from(groups)
      .where(inArray(groups.status, ['forming', 'active', 'paused']));
    const total = { groups: rows.length, created: 0, skipped: 0, failed: 0 };
    for (const { id } of rows) {
      try {
        const r = await this.db.transaction(async (tx) => {
          await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, id)).for('update');
          return this.sync.sync(tx, id, 'cron');
        });
        total.created += r.created;
        total.skipped += r.skipped;
        if (r.skipped > 0)
          this.logger.warn(`Guruh ${id}: ${r.skipped} ta dars toʻqnashuv sababli yaratilmadi`);
      } catch (err) {
        total.failed++;
        this.logger.error(
          `Guruh ${id} darslari: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    this.logger.log(`Darslar generatsiyasi: ${JSON.stringify(total)}`);
    if (total.failed > 0)
      throw new Error(`${total.failed} ta guruh darslari generatsiya qilinmadi`);
    return total;
  }
}
