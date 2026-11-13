import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { ParentDigestReport } from '@lg/contracts';
import { type Clock } from '@lg/domain';
import { students } from '@lg/db';
import { eq } from 'drizzle-orm';
import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Database } from '@lg/db';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { NotificationsService } from '../notifications/index.js';
import { ProgressService } from '../grades/index.js';
import { ParentDigestRepository } from './parent-digest.repository.js';

@Injectable()
export class ParentDigestService {
  private readonly logger = new Logger(ParentDigestService.name);

  constructor(
    @Inject(ParentDigestRepository) private readonly repo: ParentDigestRepository,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(ProgressService) private readonly progressService: ProgressService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  /** Haftalik yoki oylik ota-ona hisoboti (FR-RPT-2, 3) */
  async getDigestReport(
    studentId: string,
    period: 'weekly' | 'monthly',
  ): Promise<ParentDigestReport> {
    const [student] = await this.db
      .select({ id: students.id, fullName: students.fullName })
      .from(students)
      .where(eq(students.id, studentId));
    if (!student) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const { from, to } = this.resolveDateRange(period);

    const [att, avgGrade, comments, billing, testRes, groupId] = await Promise.all([
      this.repo.getStudentAttendance(studentId, from, to),
      this.repo.getStudentAverageGrade(studentId, from, to),
      this.repo.getStudentComments(studentId, from, to),
      this.repo.getStudentBillingStatus(studentId),
      this.repo.getStudentTestResults(studentId, from, to),
      this.repo.findStudentGroupId(studentId),
    ]);

    const { rank, totalStudents } = await this.resolveRankInfo(studentId, groupId);

    const attendanceRatePercent =
      att.totalLessons > 0 ? Math.round((att.attendedLessons * 1000) / att.totalLessons) / 10 : 100;

    return {
      studentId: student.id,
      studentName: student.fullName,
      periodType: period,
      periodFrom: from,
      periodTo: to,
      totalLessons: att.totalLessons,
      attendedLessons: att.attendedLessons,
      attendanceRatePercent,
      averageGrade: avgGrade,
      comments,
      paymentStatus: {
        status: billing.status,
        debtAmount: billing.debtAmount.toString(),
      },
      testResults: testRes,
      rank,
      totalStudents,
      miniAppUrl: `https://t.me/LegendaryGroupBot/app?startapp=progress_${student.id}`,
    };
  }

  private async resolveRankInfo(
    studentId: string,
    groupId: string | null,
  ): Promise<{ rank: number | null; totalStudents: number | null }> {
    if (!groupId) return { rank: null, totalStudents: null };
    try {
      const actor: RequestUser = { id: studentId, role: 'director', pv: 1, sessionId: 'system' };
      const board = await this.progressService.getGroupLeaderboard(actor, groupId);
      const myItem = board.students.find((s) => s.studentId === studentId);
      return {
        rank: myItem ? myItem.rank : null,
        totalStudents: board.students.length > 0 ? board.students.length : null,
      };
    } catch {
      return { rank: null, totalStudents: null };
    }
  }

  /** Oylik hisobot uchun PDF generatsiyasi (FR-RPT-3) */
  async generateDigestPdf(report: ParentDigestReport): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { height } = page.getSize();
    this.drawPdfHeader({ page, report, fontBold, fontRegular, height });
    this.drawPdfMetrics({ page, report, fontBold, fontRegular, startY: height - 140 });

    return pdfDoc.save();
  }

