import { appWebApp } from './test-webapp.js';
import type { ImportPreviewResponse, TestResultItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';
import { baseTest, CLOCK, setupApi } from './teacher-flow-helpers.test-util.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const preview: ImportPreviewResponse = {
  matched: [
    {
      rowNumber: 2,
      studentId: 's1',
      studentName: 'Hasan Valiyev',
      studentCode: 101,
      matchType: 'code',
      score: 35,
      sectionScores: [],
    },
  ],
  suggested: [],
  unmatched: [],
};

const result: TestResultItem = {
  id: 'r1',
  testId: 't-new',
  studentId: 's1',
  studentName: 'Hasan Valiyev',
  score: 35,
  percentage: 87.5,
  sectionScores: [],
  version: 1,
  createdAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T10:00:00.000Z',
};

async function openTest() {
  await userEvent.click(await screen.findByRole('button', { name: t.tabs.groups }));
  await userEvent.click(await screen.findByText('IELTS B2'));
  await userEvent.click(await screen.findByText(t.groups.tests));
  await userEvent.click(await screen.findByText('Mock IELTS — Reading'));
  await screen.findByText(t.testImport.title);
}

describe('MT-08 import saqlangandan keyin va yordamchi ustoz (T-302, BR-35, Q-62)', () => {
  it('confirm → koʻrib chiqish yopiladi, eʼlon tasdiq bilan bir marta yuboriladi', async () => {
    const calls = setupApi({ preview, tests: [{ ...baseTest(), resultsCount: 0 }] });
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);
    await openTest();
    // Natija yo'q, fayl tanlanmagan — "Import qilish" ko'rinmaydi (oldin bosilsa hech narsa qilmasdi).
    expect(wa.MainButton.params.is_visible).toBe(false);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('fayl input yoʻq');
    fireEvent.change(input, { target: { files: [new File(['x'], 'natija.xlsx')] } });
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(true));
    act(() => wa.MainButton.click());

    // Oldin preview tozalanmasdi — e'lon tugmasi qayta yuklamaguncha chiqmasdi.
    await userEvent.click(await screen.findByText(t.testImport.publish));
    expect(calls.some((c) => c.path.endsWith('/publish'))).toBe(false);
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(false));

    const confirm = await screen.findAllByRole('button', { name: t.testImport.publish });
    await userEvent.click(confirm[confirm.length - 1]!);
    await waitFor(() => expect(calls.filter((c) => c.path.endsWith('/publish'))).toHaveLength(1));
    expect(await screen.findByText(t.tests.published)).toBeTruthy();
  });

  it('yordamchi ustoz natijalarni koʻradi, lekin import va eʼlon yoʻq (Q-62)', async () => {
    const calls = setupApi({
      isAssistant: true,
      results: [result],
      tests: [{ ...baseTest(), resultsCount: 1 }],
    });
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);
    await openTest();

    expect(await screen.findByText('Hasan Valiyev')).toBeTruthy();
    expect(screen.queryByText(t.testImport.chooseFile)).toBeNull();
    expect(screen.queryByText(t.testImport.template)).toBeNull();
    expect(screen.queryByText(t.testImport.publish)).toBeNull();
    expect(wa.MainButton.params.is_visible).toBe(false);
    expect(calls.some((c) => c.method === 'POST' && c.path.startsWith('/tests'))).toBe(false);
  });
});
