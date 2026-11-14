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
import { calculatePercentage, validateSectionScores, validateTestScore } from '@lg/domain';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/index.js';
import { OutboxService } from '../outbox/index.js';
import { StudentScopeService } from '../students/index.js';
import { ExcelTestService } from './excel-test.service.js';
import { TestsRepository } from './tests.repository.js';

@Injectable()
export class TestsService {
  constructor(
    @Inject(TestsRepository) private readonly repo: TestsRepository,
    @Inject(ExcelTestService) private readonly excelService: ExcelTestService,
    @Inject(StudentScopeService) private readonly scopeService: StudentScopeService,
    @Inject(OutboxService) private readonly outboxService: OutboxService,
  ) {}

  async createTest(
    actor: RequestUser,
    branchId: string,
    req: CreateTestRequest,
  ): Promise<TestItem> {
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
    const existing = await this.repo.findTestById(id);
    if (!existing) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
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
    const test = await this.repo.findTestById(id);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });

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
    const rows = await this.repo.findTestsByGroupId(groupId);
    return rows.map((r) => this.mapTestRow(r));
  }

  async recordResults(
    actor: RequestUser,
    testId: string,
    req: RecordTestResultsRequest,
  ): Promise<void> {
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
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
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
    if (test.status === 'published') return this.mapTestRow(test);

    const updated = await this.repo.updateTest(testId, {
      status: 'published',
      publishedAt: new Date(),
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
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });

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
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
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
    const test = await this.repo.findTestById(testId);
    if (!test) throw new NotFoundException({ code: 'TEST_NOT_FOUND' });
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
    if (actor.role === 'guardian') {
      await this.scopeService.assertVisible(actor, studentId);
    }

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
