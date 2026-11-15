import type { GuardianLinkRequest, StudentListRow } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const RID = '0190a000-0000-7000-8000-0000000000a9';
const SID = '0190a000-0000-7000-8000-0000000000e1';
const req = {
  id: RID,
  telegramId: '555',
  telegramUsername: 'ona_dilnoza',
  phone: '+998901112233',
  fullName: 'Dilnoza',
  status: 'pending',
  createdAt: '2026-11-15T05:00:00.000Z',
  updatedAt: '2026-11-15T05:00:00.000Z',
} as GuardianLinkRequest;
const student = {
  id: SID,
  code: 10001,
  fullName: 'Aliyev Jasur',
  groups: [],
} as unknown as StudentListRow;
const handler = (c: Call) => {
  if (c.path.startsWith('/guardians/link-requests?')) return json(200, { items: [req], total: 1 });
  if (c.path.startsWith('/students?')) return json(200, { items: [student], nextCursor: null });
  if (c.method === 'POST') return json(200, { ...req, status: 'approved' });
  return undefined;
};
const l = t.linkRequests;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-33 Bogʻlanish soʻrovlari (T-110, FR-AUTH-1)', () => {
  it('student.manage yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['student.view'], handler);
    renderApp('/link-requests');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('FR-AUTH-1: oʻquvchini tanlab bogʻlash — studentId va relation bilan approve', async () => {
    const calls = fakeApi(['student.manage'], handler);
    renderApp('/link-requests');
    const user = userEvent.setup();
    expect(await screen.findByText('Dilnoza (@ona_dilnoza)')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: l.link }));
    await user.type(screen.getByLabelText(l.student), 'ali');
    await user.click(await screen.findByRole('button', { name: /Aliyev Jasur · LG-10001/ }));
    await user.selectOptions(screen.getByLabelText(l.relation), 'father');
    await user.click(screen.getAllByRole('button', { name: l.link }).at(-1)!);
    await screen.findByText(l.linked);
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: `/guardians/link-requests/${RID}/approve`,
        body: { studentId: SID, relation: 'father' },
      }),
    );
  });
});
