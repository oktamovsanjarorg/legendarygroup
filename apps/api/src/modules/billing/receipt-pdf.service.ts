import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ReceiptVerifyResponse } from '@lg/contracts';
import {
  type Database,
  enrollments,
  groups,
  invoiceLines,
  paymentAllocations,
  type PaymentRow,
  type StudentRow,
  students,
  users,
} from '@lg/db';
import { amountInWords, formatDateTime, formatMoney } from '@lg/i18n';
import { eq } from 'drizzle-orm';
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import QRCode from 'qrcode';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import { BillingRepository } from './billing.repository.js';

function cleanText(text: string): string {
  return text
    .replace(/№/g, 'No.')
    .replace(/[\u02BB\u02BC\u2018\u2019]/g, "'")
    .replace(/\u2212/g, '-');
}

function methodLabel(method: string): string {
  if (method === 'cash') return 'Naqd pul';
  if (method === 'card') return 'Karta (terminal)';
  if (method === 'bank') return 'Bank oʻtkazmasi';
  return 'Boshqa';
}

interface DrawBodyParams {
  page: PDFPage;
  payment: PaymentRow;
  student: StudentRow;
  groupName: string;
  staffName: string;
  fontBold: PDFFont;
  fontReg: PDFFont;
}

@Injectable()
export class ReceiptPdfService {
  constructor(
    @Inject(BillingRepository) private readonly repo: BillingRepository,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(EnvService) private readonly env: EnvService,
  ) {}

  /** W-34: Ommaviy tekshirish natijasi — PII yo'q (FR-PAY-8). */
  async verifyReceipt(token: string): Promise<ReceiptVerifyResponse> {
    const receipt = await this.repo.findReceiptByVerifyToken(token);
    if (!receipt) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const payment = await this.repo.findPaymentById(receipt.paymentId);
    if (!payment) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const status = await this.repo.isReceiptCancelled(receipt.id);

    return {
      kind: status.isCancelled ? 'reversed' : 'valid',
      number: receipt.number,
      date: payment.paidAt.toISOString(),
      amount: payment.amount.toString(),
      center: 'Legendary Group',
    };
  }

