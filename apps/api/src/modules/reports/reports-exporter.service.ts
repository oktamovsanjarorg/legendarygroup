import { Inject, Injectable } from '@nestjs/common';
import type { ReportType } from '@lg/contracts';
import { type Clock } from '@lg/domain';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

function cleanUzText(text: string): string {
  return text
    .replace(/№/g, 'No.')
    .replace(/[\u02BB\u02BC\u2018\u2019]/g, "'")
    .replace(/\u2212/g, '-');
}

function fillRevenueSheet(sheet: ExcelJS.Worksheet, typedData: Record<string, unknown>): void {
  const items = (typedData.items as Array<Record<string, unknown>>) || [];
  sheet.addRow(['Nomi / Davr', 'Tushum', "To'lovlar soni", "O'quvchilar soni"]);
  for (const it of items) {
    sheet.addRow([it.name, it.totalRevenue?.toString(), it.paymentCount, it.studentCount]);
  }
}

function fillDebtAgingSheet(sheet: ExcelJS.Worksheet, typedData: Record<string, unknown>): void {
  const debtors = (typedData.debtors as Array<Record<string, unknown>>) || [];
  sheet.addRow(["O'quvchi ID", 'F.I.Sh', 'Guruh', 'Qarz', 'Kechikkan kun', 'Toifa']);
  for (const d of debtors) {
    sheet.addRow([
      d.studentCode,
      d.studentName,
      d.groupName ?? '-',
      d.debt?.toString(),
      d.daysOverdue,
      d.bucket,
    ]);
  }
}

function fillAttendanceSheet(sheet: ExcelJS.Worksheet, typedData: Record<string, unknown>): void {
  const items = (typedData.items as Array<Record<string, unknown>>) || [];
  sheet.addRow(['Nomi', 'Darslar', 'Qatnashdi', 'Kelmadi', 'Sababli', 'Kechikdi', 'Davomat %']);
  for (const it of items) {
    sheet.addRow([
      it.name,
      it.totalLessons,
      it.presentCount,
      it.absentCount,
      it.excusedCount,
      it.lateCount,
      `${Number(it.attendancePercentBp) / 100}%`,
    ]);
  }
}

@Injectable()
export class ReportsExporterService {
  constructor(@Inject(CLOCK_TOKEN) private readonly clock: Clock) {}

  /** Ma'lumotlarni Excel fayl (.xlsx) formatida qaytaradi */
  async exportToExcel(reportType: ReportType, data: unknown): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Legendary Group CRM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Hisobot');
    const typedData = data as Record<string, unknown>;

    sheet.addRow([`Hisobot: ${reportType.toUpperCase()}`]);
    sheet.addRow([`Sana: ${this.clock.today()}`]);
    sheet.addRow([]);

    if (reportType === 'revenue') {
      fillRevenueSheet(sheet, typedData);
    } else if (reportType === 'debt-aging') {
      fillDebtAgingSheet(sheet, typedData);
    } else if (reportType === 'attendance') {
      fillAttendanceSheet(sheet, typedData);
    } else {
      sheet.addRow(['Hisobot maʼlumotlari']);
      sheet.addRow([JSON.stringify(typedData)]);
    }

    sheet.columns.forEach((col) => {
      let maxLen = 15;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(35, maxLen + 2);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Ma'lumotlarni PDF fayl (.pdf) formatida qaytaradi */
  async exportToPdf(reportType: ReportType, data: unknown): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const typedData = data as Record<string, unknown>;

    page.drawText(cleanUzText(`Hisobot: ${reportType.toUpperCase()}`), {
      x: 50,
      y: 800,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.2),
    });
    page.drawText(cleanUzText(`Yaratilgan sana: ${this.clock.today()}`), {
      x: 50,
      y: 780,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawLine({
      start: { x: 50, y: 770 },
      end: { x: 545, y: 770 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    let currentY = 740;
    if (reportType === 'revenue') {
      const items = (typedData.items as Array<Record<string, unknown>>) || [];
      page.drawText('Davr / Nomi', { x: 50, y: currentY, size: 10, font: fontBold });
      page.drawText('Tushum', { x: 220, y: currentY, size: 10, font: fontBold });
      page.drawText("To'lovlar", { x: 380, y: currentY, size: 10, font: fontBold });
      page.drawText("O'quvchilar", { x: 470, y: currentY, size: 10, font: fontBold });
      currentY -= 20;

      for (const it of items.slice(0, 25)) {
        page.drawText(cleanUzText(String(it.name)), { x: 50, y: currentY, size: 9, font });
        page.drawText(String(it.totalRevenue), { x: 220, y: currentY, size: 9, font });
        page.drawText(String(it.paymentCount), { x: 380, y: currentY, size: 9, font });
        page.drawText(String(it.studentCount), { x: 470, y: currentY, size: 9, font });
        currentY -= 18;
      }
    } else {
      page.drawText(cleanUzText(`Hisobot mazmuni: ${reportType}`), {
        x: 50,
        y: currentY,
        size: 10,
        font,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
