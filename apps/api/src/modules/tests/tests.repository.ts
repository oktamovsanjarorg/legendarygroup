import {
  type Database,
  enrollments,
  type ImportRow,
  imports,
  type NewImportRow,
  type NewTestRow,
  students,
  type TestResultRow,
  testResults,
  type TestRow,
  tests,
} from '@lg/db';
import type { TestSectionScore } from '@lg/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

export interface GroupStudentEntry {
  id: string;
  code: number;
  fullName: string;
}

@Injectable()
export class TestsRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async createTest(data: NewTestRow): Promise<TestRow> {
    const [row] = await this.db.insert(tests).values(data).returning();
    if (!row) throw new Error('TEST_CREATE_FAILED');
    return row;
  }

  async updateTest(id: string, patch: Partial<NewTestRow>): Promise<TestRow | undefined> {
    const [row] = await this.db
      .update(tests)
      .set({ ...patch, updatedAt: this.clock.now() })
      .where(eq(tests.id, id))
      .returning();
    return row;
  }

  async findTestById(id: string): Promise<TestRow | undefined> {
    const [row] = await this.db.select().from(tests).where(eq(tests.id, id));
    return row;
  }

  async findTestsByGroupId(groupId: string): Promise<TestRow[]> {
    return this.db.select().from(tests).where(eq(tests.groupId, groupId)).orderBy(desc(tests.date));
  }

  async findTestResultsWithStudents(testId: string): Promise<
    Array<
      TestResultRow & {
        studentName: string;
        studentCode: number;
      }
    >
  > {
    const rows = await this.db
      .select({
        id: testResults.id,
        testId: testResults.testId,
        studentId: testResults.studentId,
        score: testResults.score,
        sectionScores: testResults.sectionScores,
        version: testResults.version,
        clientMutationId: testResults.clientMutationId,
        createdAt: testResults.createdAt,
        updatedAt: testResults.updatedAt,
        studentName: students.fullName,
        studentCode: students.code,
      })
      .from(testResults)
      .innerJoin(students, eq(testResults.studentId, students.id))
      .where(eq(testResults.testId, testId))
      .orderBy(students.code);

    return rows;
  }

  async upsertResultsBatch(
    items: Array<{
      testId: string;
      studentId: string;
      score: number;
      sectionScores: unknown;
      clientMutationId?: string;
    }>,
  ): Promise<TestResultRow[]> {
    if (items.length === 0) return [];

    return this.db.transaction(async (tx) => {
      const saved: TestResultRow[] = [];
      for (const item of items) {
        const [row] = await tx
          .insert(testResults)
          .values({
            testId: item.testId,
            studentId: item.studentId,
            score: item.score,
            sectionScores: item.sectionScores as TestSectionScore[],
            clientMutationId: item.clientMutationId,
          })
          .onConflictDoUpdate({
            target: [testResults.testId, testResults.studentId],
            set: {
              score: item.score,
              sectionScores: item.sectionScores as TestSectionScore[],
              version: sql`${testResults.version} + 1`,
              clientMutationId: item.clientMutationId,
              updatedAt: this.clock.now(),
            },
          })
          .returning();
        if (row) saved.push(row);
      }
      return saved;
    });
  }

  async findGroupActiveStudents(groupId: string, date: string): Promise<GroupStudentEntry[]> {
    const rows = await this.db
      .select({
        id: students.id,
        fullName: students.fullName,
        code: students.code,
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.groupId, groupId),
          lte(enrollments.startDate, date),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, date)),
          isNull(students.archivedAt),
        ),
      )
      .orderBy(students.fullName);

    return rows.map((r) => ({
      id: r.id,
      code: Number(r.code),
      fullName: r.fullName,
    }));
  }

  async findStudentTestHistory(studentId: string): Promise<
    Array<
      TestResultRow & {
        testTitle: string;
        testDate: string;
        maxScore: number;
        publishedAt: Date | null;
      }
    >
  > {
    const rows = await this.db
      .select({
        id: testResults.id,
        testId: testResults.testId,
        studentId: testResults.studentId,
        score: testResults.score,
        sectionScores: testResults.sectionScores,
        version: testResults.version,
        clientMutationId: testResults.clientMutationId,
        createdAt: testResults.createdAt,
        updatedAt: testResults.updatedAt,
        testTitle: tests.title,
        testDate: tests.date,
        maxScore: tests.maxScore,
        publishedAt: tests.publishedAt,
      })
      .from(testResults)
      .innerJoin(tests, eq(testResults.testId, tests.id))
      .where(and(eq(testResults.studentId, studentId), eq(tests.status, 'published')))
      .orderBy(desc(tests.date));

    return rows;
  }

  async recordImport(data: NewImportRow): Promise<ImportRow> {
    const [row] = await this.db.insert(imports).values(data).returning();
    if (!row) throw new Error('IMPORT_LOG_FAILED');
    return row;
  }
}
