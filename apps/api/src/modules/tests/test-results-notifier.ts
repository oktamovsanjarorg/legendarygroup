import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { type Database, guardians, studentGuardians } from '@lg/db';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { NotificationsService } from '../notifications/index.js';
import { EventHandlers } from '../outbox/index.js';
import { TestsRepository } from './tests.repository.js';

/**
 * T-302 (FR-GRD-5): test e'lon qilinganda har o'quvchining botga ulangan ota-onalariga natija.
 * Idempotent: dedupe kaliti — test + o'quvchi + ota-ona (qayta yetkazilgan event takrorlamaydi).
 */
@Injectable()
export class TestResultsNotifier implements OnModuleInit {
  constructor(
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(TestsRepository) private readonly repo: TestsRepository,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  onModuleInit(): void {
    this.events.on('TestResultsPublished', 'tests.notify-parents', async (e) => {
      await this.notifyParents(e.payload.testId);
    });
  }

  async notifyParents(testId: string): Promise<number> {
    const test = await this.repo.findTestById(testId);
    if (!test) return 0;
    const results = await this.repo.findTestResultsWithStudents(testId);
    if (results.length === 0) return 0;
    const parents = await this.db
      .select({ studentId: studentGuardians.studentId, userId: guardians.userId })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(
        and(
          inArray(
            studentGuardians.studentId,
            results.map((r) => r.studentId),
          ),
          isNotNull(guardians.userId),
        ),
      );
    let sent = 0;
    for (const r of results) {
      for (const p of parents.filter((x) => x.studentId === r.studentId)) {
        if (!p.userId) continue;
        await this.notifications.notify({
          userId: p.userId,
          type: 'test_results_published',
          branchId: test.branchId,
          dedupeKey: `test-result-${testId}-${r.studentId}-${p.userId}`,
          payload: {
            studentName: r.studentName,
            testTitle: test.title,
            score: `${r.score}/${test.maxScore}`,
          },
        });
        sent += 1;
      }
    }
    return sent;
  }
}
