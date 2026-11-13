import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreatePaymentRequest,
  type CreatePaymentInput,
  GenerateInvoicesRequest,
  type GenerateInvoicesInput,
  type Invoice,
  InvoiceListQuery,
  type InvoiceListQueryInput,
  type InvoiceWithLines,
  type LedgerEntry,
  LedgerListQuery,
  type LedgerListQueryInput,
  type PaymentDetail,
  PaymentListQuery,
  type PaymentListQueryInput,
  type PublicReceipt,
  type StudentLedgerSummary,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import type { GenerateResult } from './billing-generator.service.js';
import { BillingService } from './billing.service.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billing: BillingService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  @Get('invoices')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: "Hisoblar (invoicelar) ro'yxati (oy/o'quvchi bo'yicha)" })
  async listInvoices(
    @CurrentUser() user: RequestUser,
    @ZodQuery(InvoiceListQuery) query: InvoiceListQueryInput,
  ): Promise<Invoice[]> {
    return this.billing.getInvoices(user, query);
  }

  @Get('invoices/:id')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: 'Bitta invoice tafsilotlari qatorlari bilan' })
  async getInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceWithLines> {
    return this.billing.getInvoiceById(user, id);
  }

  @Get('ledger/:studentId')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: "O'quvchining moliya daftari (ledger) tarixi" })
  async getLedger(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @ZodQuery(LedgerListQuery) query: LedgerListQueryInput,
  ): Promise<LedgerEntry[]> {
    return this.billing.getStudentLedger(user, studentId, query);
  }

  @Get('ledger/:studentId/summary')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: "O'quvchining joriy balansi va qarzdorlik holati" })
  async getLedgerSummary(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StudentLedgerSummary> {
    return this.billing.getStudentLedgerSummary(user, studentId);
  }

  @Post('invoices/generate')
  @RequirePermission('payment.create')
  @NoAudit('BillingService.generateInvoices ichida audit yoziladi')
  @ApiOperation({ summary: 'Oylik invoicelarni avtomatik generatsiya qilish (BR-1, BR-2)' })
  async generateInvoices(
    @Req() req: FastifyRequest,
    @ZodBody(GenerateInvoicesRequest) body: GenerateInvoicesInput,
  ): Promise<GenerateResult> {
    return this.billing.generateInvoices(auditContext(req), body);
  }

  @Post('payments')
  @RequirePermission('payment.create')
  @NoAudit('PaymentsService.createPayment ichida audit yoziladi')
  @ApiOperation({
    summary: "To'lov kiritish (Admin, web) — FIFO taqsimlash va chek berish (BR-11, BR-12, BR-19)",
  })
  async createPayment(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @ZodBody(CreatePaymentRequest) body: CreatePaymentInput,
  ): Promise<PaymentDetail> {
    return this.payments.createPayment(auditContext(req), user, body);
  }

  @Get('payments')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: "To'lovlar ro'yxati" })
  async listPayments(
    @CurrentUser() user: RequestUser,
    @ZodQuery(PaymentListQuery) query: PaymentListQueryInput,
  ): Promise<PaymentDetail[]> {
    return this.payments.getPayments(user, query);
  }

  @Get('payments/:id')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: "To'lov tafsilotlari" })
  async getPayment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentDetail> {
    return this.payments.getPaymentById(user, id);
  }

  @Get('receipts/:number')
  @Public()
  @ApiOperation({ summary: 'Chekni ommaviy tekshirish sahifasi (mehmon va ota-onalar uchun)' })
  async verifyReceipt(@Param('number') number: string): Promise<PublicReceipt> {
    return this.payments.getPublicReceipt(number);
  }
}
