import type {
  CreateTestRequest,
  ExcelImportConfirmRequest,
  ImportPreviewResponse,
  RecordTestResultsRequest,
  TestDetailResponse,
  TestItem,
  TestResultItem,
  TestSectionScore,
  UpdateTestRequest,
} from '@lg/contracts';
import type { TestRow } from '@lg/db';
import {
  calculatePercentage,
  validateSectionScores,
  validateTestScore,
  type Clock,
} from '@lg/domain';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';
import { OutboxService } from '../outbox/index.js';
import { StudentScopeService } from '../students/index.js';
import { ExcelTestService } from './excel-test.service.js';
import { TestsRepository } from './tests.repository.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

@Injectable()
export class TestsService {
  constructor(
    @Inject(TestsRepository) private readonly repo: TestsRepository,
    @Inject(ExcelTestService) private readonly excelService: ExcelTestService,
    @Inject(StudentScopeService) private readonly scopeService: StudentScopeService,
    @Inject(GroupScopeService) private readonly groupScope: GroupScopeService,
    @Inject(OutboxService) private readonly outboxService: OutboxService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async createTest(
    actor: RequestUser,
    branchId: string,
    req: CreateTestRequest,
  ): Promise<TestItem> {
    await this.groupScope.assertCanManage(actor, req.groupId);
    const row = await this.repo.createTest({
      branchId,
      groupId: req.groupId,
      title: req.title,
      date: req.date,
      maxScore: req.maxScore,
      sections: req.sections ?? [],
      status: 'draft',
      createdBy: actor.id,
    });
    return this.mapTestRow(row);
  }

  async updateTest(actor: RequestUser, id: string, req: UpdateTestRequest): Promise<TestItem> {
    const existing = await this.loadTest(actor, id, 'manage');
    if (existing.status === 'published') {
      throw new BadRequestException({ code: 'TEST_ALREADY_PUBLISHED' });
    }

    const updated = await this.repo.updateTest(id, {
      title: req.title,
      date: req.date,
      maxScore: req.maxScore,
      sections: req.sections,
    });
    if (!updated) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
    return this.mapTestRow(updated);
  }

  async getTest(actor: RequestUser, id: string): Promise<TestDetailResponse> {
    const test = await this.loadTest(actor, id, 'view');

    const results = await this.repo.findTestResultsWithStudents(id);
    const mappedResults: TestResultItem[] = results.map((r) => ({
      id: r.id,
      testId: r.testId,
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: r.studentCode,
      score: r.score,
      percentage: calculatePercentage(r.score, test.maxScore),
      sectionScores: (r.sectionScores as TestSectionScore[]) ?? [],
      version: r.version,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      ...this.mapTestRow(test),
      results: mappedResults,
    };
  }

  async listGroupTests(actor: RequestUser, groupId: string): Promise<TestItem[]> {
    await this.groupScope.assertVisible(actor, groupId);
    const rows = await this.repo.findTestsByGroupId(groupId);
    return rows.map((r) => this.mapTestRow(r));
  }

  async recordResults(
    actor: RequestUser,
    testId: string,
    req: RecordTestResultsRequest,
  ): Promise<void> {
    const test = await this.loadTest(actor, testId, 'manage');
    if (test.status === 'published') {
      throw new BadRequestException({ code: 'TEST_ALREADY_PUBLISHED' });
    }

    for (const item of req.results) {
      if (!validateTestScore(item.score, test.maxScore)) {
        throw new BadRequestException({ code: 'TEST_SCORE_INVALID' });
      }
      const secVal = validateSectionScores(item.sectionScores ?? [], test.sections);
      if (!secVal.valid) {
        throw new BadRequestException({ code: 'TEST_SECTION_SCORE_INVALID' });
      }
    }

    const payload = req.results.map((r) => ({
      testId,
      studentId: r.studentId,
      score: r.score,
      sectionScores: r.sectionScores ?? [],
      clientMutationId: req.clientMutationId,
    }));

    await this.repo.upsertResultsBatch(payload);
  }

  async publishTest(actor: RequestUser, testId: string): Promise<TestItem> {
    const test = await this.loadTest(actor, testId, 'manage');
    if (test.status === 'published') return this.mapTestRow(test);

    const updated = await this.repo.updateTest(testId, {
      status: 'published',
      publishedAt: this.clock.now(),
    });
    if (!updated) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });

    // Outbox event: test e'lon qilingani haqida bildirishnoma
    await this.outboxService.publish('TestResultsPublished', {
      testId: updated.id,
      groupId: updated.groupId,
      title: updated.title,
    });

    return this.mapTestRow(updated);
  }

  async getTemplate(actor: RequestUser, testId: string): Promise<Buffer> {
    const test = await this.loadTest(actor, testId, 'view');

    const students = await this.repo.findGroupActiveStudents(test.groupId, test.date);
    return this.excelService.generateTemplate({
      testTitle: test.title,
      maxScore: test.maxScore,
      sections: test.sections,
      students,
    });
  }

  async previewImport(
    actor: RequestUser,
    testId: string,
    buffer: Buffer,
  ): Promise<ImportPreviewResponse> {
    const test = await this.loadTest(actor, testId, 'manage');
    if (test.status === 'published') {
      throw new BadRequestException({ code: 'TEST_ALREADY_PUBLISHED' });
    }

    const students = await this.repo.findGroupActiveStudents(test.groupId, test.date);
    return this.excelService.parseExcelResults(
      buffer,
      { maxScore: test.maxScore, sections: test.sections },
      students,
    );
  }

  async confirmImport(
    actor: RequestUser,
    testId: string,
    req: ExcelImportConfirmRequest,
  ): Promise<void> {
    const test = await this.loadTest(actor, testId, 'manage');
    if (test.status === 'published') {
      throw new BadRequestException({ code: 'TEST_ALREADY_PUBLISHED' });
    }

    for (const item of req.results) {
      if (!validateTestScore(item.score, test.maxScore)) {
        throw new BadRequestException({ code: 'TEST_SCORE_INVALID' });
      }
      const secVal = validateSectionScores(item.sectionScores ?? [], test.sections);
      if (!secVal.valid) {
        throw new BadRequestException({ code: 'TEST_SECTION_SCORE_INVALID' });
      }
    }

    const payload = req.results.map((r) => ({
      testId,
      studentId: r.studentId,
      score: r.score,
      sectionScores: r.sectionScores ?? [],
    }));

    await this.repo.upsertResultsBatch(payload);

    await this.repo.recordImport({
      branchId: test.branchId,
      kind: 'test_results',
      mapping: { testId, importedCount: req.results.length },
      status: 'completed',
      report: { importedStudentsCount: req.results.length },
      createdBy: actor.id,
    });
  }

  async getStudentTestHistory(actor: RequestUser, studentId: string): Promise<TestResultItem[]> {
    // Har rol uchun scope (T-505): ustoz — faqat o'z guruhidagi, ota-ona — o'z farzandi.
    await this.scopeService.assertVisible(actor, studentId);

    const rows = await this.repo.findStudentTestHistory(studentId);
    return rows.map((r) => ({
      id: r.id,
      testId: r.testId,
      studentId: r.studentId,
      score: r.score,
      percentage: calculatePercentage(r.score, r.maxScore),
      sectionScores: (r.sectionScores as TestSectionScore[]) ?? [],
      version: r.version,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /**
   * Test + guruh scope'i (T-505, Q-62): ko'rish — guruh ustozlari (yordamchi ham);
   * o'zgartirish, ball, import, e'lon — faqat asosiy ustoz yoki Admin/Director.
   */
  private async loadTest(actor: RequestUser, id: string, mode: 'view' | 'manage') {
    const test = await this.repo.findTestById(id);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
    if (mode === 'manage') await this.groupScope.assertCanManage(actor, test.groupId);
    else await this.groupScope.assertVisible(actor, test.groupId);
    return test;
  }

  private mapTestRow(row: TestRow): TestItem {
    return {
      id: row.id,
      branchId: row.branchId,
      groupId: row.groupId,
      title: row.title,
      date: row.date,
      maxScore: row.maxScore,
      sections: row.sections ?? [],
      status: row.status,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}
