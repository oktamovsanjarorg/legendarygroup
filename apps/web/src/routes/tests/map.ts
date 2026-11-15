import type { ImportPreviewResponse, TestDetailResponse, TestItem as ApiTest } from '@lg/contracts';
import type { ImportRow, TestItem, TestResultRow } from '../../screens/f3/types.js';

export const toTest = (x: ApiTest): TestItem => ({
  id: x.id,
  title: x.title,
  date: x.date,
  maxScore: x.maxScore,
  status: x.status,
});

export const toResults = (d: TestDetailResponse): TestResultRow[] =>
  d.results.map((r) => ({
    id: r.id,
    studentName: r.studentName ?? '—',
    studentCode: r.studentCode ?? null,
    score: r.score,
    percent: r.percentage,
  }));

export const toImportRows = (p: ImportPreviewResponse): ImportRow[] =>
  [
    ...p.matched.map((m) => ({
      key: `m${m.rowNumber}`,
      rowNumber: m.rowNumber,
      kind: 'matched' as const,
      raw: String(m.studentCode),
      studentId: m.studentId,
      studentName: m.studentName,
      score: m.score,
      note: null,
    })),
    ...p.suggested.map((s) => ({
      key: `s${s.rowNumber}`,
      rowNumber: s.rowNumber,
      kind: 'suggested' as const,
      raw: s.rawIdentifier,
      studentId: s.suggestedStudentId,
      studentName: s.suggestedStudentName,
      score: s.score,
      note: `${Math.round(s.similarity * 100)}%`,
    })),
    ...p.unmatched.map((u) => ({
      key: `u${u.rowNumber}`,
      rowNumber: u.rowNumber,
      kind: 'unmatched' as const,
      raw: u.rawIdentifier,
      studentId: null,
      studentName: null,
      score: null,
      note: u.reason,
    })),
  ].sort((a, b) => a.rowNumber - b.rowNumber);

/** Tasdiqlash: mos kelganlar + qabul qilingan takliflar (bo'lim ballari bilan). */
export function confirmBody(p: ImportPreviewResponse, accepted: ReadonlySet<string>) {
  return {
    results: [
      ...p.matched.map((m) => ({
        studentId: m.studentId,
        score: m.score,
        sectionScores: m.sectionScores,
      })),
      ...p.suggested
        .filter((s) => accepted.has(`s${s.rowNumber}`))
        .map((s) => ({
          studentId: s.suggestedStudentId,
          score: s.score,
          sectionScores: s.sectionScores,
        })),
    ],
  };
}

/** Fayl → base64 (API `fileBase64`). */
export async function fileBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
