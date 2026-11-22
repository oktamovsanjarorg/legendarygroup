import { appWebApp } from './test-webapp.js';
import type { ImportPreviewResponse } from '@lg/contracts';
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

describe('Ustoz MT-08 Excel import, fuzzy qaror va tasdiqlash (T-302, BR-35)', () => {
  it('2) import preview → fuzzy qaror → confirm oqimi', async () => {
    const preview: ImportPreviewResponse = {
      matched: [
        {
          rowNumber: 2,
          studentId: 's1',
          studentName: 'Ali Valiyev',
          studentCode: 101,
          matchType: 'code',
          score: 35,
          sectionScores: [],
        },
      ],
      suggested: [
        {
          rowNumber: 3,
          rawIdentifier: 'Vali',
          score: 30,
          sectionScores: [],
          suggestedStudentId: 's2',
          suggestedStudentName: 'Valiyev Olim',
          suggestedStudentCode: 102,
          similarity: 0.88,
        },
      ],
      unmatched: [],
    };

    const calls = setupApi({ preview, tests: [{ ...baseTest(), resultsCount: 0 }] });
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);

    await userEvent.click(await screen.findByRole('button', { name: t.tabs.groups }));
    await userEvent.click(await screen.findByText('IELTS B2'));
    await userEvent.click(await screen.findByText(t.groups.tests));
    await userEvent.click(await screen.findByText('Mock IELTS — Reading'));
    await screen.findByText(t.testImport.title);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('fayl input yoʻq');
    const file = new File(['mock content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText(/Valiyev Olim/);
    await waitFor(() => expect(wa.MainButton.params.text).toBe(t.testImport.resolveFirst));
    expect(wa.MainButton.params.is_active).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: t.testImport.accept }));

    await waitFor(() =>
      expect(wa.MainButton.params.text).toBe(t.testImport.submit.replace('{n}', '2')),
    );
    expect(wa.MainButton.params.is_active).toBe(true);

    act(() => wa.MainButton.click());

    await waitFor(() => expect(calls.some((c) => c.path.includes('/import-confirm'))).toBe(true));
    const confirmCall = calls.find((c) => c.path.includes('/import-confirm'));
    expect(confirmCall?.body).toEqual({
      results: [
        { studentId: 's1', score: 35, sectionScores: [] },
        { studentId: 's2', score: 30, sectionScores: [] },
      ],
    });
  });
});