  /** Chek ma'lumotlarini bazadan yig'adi. */
  private async fetchReceiptDetails(number: string) {
    const receipt = await this.repo.findReceiptByNumber(number);
    if (!receipt) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const payment = await this.repo.findPaymentById(receipt.paymentId);
    if (!payment) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const [student] = await this.db
      .select()
      .from(students)
      .where(eq(students.id, payment.studentId));
    if (!student) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    let staffName = 'Admin';
    if (payment.receivedBy) {
      const [u] = await this.db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, payment.receivedBy));
      if (u) staffName = u.fullName;
    }

    const [alloc] = await this.db
      .select({ groupName: groups.name })
      .from(paymentAllocations)
      .innerJoin(invoiceLines, eq(invoiceLines.id, paymentAllocations.invoiceLineId))
      .innerJoin(enrollments, eq(enrollments.id, invoiceLines.enrollmentId))
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(eq(paymentAllocations.paymentId, payment.id))
      .limit(1);

    const status = await this.repo.isReceiptCancelled(receipt.id);

    return { receipt, payment, student, groupName: alloc?.groupName ?? '—', staffName, status };
  }

  /** Rasmiy PDF chek generatsiya qiladi (FR-PAY-8, BR-19). */
  async generateReceiptPdf(number: string): Promise<Buffer> {
    const { receipt, payment, student, groupName, staffName, status } =
      await this.fetchReceiptDetails(number);

    const appUrl = this.env.get('PUBLIC_APP_URL') ?? 'https://lg.uz';
    const verifyUrl = `${appUrl}/verify/${receipt.verifyToken}`;
    const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 130, margin: 1 });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 560]);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const qrImg = await pdfDoc.embedPng(qrPng);

    this.drawReceiptHeader(page, receipt.number, fontBold, fontReg);
    this.drawReceiptBody({ page, payment, student, groupName, staffName, fontBold, fontReg });

    if (status.isCancelled) {
      this.drawCancelledStamp(page, status.reason, fontBold, fontReg);
    }

    this.drawQrSection(page, qrImg, fontReg);

    return Buffer.from(await pdfDoc.save());
  }

  private drawReceiptHeader(
    page: PDFPage,
    number: string,
    fontBold: PDFFont,
    fontReg: PDFFont,
  ): void {
    page.drawText(cleanText('LEGENDARY GROUP'), {
      x: 40,
      y: 510,
      size: 18,
      font: fontBold,
      color: rgb(0.08, 0.2, 0.45),
    });
    page.drawText(cleanText("O'quv markazi rasmiy to'lov cheki"), {
      x: 40,
      y: 494,
      size: 10,
      font: fontReg,
      color: rgb(0.4, 0.45, 0.5),
    });
    page.drawText(cleanText(`Chek №: ${number}`), {
      x: 40,
      y: 472,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 40, y: 462 },
      end: { x: 360, y: 462 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });
  }

  private drawReceiptBody(p: DrawBodyParams): void {
    const { page, payment, student, groupName, staffName, fontBold, fontReg } = p;
    const lines: [string, string][] = [
      ['Sana va vaqt:', formatDateTime(payment.paidAt)],
      ["O'quvchi:", `${student.fullName} (LG-${student.code})`],
      ['Guruh / Kurs:', groupName],
      ["To'lov usuli:", methodLabel(payment.method)],
      ['Qabul qildi:', staffName],
    ];

    let y = 440;
    for (const line of lines) {
      const [label, val] = line;
      page.drawText(cleanText(label), {
        x: 40,
        y,
        size: 10,
        font: fontReg,
        color: rgb(0.4, 0.45, 0.5),
      });
      page.drawText(cleanText(val), {
        x: 140,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 22;
    }

    page.drawLine({
      start: { x: 40, y: y + 8 },
      end: { x: 360, y: y + 8 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText(cleanText("To'langan summa:"), {
      x: 40,
      y: y - 10,
      size: 11,
      font: fontReg,
      color: rgb(0.4, 0.45, 0.5),
    });
    page.drawText(cleanText(formatMoney(payment.amount)), {
      x: 140,
      y: y - 10,
      size: 14,
      font: fontBold,
      color: rgb(0.05, 0.5, 0.2),
    });

    page.drawText(cleanText(`So'z bilan: ${amountInWords(payment.amount)}`), {
      x: 40,
      y: y - 30,
      size: 9,
      font: fontReg,
      color: rgb(0.3, 0.35, 0.4),
    });
  }

  private drawCancelledStamp(
    page: PDFPage,
    reason: string | null,
    fontBold: PDFFont,
    fontReg: PDFFont,
  ): void {
    page.drawRectangle({
      x: 40,
      y: 220,
      width: 320,
      height: 45,
      color: rgb(0.98, 0.9, 0.9),
      borderColor: rgb(0.85, 0.2, 0.2),
      borderWidth: 1,
    });
    page.drawText(cleanText('BEKOR QILINGAN / CANCELLED'), {
      x: 100,
      y: 245,
      size: 12,
      font: fontBold,
      color: rgb(0.85, 0.1, 0.1),
    });
    page.drawText(cleanText(`Sabab: ${reason ?? "Noto'g'ri to'lov"}`), {
      x: 50,
      y: 228,
      size: 9,
      font: fontReg,
      color: rgb(0.6, 0.15, 0.15),
    });
  }

  private drawQrSection(page: PDFPage, qrImg: PDFImage, fontReg: PDFFont): void {
    page.drawImage(qrImg, { x: 145, y: 65, width: 110, height: 110 });
    page.drawText(cleanText('Chek haqiqiyligini tekshirish uchun QR kodni skanerlang'), {
      x: 65,
      y: 45,
      size: 8,
      font: fontReg,
      color: rgb(0.5, 0.55, 0.6),
    });
  }
}
