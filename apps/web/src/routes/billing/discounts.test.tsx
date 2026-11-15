import type { DiscountListResponse, EnrollmentDto, StudentListRow } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const SID = '0190a000-0000-7000-8000-0000000000e1';
const EID = '0190a000-0000-7000-8000-0000000000e9';
const list: DiscountListResponse = {
  adminLimitPercent: 10,
  items: [
    {
      enrollmentId: EID,
      studentId: SID,
      student: 'Aliyev Jasur',
      group: 'IELTS',
      percent: 10,
      reason: 'Aka-uka',
      by: 'Admin Ali',
    },
  ],
};
const row = {
  id: SID,
  code: 10001,
  fullName: 'Aliyev Jasur',
  groups: [],
} as unknown as StudentListRow;
const enr = {
  id: EID,
  group: { id: 'g', name: 'IELTS' },
  state: 'active',
} as unknown as EnrollmentDto;
const handler = (c: Call) => {
  if (c.path === '/billing/discounts') return json(200, list);
  if (c.path.startsWith('/students?')) return json(200, { items: [row], nextCursor: null });
  if (c.path === `/students/${SID}/enrollments`) return json(200, [enr]);
  if (c.method !== 'GET') return json(200, { id: EID });
  return undefined;
};
const f = t.discounts.form;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const grant = async (percent: string, submit: string) => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: t.discounts.grant }));
  await user.type(screen.getByLabelText(f.student), 'ali');
  await user.click(await screen.findByRole('button', { name: /Aliyev Jasur · LG-10001/ }));
  await screen.findByLabelText(f.enrollment);
  await user.type(screen.getByLabelText(f.percent), percent);
  await user.type(screen.getByLabelText(f.reason), 'Olimpiada');
  await user.click(screen.getAllByRole('button', { name: submit }).at(-1)!);
};

describe('W-18 Chegirmalar (T-203, BR-18)', () => {
  it('discount.grant yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/discounts');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('BR-18: limit ichida — PATCH; roʻyxatda sabab va bergan xodim', async () => {
    const calls = fakeApi(['discount.grant', 'student.view'], handler);
    renderApp('/discounts');
    expect(await screen.findByText('Aka-uka')).toBeTruthy();
    expect(screen.getByText('Admin Ali')).toBeTruthy();
    await grant('10', f.submit);
    await screen.findByText(f.done);
    expect(calls.find((c) => c.method === 'PATCH')).toEqual({
      method: 'PATCH',
      path: `/billing/enrollments/${EID}/discount`,
      body: { percent: 10, reason: 'Olimpiada' },
    });
  });

  it('BR-18: Admin limitidan yuqori — Direktorga soʻrov (T-119 payload)', async () => {
    const calls = fakeApi(['discount.grant', 'student.view'], handler);
    renderApp('/discounts');
    await grant('30', f.request);
    await screen.findByText(f.sent);
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: '/approvals',
        body: {
          type: 'discount',
          payload: { enrollmentId: EID, percent: 30, reason: 'Olimpiada' },
          reason: 'Olimpiada',
        },
      }),
    );
  });
});
