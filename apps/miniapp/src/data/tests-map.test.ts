import type { ImportPreviewResponse, TestItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { describe, expect, it } from 'vitest';
import {
  confirmImportBody,
  fileBase64,
  MAX_EXCEL_BYTES,
  toColumnMaps,
  toGroupTest,
  toGroupTests,
  toImportRows,
  validateExcelFile,
} from './tests-map.js';

describe('tests-map (T-302, BR-35)', () => {
  const preview: ImportPreviewResponse = {
    matched: [
      {
        rowNumber: 2,
        studentId: 'st-1',
        studentName: 'Ali Valiyev',
        studentCode: 101,
        matchType: 'code',
        score: 35,
        sectionScores: [{ sectionName: 'Reading', score: 35 }],
      },
    ],
    suggested: [
      {
        rowNumber: 4,
        rawIdentifier: 'Madina A.',
        score: 32,
        sectionScores: [{ sectionName: 'Reading', score: 32 }],
        suggestedStudentId: 'st-2',
        suggestedStudentName: 'Madina Aliyeva',
        suggestedStudentCode: 102,
        similarity: 0.85,
      },
    ],
    unmatched: [
      { rowNumber: 3, rawIdentifier: 'Nomaʼlum', reason: 'NOT_FOUND' },
      { rowNumber: 5, rawIdentifier: 'Xato ball', reason: 'INVALID_SCORE' },
    ],
  };

  it('toGroupTest: draft va published holatlari, sana konvertatsiyasi', () => {
    const item1: TestItem = {
      id: 't-1',
      branchId: 'b-1',
      groupId: 'g-1',
      title: 'Grammar Test',
      date: '2026-11-16',
      maxScore: 100,
      sections: [],
      status: 'draft',
      publishedAt: null,
      createdBy: 'u-1',
      createdAt: '2026-11-16T10:00:00.000Z',
      updatedAt: '2026-11-16T10:00:00.000Z',
    };
    const t1 = toGroupTest(item1);
    expect(t1.name).toBe('Grammar Test');
    expect(t1.state).toBe('draft');
    expect(t1.maxScore).toBe(100);
    expect(t1.date.getFullYear()).toBe(2026);

    const item2: TestItem = { ...item1, id: 't-2', status: 'published' };
    expect(toGroupTest(item2).state).toBe('published');
  });

  it('toGroupTests: sanasi bo‘yicha kamayish tartibida saralaydi', () => {
    const items: TestItem[] = [
      {
        id: 't-1',
        branchId: 'b-1',
        groupId: 'g-1',
        title: 'T1',
        date: '2026-11-10',
        maxScore: 100,
        sections: [],
        status: 'draft',
        publishedAt: null,
        createdBy: 'u-1',
        createdAt: '2026-11-10T10:00:00.000Z',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
      {
        id: 't-2',
        branchId: 'b-1',
        groupId: 'g-1',
        title: 'T2',
        date: '2026-11-15',
        maxScore: 100,
        sections: [],
        status: 'published',
        publishedAt: null,
        createdBy: 'u-1',
        createdAt: '2026-11-15T10:00:00.000Z',
        updatedAt: '2026-11-15T10:00:00.000Z',
      },
    ];
    const list = toGroupTests(items);
    expect(list[0]?.id).toBe('t-2');
    expect(list[1]?.id).toBe('t-1');
  });

  it('toImportRows: har bir qator turi (matched, fuzzy, not_found, bad_score) qator bo‘yicha tartiblangan', () => {
    const decisions = new Map<number, 'accept' | 'reject'>([[4, 'accept']]);
    const rows = toImportRows(preview, decisions);

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ row: 2, kind: 'matched', name: 'Ali Valiyev', score: 35 });
    expect(rows[1]).toMatchObject({ row: 3, kind: 'not_found', raw: 'Nomaʼlum' });
    expect(rows[2]).toMatchObject({
      row: 4,
      kind: 'fuzzy',
      raw: 'Madina A.',
      suggestion: 'Madina Aliyeva',
      score: 32,
      decision: 'accept',
    });
    expect(rows[3]).toMatchObject({ row: 5, kind: 'bad_score', raw: 'Xato ball' });
  });

  it('toColumnMaps: standart ustunlar va qo‘shimcha bo‘limlar', () => {
    const cols = toColumnMaps([{ name: 'Writing', maxScore: 20 }]);
    expect(cols).toHaveLength(3);
    expect(cols[0]).toMatchObject({ column: 'B', field: t.testImport.fields.student });
    expect(cols[1]).toMatchObject({ column: 'C', field: t.testImport.fields.score });
    expect(cols[2]).toMatchObject({ column: 'D', field: 'Boʻlim: Writing' });
  });

  it('confirmImportBody: faqat matched va qabul qilingan takliflar kiradi', () => {
    const decisions = new Map<number, 'accept' | 'reject'>([[4, 'accept']]);
    const body = confirmImportBody(preview, decisions);
    expect(body.results).toHaveLength(2);
    expect(body.results[0]?.studentId).toBe('st-1');
    expect(body.results[1]?.studentId).toBe('st-2');

    const rejectedDecisions = new Map<number, 'accept' | 'reject'>([[4, 'reject']]);
    const body2 = confirmImportBody(preview, rejectedDecisions);
    expect(body2.results).toHaveLength(1);
    expect(body2.results[0]?.studentId).toBe('st-1');
  });

  it('validateExcelFile: 5 MB cheklovi', () => {
    const smallFile = new File([new Uint8Array(100)], 'test.xlsx');
    expect(validateExcelFile(smallFile).ok).toBe(true);

    const largeFile = { size: MAX_EXCEL_BYTES + 10 } as File;
    const res = validateExcelFile(largeFile);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(t.testImport.fileTooLarge);
    }
  });

  it('fileBase64: fayl baytlarini base64 matnga o‘tkazadi', async () => {
    const text = 'hello test';
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], 'test.txt');
    const b64 = await fileBase64(file);
    expect(btoa(text)).toBe(b64);
  });
});
