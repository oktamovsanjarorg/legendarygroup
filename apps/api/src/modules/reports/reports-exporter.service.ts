import { Inject, Injectable } from '@nestjs/common';
import { formatMoney, reportMessages as t } from '@lg/i18n';
import type { Clock } from '@lg/domain';
import ExcelJS from 'exceljs';
import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { SettingsService } from '../settings/index.js';
import { pdfText } from '../../common/pdf/pdf-text.js';
import type { Cell, ReportTable } from './reports-table.js';

const PAGE = { width: 595.28, height: 841.89, margin: 40, row: 18 };
const FONT_SIZE = 9;

const textOf = (cell: Cell): string => {
  if (cell === null) return '';
  return typeof cell === 'bigint' ? formatMoney(cell, { withCurrency: false }) : String(cell);
};

/** Ustun kengligi: eng uzun matnga mutanosib (son ustunlari torroq). */
function columnWidths(table: ReportTable): number[] {
  const all = [table.columns, ...table.rows, ...(table.total ? [table.total] : [])];
  const lens = table.columns.map((_, i) =>
    Math.min(32, Math.max(6, ...all.map((r) => textOf(r[i] ?? null).length))),
  );
  const sum = lens.reduce((a, b) => a + b, 0);
  return lens.map((l) => (l / sum) * (PAGE.width - 2 * PAGE.margin));
}

/** Ustunga sig'magan matn qisqaradi. */
function fit(text: string, font: PDFFont, width: number): string {
  let out = pdfText(text);
  if (font.widthOfTextAtSize(out, FONT_SIZE) <= width) return out;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}..`, FONT_SIZE) > width)
    out = out.slice(0, -1);
  return `${out}..`;
}

/** Hisobot fayllari (FR-DASH-4): bitta jadvaldan Excel va PDF. */
@Injectable()
export class ReportsExporterService {
  constructor(
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async exportToExcel(table: ReportTable): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = await this.centerName();
    workbook.created = this.clock.now();
    const sheet = workbook.addWorksheet(table.title);
    sheet.addRow([table.title]).font = { bold: true, size: 14 };
    sheet.addRow([table.subtitle]);
    sheet.addRow([]);
    sheet.addRow(table.columns).font = { bold: true };
    for (const row of table.rows) this.addCells(sheet, row);
    if (table.rows.length === 0) sheet.addRow([t.empty]);
    if (table.total) this.addCells(sheet, table.total).font = { bold: true };
    const widths = columnWidths(table);
    widths.forEach((w, i) => (sheet.getColumn(i + 1).width = Math.max(12, w / 6)));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /** Summa Excel'da son bo'lib turadi (jamlash/filtr ishlaydi); hisob bu yerda qilinmaydi. */
  private addCells(sheet: ExcelJS.Worksheet, cells: Cell[]): ExcelJS.Row {
    const row = sheet.addRow(cells.map((x) => (typeof x === 'bigint' ? Number(x) : x)));
    cells.forEach((x, i) => {
      if (typeof x === 'bigint') row.getCell(i + 1).numFmt = '#,##0';
    });
    return row;
  }

  async exportToPdf(table: ReportTable): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const widths = columnWidths(table);
    let page = doc.addPage([PAGE.width, PAGE.height]);
    let y = this.header(
      page,
      { title: `${await this.centerName()} — ${table.title}`, subtitle: table.subtitle },
      { font, bold },
    );
    const line = (cells: readonly Cell[], f: PDFFont) => {
      if (y < PAGE.margin) {
        page = doc.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - PAGE.margin;
        if (f !== bold) line(table.columns, bold);
      }
      this.row(page, cells, { y, widths, font: f });
      y -= PAGE.row;
    };
    line(table.columns, bold);
    for (const r of table.rows) line(r, font);
    if (table.rows.length === 0) line([t.empty], font);
    if (table.total) line(table.total, bold);
    return Buffer.from(await doc.save());
  }

  private async centerName(): Promise<string> {
    return (await this.settings.getSettings()).centerInfo.name;
  }

  private header(
    page: PDFPage,
    h: { title: string; subtitle: string },
    f: { font: PDFFont; bold: PDFFont },
  ): number {
    const top = PAGE.height - PAGE.margin;
    const x = PAGE.margin;
    page.drawText(pdfText(h.title), { x, y: top, size: 15, font: f.bold });
    page.drawText(pdfText(h.subtitle), { x, y: top - 18, size: 10, font: f.font });
    page.drawLine({
      start: { x, y: top - 26 },
      end: { x: PAGE.width - x, y: top - 26 },
      thickness: 0.7,
      color: rgb(0.7, 0.7, 0.7),
    });
    return top - 46;
  }

  private row(
    page: PDFPage,
    cells: readonly Cell[],
    o: { y: number; widths: number[]; font: PDFFont },
  ): void {
    let x = PAGE.margin;
    cells.forEach((cell, i) => {
      const w = o.widths[i] ?? 0;
      const text = fit(textOf(cell), o.font, cells.length === 1 ? PAGE.width : w - 4);
      page.drawText(text, { x, y: o.y, size: FONT_SIZE, font: o.font });
      x += w;
    });
  }
}
