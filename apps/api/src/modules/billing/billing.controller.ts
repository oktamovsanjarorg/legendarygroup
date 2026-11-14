import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CashClosingListQuery,
  type CashClosing,
  type CashClosingListQueryInput,
  CloseCashRequest,
  type CloseCashInput,
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
  type ReceiptVerifyResponse,
  RefundPaymentRequest,
  type RefundPaymentInput,
  ReversePaymentRequest,
  type ReversePaymentInput,
  SetEnrollmentDiscountRequest,
  type SetEnrollmentDiscountInput,
  type StudentLedgerSummary,
  WaivePenaltyRequest,
  type WaivePenaltyInput,
} from '@lg/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import type { GenerateResult } from './billing-generator.service.js';
import { BillingService } from './billing.service.js';
import { DiscountsService } from './discounts.service.js';
import { PaymentsService } from './payments.service.js';
import { ReceiptPdfService } from './receipt-pdf.service.js';
import { StornoCashService } from './storno-cash.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billing: BillingService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(DiscountsService) private readonly discounts: DiscountsService,
    @Inject(StornoCashService) private readonly stornoCash: StornoCashService,
    @Inject(ReceiptPdfService) private readonly receiptPdf: ReceiptPdfService,
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
    const idempotencyKey =
      (req.headers['idempotency-key'] as string | undefined) ?? body.idempotencyKey;
    return this.payments.createPayment(auditContext(req), user, body, idempotencyKey);
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

  @Get('receipts/:number/pdf')
  @Public()
  @NoAudit('GET receipt PDF')
  @ApiOperation({ summary: 'Rasmiy toʻlov chekini PDF koʻrinishida yuklab olish (FR-PAY-8)' })
  async downloadReceiptPdf(
    @Param('number') number: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const buffer = await this.receiptPdf.generateReceiptPdf(number);
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `inline; filename="receipt-${number}.pdf"`);
    res.send(buffer);
  }

  @Get('receipts/verify/:token')
  @Public()
  @NoAudit('GET receipt verify by token')
  @ApiOperation({ summary: 'W-34 QR tekshiruv: ommaviy haqiqiylik tekshiruvi (PIIsiz, FR-PAY-8)' })
  async verifyReceiptByToken(@Param('token') token: string): Promise<ReceiptVerifyResponse> {
    return this.receiptPdf.verifyReceipt(token);
  }

  @Patch('enrollments/:id/discount')
  @RequirePermission('discount.grant')
  @NoAudit('DiscountsService ichida audit yoziladi')
  @ApiOperation({
    summary: 'Guruhga yozilishga chegirma belgilash (Admin limiti tekshiriladi, BR-18)',
  })
  async setDiscount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @ZodBody(SetEnrollmentDiscountRequest) body: SetEnrollmentDiscountInput,
  ): Promise<{ id: string; discountPercent: number | null }> {
    const row = await this.discounts.setEnrollmentDiscount(id, body, user, auditContext(req));
    return { id: row.id, discountPercent: row.discountPercent };
  }

  @Post('invoices/:invoiceId/lines/:lineId/waive')
  @RequirePermission('penalty.waive')
  @NoAudit('DiscountsService ichida audit yoziladi')
  @ApiOperation({ summary: 'Jarima qatorini bekor qilish (Admin/Director, BR-8)' })
  async waivePenalty(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Req() req: FastifyRequest,
    @ZodBody(WaivePenaltyRequest) body: WaivePenaltyInput,
  ): Promise<{ invoiceId: string; newTotal: string }> {
    return this.discounts.waivePenalty({
      invoiceId,
      lineId,
      input: body,
      ctx: auditContext(req),
    });
  }

  @Post('payments/:id/reverse')
  @RequirePermission('payment.reverse')
  @NoAudit('StornoCashService ichida audit yoziladi')
  @ApiOperation({
    summary: "To'lovni bekor qilish (storno) — BR-16 (kunlik tekshiruv, Director tasdig'i)",
  })
  async reversePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @ZodBody(ReversePaymentRequest) body: ReversePaymentInput,
  ): Promise<{ paymentId: string; reversalId: string }> {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    return this.stornoCash.reversePayment({
      paymentId: id,
      input: body,
      user,
      ctx: auditContext(req),
      idempotencyKey,
    });
  }

  @Post('payments/refund')
  @RequirePermission('payment.refund')
  @NoAudit('StornoCashService ichida audit yoziladi')
  @ApiOperation({ summary: 'Pulni qaytarish (refund) — faqat Director (BR-17)' })
  async refundPayment(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @ZodBody(RefundPaymentRequest) body: RefundPaymentInput,
  ): Promise<{ refundId: string; amount: string }> {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    return this.stornoCash.refundPayment(body, user, auditContext(req), idempotencyKey);
  }

  @Post('cash/close')
  @RequirePermission('cash.close')
  @NoAudit('StornoCashService ichida audit yoziladi')
  @ApiOperation({ summary: "Kunlik kassani yopish — FR-PAY-10 (farq bo'lsa izoh majburiy)" })
  async closeCash(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @ZodBody(CloseCashRequest) body: CloseCashInput,
  ): Promise<CashClosing> {
    return this.stornoCash.closeCash(body, user, auditContext(req));
  }

  @Get('cash/expected')
  @RequirePermission('cash.close')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Berilgan sana uchun tizimdagi kutilayotgan naqd summa' })
  async getExpectedCash(
    @ZodQuery(CloseCashRequest.pick({ date: true })) query: { date: string },
  ): Promise<{ date: string; expectedCash: string }> {
    return this.stornoCash.getExpectedCash(query.date);
  }

  @Get('cash/closings')
  @RequirePermission('cash.close')
  @NoAudit('GET query')
  @ApiOperation({ summary: "Yopilgan kassalar tarixi ro'yxati" })
  async listCashClosings(
    @ZodQuery(CashClosingListQuery) query: CashClosingListQueryInput,
  ): Promise<CashClosing[]> {
    return this.stornoCash.getCashClosings(query);
  }
}
