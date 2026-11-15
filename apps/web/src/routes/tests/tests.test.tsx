import type { ImportPreviewResponse, TestDetailResponse, TestItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { confirmBody } from './map.js';

const G = '11111111-1111-4111-8111-111111111111';
const T = '22222222-2222-4222-8222-222222222222';
const S1 = '33333333-3333-4333-8333-333333333333';
const S2 = '44444444-4444-4444-8444-444444444444';
const test: TestItem = {
  id: T,
  branchId: G,
  groupId: G,
  title: 'Oraliq nazorat',
  date: '2026-11-15',
  maxScore: 100,
  sections: [],
  status: 'draft',
  publishedAt: null,
  createdBy: G,
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
};
const detail: TestDetailResponse = { ...test, results: [] };
const preview: ImportPreviewResponse = {
  matched: [
    {
      rowNumber: 2,
      studentId: S1,
      studentName: 'Jasur',
      studentCode: 1024,
      matchType: 'code',
      score: 86,
      sectionScores: [],
    },
  ],
  suggested: [
    {
      rowNumber: 3,
      rawIdentifier: 'Madina K',
      score: 74,
      sectionScores: [],
      suggestedStudentId: S2,
      suggestedStudentName: 'Madina Karimova',
      suggestedStudentCode: 1031,
      similarity: 0.92,
    },
  ],
  unmatched: [{ rowNumber: 4, rawIdentifier: '???', reason: 'topilmadi' }],
};

const handler = (c: Call) => {
  if (c.path.startsWith('/groups')) return json(200, [{ id: G, name: 'MAT-1' }]);
  if (c.path === `/tests?groupId=${G}`) return json(200, [test]);
  if (c.path === `/tests/${T}`) return json(200, detail);
  if (c.path.endsWith('/import-preview')) return json(201, preview);
  if (c.path.endsWith('/import-confirm')) return json(201, { success: true });
  if (c.path.endsWith('/publish')) return json(201, { ...test, status: 'published' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-19 testlar (T-302, FR-GRD-4/5, BR-35)', () => {
  it('BR-35: tasdiqlash — mos kelganlar + faqat qabul qilingan takliflar', () => {
    expect(confirmBody(preview, new Set()).results.map((r) => r.studentId)).toEqual([S1]);
    expect(confirmBody(preview, new Set(['s3'])).results.map((r) => r.studentId)).toEqual([S1, S2]);
  });

  it('forbidden: test.manage yoʻq — soʻrov ketmaydi', async () => {
    const calls = fakeApi(['student.view'], handler);
    renderApp('/tests');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('guruh → test → Excel preview → taklifni qabul → saqlash; eʼlon qilish', async () => {
    const calls = fakeApi(['test.manage'], handler);
    renderApp('/tests');
    await screen.findByRole('option', { name: 'MAT-1' });
    fireEvent.change(screen.getByLabelText(t.tests.group), { target: { value: G } });
    fireEvent.click(await screen.findByText('Oraliq nazorat'));
    const file = new File([new Uint8Array([1, 2, 3])], 'r.xlsx');
    fireEvent.change(await screen.findByLabelText(t.tests.import.file), {
      target: { files: [file] },
    });
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('button', { name: t.tests.import.confirm.replace('{n}', '2') }),
    );
    expect(await screen.findByText(t.tests.import.done)).toBeTruthy();
    expect(calls.find((c) => c.path.endsWith('/import-preview'))?.body).toEqual({
      fileBase64: 'AQID',
    });
    fireEvent.click(screen.getByRole('button', { name: t.tests.publish }));
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/publish'))).toBe(true));
  });
});
