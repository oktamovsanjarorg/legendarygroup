import type {
  ImportPreviewResponse,
  MatchedStudentImportRow,
  SuggestedStudentImportRow,
  TestSection,
  TestSectionScore,
  UnmatchedStudentImportRow,
} from '@lg/contracts';
import {
  matchStudent,
  type StudentCandidate,
  validateSectionScores,
  validateTestScore,
} from '@lg/domain';
import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { GroupStudentEntry } from './tests.repository.js';

@Injectable()
export class ExcelTestService {
  async generateTemplate(params: {
    testTitle: string;
    maxScore: number;
    sections: TestSection[];
    students: GroupStudentEntry[];
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Natijalar');

    const headers = ['Oʻquvchi kodi', 'F.I.Sh', `Umumiy ball (maks. ${params.maxScore})`];
    for (const sec of params.sections) {
      headers.push(`${sec.name} (maks. ${sec.maxScore})`);
    }

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };

    for (const st of params.students) {
      const rowValues: Array<string | number> = [st.code, st.fullName, ''];
      for (let i = 0; i < params.sections.length; i++) {
        rowValues.push('');
      }
      worksheet.addRow(rowValues);
    }

    worksheet.columns.forEach((col) => {
      col.width = 25;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async parseExcelResults(
    buffer: Buffer,
    test: { maxScore: number; sections: TestSection[] },
    students: StudentCandidate[],
  ): Promise<ImportPreviewResponse> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { matched: [], unmatched: [], suggested: [] };
    }

    const matched: MatchedStudentImportRow[] = [];
    const unmatched: UnmatchedStudentImportRow[] = [];
    const suggested: SuggestedStudentImportRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Header
      this.processRow({ row, rowNumber, test, students, matched, unmatched, suggested });
    });

    return { matched, unmatched, suggested };
  }

  private processRow(ctx: {
    row: ExcelJS.Row;
    rowNumber: number;
    test: { maxScore: number; sections: TestSection[] };
    students: StudentCandidate[];
    matched: MatchedStudentImportRow[];
    unmatched: UnmatchedStudentImportRow[];
    suggested: SuggestedStudentImportRow[];
  }): void {
    const rawCode = ctx.row.getCell(1).text.trim();
    const rawName = ctx.row.getCell(2).text.trim();
    const rawScore = Number.parseInt(ctx.row.getCell(3).text.trim(), 10);
    const identifier = rawCode || rawName;

    if (!identifier) return;

    if (Number.isNaN(rawScore) || !validateTestScore(rawScore, ctx.test.maxScore)) {
      ctx.unmatched.push({
        rowNumber: ctx.rowNumber,
        rawIdentifier: identifier,
        reason: 'INVALID_SCORE',
      });
      return;
    }

    const sectionScores = this.extractSectionScores(ctx.row, ctx.test.sections);
    const secValidation = validateSectionScores(sectionScores, ctx.test.sections);
    if (!secValidation.valid) {
      ctx.unmatched.push({
        rowNumber: ctx.rowNumber,
        rawIdentifier: identifier,
        reason: secValidation.error ?? 'INVALID_SECTION_SCORE',
      });
      return;
    }

    this.routeMatch(ctx, identifier, rawScore, sectionScores);
  }

  private extractSectionScores(row: ExcelJS.Row, sections: TestSection[]): TestSectionScore[] {
    const sectionScores: TestSectionScore[] = [];
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec) continue;
      const valText = row.getCell(4 + i).text.trim();
      if (valText) {
        const val = Number.parseInt(valText, 10);
        if (!Number.isNaN(val)) {
          sectionScores.push({ sectionName: sec.name, score: val });
        }
      }
    }
    return sectionScores;
  }

  private routeMatch(
    ctx: {
      rowNumber: number;
      students: StudentCandidate[];
      matched: MatchedStudentImportRow[];
      unmatched: UnmatchedStudentImportRow[];
      suggested: SuggestedStudentImportRow[];
    },
    identifier: string,
    score: number,
    sectionScores: TestSectionScore[],
  ): void {
    const match = matchStudent(identifier, ctx.students);
    if (match.type === 'code' || match.type === 'exact_name') {
      ctx.matched.push({
        rowNumber: ctx.rowNumber,
        studentId: match.student.id,
        studentName: match.student.fullName,
        studentCode: match.student.code,
        matchType: match.type,
        score,
        sectionScores,
      });
    } else if (match.type === 'suggested') {
      ctx.suggested.push({
        rowNumber: ctx.rowNumber,
        rawIdentifier: identifier,
        score,
        sectionScores,
        suggestedStudentId: match.student.id,
        suggestedStudentName: match.student.fullName,
        suggestedStudentCode: match.student.code,
        similarity: match.similarity,
      });
    } else {
      ctx.unmatched.push({
        rowNumber: ctx.rowNumber,
        rawIdentifier: identifier,
        reason: match.reason,
      });
    }
  }
}
