import type {
  ExcelImportConfirmRequest,
  ImportPreviewResponse,
  TestItem,
  TestSection,
} from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import type { ColumnMap, ImportRow } from '../screens/teacher/test-import.js';
import type { GroupTest } from '../screens/teacher/tests.js';

export const MAX_EXCEL_BYTES = 5 * 1024 * 1024; // 5 MB (A-5)

export function toGroupTest(x: TestItem): GroupTest {
  const iso = x.date.includes('T') ? x.date : `${x.date}T00:00:00+05:00`;
  return {
    id: x.id,
    name: x.title,
    date: new Date(iso),
    maxScore: x.maxScore,
    state: x.status === 'published' ? 'published' : 'draft',
  };
}

export const toGroupTests = (items: readonly TestItem[]): GroupTest[] =>
  items.map(toGroupTest).sort((a, b) => b.date.getTime() - a.date.getTime());

/** BR-35: API preview javobini MT-08 ko'rib chiqish qatorlariga o'tkazish. */
export function toImportRows(
  p: ImportPreviewResponse,
  decisions?: ReadonlyMap<number, 'accept' | 'reject'>,
): ImportRow[] {
  const matched: ImportRow[] = p.matched.map((m) => ({
    row: m.rowNumber,
    kind: 'matched',
    name: m.studentName,
    score: m.score,
  }));

  const fuzzy: ImportRow[] = p.suggested.map((s) => ({
    row: s.rowNumber,
    kind: 'fuzzy',
    raw: s.rawIdentifier,
    suggestion: s.suggestedStudentName,
    score: s.score,
    decision: decisions?.get(s.rowNumber),
  }));

  const errors: ImportRow[] = p.unmatched.map((u) => {
    if (u.reason === 'INVALID_SCORE' || u.reason.startsWith('INVALID_SCORE')) {
      return {
        row: u.rowNumber,
        kind: 'bad_score',
        raw: u.rawIdentifier,
        value: '—',
      };
    }
    return {
      row: u.rowNumber,
      kind: 'not_found',
      raw: u.rawIdentifier,
    };
  });

  return [...matched, ...fuzzy, ...errors].sort((a, b) => a.row - b.row);
}

/** Standart ustun xaritasi: B — F.I.Sh, C — Ball, D.. — Bo'limlar. */
export function toColumnMaps(sections: readonly TestSection[] = []): ColumnMap[] {
  const cols: ColumnMap[] = [
    { column: 'B', field: t.testImport.fields.student },
    { column: 'C', field: t.testImport.fields.score },
  ];
  const letters = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
  sections.forEach((sec, idx) => {
    const col = letters[idx];
    if (col) {
      cols.push({ column: col, field: t.testImport.fields.section.replace('{name}', sec.name) });
    }
  });
  return cols;
}

/** Tasdiqlash: mos kelganlar + qabul qilingan noaniq takliflar. */
export function confirmImportBody(
  p: ImportPreviewResponse,
  decisions: ReadonlyMap<number, 'accept' | 'reject'>,
): ExcelImportConfirmRequest {
  const results = [
    ...p.matched.map((m) => ({
      studentId: m.studentId,
      score: m.score,
      sectionScores: m.sectionScores,
    })),
    ...p.suggested
      .filter((s) => decisions.get(s.rowNumber) === 'accept')
      .map((s) => ({
        studentId: s.suggestedStudentId,
        score: s.score,
        sectionScores: s.sectionScores,
      })),
  ];
  return { results };
}

/** Fayl tekshiruvi: ≤ 5 MB va .xlsx. */
export function validateExcelFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_EXCEL_BYTES) {
    return { ok: false, error: t.testImport.fileTooLarge };
  }
  return { ok: true };
}

/** Faylni base64 matnga o'tkazish (API `fileBase64`). */
export async function fileBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