  private drawPdfHeader(opts: {
    page: PDFPage;
    report: ParentDigestReport;
    fontBold: PDFFont;
    fontRegular: PDFFont;
    height: number;
  }): void {
    const { page, report, fontBold, fontRegular, height } = opts;
    page.drawText('LEGENDARY GROUP - OTA-ONA HISOBOTI', {
      x: 50,
      y: height - 50,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    page.drawText(`O'quvchi: ${report.studentName}`, {
      x: 50,
      y: height - 80,
      size: 13,
      font: fontBold,
    });
    page.drawText(
      `Davr: ${report.periodFrom} dan ${report.periodTo} gacha (${report.periodType})`,
      { x: 50, y: height - 100, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) },
    );
  }

  private drawPdfMetrics(opts: {
    page: PDFPage;
    report: ParentDigestReport;
    fontBold: PDFFont;
    fontRegular: PDFFont;
    startY: number;
  }): void {
    const { page, report, fontBold, fontRegular, startY } = opts;
    let y = startY;
    const drawRow = (label: string, value: string) => {
      page.drawText(label, { x: 50, y, size: 11, font: fontBold });
      page.drawText(value, { x: 260, y, size: 11, font: fontRegular });
      y -= 25;
    };

    drawRow(
      'Davomat:',
      `${report.attendedLessons} / ${report.totalLessons} dars (${report.attendanceRatePercent}%)`,
    );
    drawRow("O'rtacha baho:", `${report.averageGrade} ball`);
    drawRow("Guruhdagi o'rni:", report.rank ? `${report.rank} / ${report.totalStudents}` : '—');
    drawRow(
      "To'lov holati:",
      report.paymentStatus.status === 'paid'
        ? "To'langan"
        : `Qarzdorlik: ${report.paymentStatus.debtAmount} so'm`,
    );

    y -= 10;
    page.drawText('Ustoz izohlari:', { x: 50, y, size: 12, font: fontBold });
    y -= 20;
    if (report.comments.length === 0) {
      page.drawText("Ushbu davrda izohlar yo'q.", { x: 50, y, size: 10, font: fontRegular });
    } else {
      for (const c of report.comments) {
        page.drawText(`- ${c}`, { x: 50, y, size: 10, font: fontRegular });
        y -= 18;
      }
    }
  }

  /** Yakshanba 19:00: Haftalik hisobotlarni ota-onalarga yuborish (FR-RPT-2) */
  async dispatchWeeklyDigest(): Promise<number> {
    const links = await this.repo.findAllGuardianStudents();
    let dispatched = 0;

    for (const link of links) {
      try {
        const report = await this.getDigestReport(link.studentId, 'weekly');
        const payText =
          report.paymentStatus.status === 'paid'
            ? '✅ Toʻlangan'
            : `⚠️ Qarzdorlik: ${report.paymentStatus.debtAmount} soʻm`;

        await this.notifications.notify({
          userId: link.guardianUserId,
          type: 'weekly_parent_report',
          payload: {
            studentName: report.studentName,
            attendedLessons: report.attendedLessons,
            totalLessons: report.totalLessons,
            averageGrade: report.averageGrade,
            paymentStatus: payText,
            comments: report.comments[0] ?? '',
            miniAppUrl: report.miniAppUrl,
          },
          dedupeKey: `weekly:${report.periodFrom}:${link.studentId}:${link.guardianUserId}`,
          branchId: link.branchId,
        });
        dispatched++;
      } catch (err) {
        this.logger.error({ err, link }, 'Haftalik hisobot yuborishda xatolik');
      }
    }
    return dispatched;
  }

  /** Oy oxiri 20:00: Oylik hisobotlarni yuborish (FR-RPT-3) */
  async dispatchMonthlyDigest(): Promise<number> {
    const links = await this.repo.findAllGuardianStudents();
    let dispatched = 0;

    for (const link of links) {
      try {
        const report = await this.getDigestReport(link.studentId, 'monthly');
        const firstTest = report.testResults[0];
        const testText = firstTest
          ? `${firstTest.title}: ${firstTest.score}/${firstTest.maxScore}`
          : '—';

        await this.notifications.notify({
          userId: link.guardianUserId,
          type: 'monthly_parent_report',
          payload: {
            studentName: report.studentName,
            attendancePercent: report.attendanceRatePercent,
            averageGrade: report.averageGrade,
            testScore: testText,
            rank: report.rank,
            totalStudents: report.totalStudents,
            miniAppUrl: report.miniAppUrl,
          },
          dedupeKey: `monthly:${report.periodFrom}:${link.studentId}:${link.guardianUserId}`,
          branchId: link.branchId,
        });
        dispatched++;
      } catch (err) {
        this.logger.error({ err, link }, 'Oylik hisobot yuborishda xatolik');
      }
    }
    return dispatched;
  }

  private resolveDateRange(period: 'weekly' | 'monthly'): { from: string; to: string } {
    const now = this.clock.now();
    const to = now.toISOString().slice(0, 10);

    if (period === 'weekly') {
      const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      return { from: past.toISOString().slice(0, 10), to };
    }

    // monthly: oyning 1-kunidan
    const from = `${to.slice(0, 7)}-01`;
    return { from, to };
  }
}
