import {
  CreateTestRequest,
  DEFAULT_BRANCH_ID,
  ExcelImportConfirmRequest,
  type ImportPreviewResponse,
  RecordTestResultsRequest,
  type TestDetailResponse,
  type TestItem,
  type TestResultItem,
  UpdateTestRequest,
} from '@lg/contracts';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { TestsService } from './tests.service.js';

const ImportPreviewBody = z.object({
  fileBase64: z.string().min(1),
});

@ApiTags('Tests')
@ApiBearerAuth()
@Controller('tests')
export class TestsController {
  constructor(@Inject(TestsService) private readonly service: TestsService) {}

  @Post()
  @RequirePermission('test.manage')
  @Audit({ action: 'test.create', entity: 'test' })
  @ApiOperation({ summary: 'FR-GRD-3 Yangi test yaratish' })
  async createTest(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateTestRequest) req: CreateTestRequest,
  ): Promise<TestItem> {
    return this.service.createTest(actor, DEFAULT_BRANCH_ID, req);
  }

  @Get()
  @RequirePermission('test.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Guruh testlari roʻyxati' })
  async listGroupTests(
    @CurrentUser() actor: RequestUser,
    @Query('groupId') groupId: string,
  ): Promise<TestItem[]> {
    return this.service.listGroupTests(actor, groupId);
  }

  @Get(':id')
  @RequirePermission('test.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Test detallari va natijalari' })
  async getTest(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TestDetailResponse> {
    return this.service.getTest(actor, id);
  }

  @Patch(':id')
  @RequirePermission('test.manage')
  @Audit({ action: 'test.update', entity: 'test' })
  @ApiOperation({ summary: 'Test parametrlarini oʻzgartirish' })
  async updateTest(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateTestRequest) req: UpdateTestRequest,
  ): Promise<TestItem> {
    return this.service.updateTest(actor, id, req);
  }

  @Post(':id/results')
  @RequirePermission('test.manage')
  @Audit({ action: 'test.record_results', entity: 'test' })
  @ApiOperation({ summary: 'FR-GRD-3 Test natijalarini kiritish/tahrirlash' })
  async recordResults(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(RecordTestResultsRequest) req: RecordTestResultsRequest,
  ): Promise<{ success: true }> {
    await this.service.recordResults(actor, id, req);
    return { success: true };
  }

  @Post(':id/publish')
  @RequirePermission('test.manage')
  @Audit({ action: 'test.publish', entity: 'test' })
  @ApiOperation({ summary: 'FR-GRD-6 Test natijalarini eʼlon qilish' })
  async publishTest(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TestItem> {
    return this.service.publishTest(actor, id);
  }

  @Get(':id/template')
  @RequirePermission('test.manage')
  @NoAudit('GET template')
  @ApiOperation({ summary: 'FR-GRD-4 Excel shablonini yuklab olish' })
  async downloadTemplate(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const buffer = await this.service.getTemplate(actor, id);
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="test-template-${id}.xlsx"`)
      .send(buffer);
  }

  @Post(':id/import-preview')
  @RequirePermission('test.manage')
  @NoAudit('preview calculation')
  @ApiOperation({ summary: 'FR-GRD-4 Excel natijalarini oldindan koʻrish' })
  async previewImport(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ImportPreviewBody) body: { fileBase64: string },
  ): Promise<ImportPreviewResponse> {
    const buffer = Buffer.from(body.fileBase64, 'base64');
    return this.service.previewImport(actor, id, buffer);
  }

  @Post(':id/import-confirm')
  @RequirePermission('test.manage')
  @Audit({ action: 'test.import_confirm', entity: 'test' })
  @ApiOperation({ summary: 'FR-GRD-4 Excel natijalarini tasdiqlash' })
  async confirmImport(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ExcelImportConfirmRequest) req: ExcelImportConfirmRequest,
  ): Promise<{ success: true }> {
    await this.service.confirmImport(actor, id, req);
    return { success: true };
  }

  @Get('student/:studentId')
  @RequirePermission('student.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Oʻquvchi test natijalari tarixi' })
  async getStudentTests(
    @CurrentUser() actor: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<TestResultItem[]> {
    return this.service.getStudentTestHistory(actor, studentId);
  }
}
