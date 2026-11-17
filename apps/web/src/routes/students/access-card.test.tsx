import type { StudentDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const SID = '0190a000-0000-7000-8000-0000000000e1';
const c = t.studentCard;

const makeDetail = (overrides?: Partial<StudentDetail>): StudentDetail => ({
  id: SID,
  code: 10001,
  fullName: 'Aliyev Jasur',
  birthDate: '2011-04-17',
  phone: null,
  archivedAt: null,
  gender: 'male',
  school: '64-maktab',
  grade: '9-sinf',
  source: 'instagram',
  notes: null,
  photoFileId: null,
  guardians: [],
  accessCodeSet: false,
  telegramLinked: false,
  createdAt: '2026-11-01T05:00:00Z',
  updatedAt: '2026-11-01T05:00:00Z',
  ...overrides,
});

const createHandler = (current: StudentDetail) => (call: Call) => {
  if (call.method === 'GET') {
    if (call.path === `/students/${SID}`) return json(200, current);
    if (call.path === `/students/${SID}/enrollments`) return json(200, []);
    if (call.path === '/groups?status=current') return json(200, []);
    return json(200, []);
  }
  if (call.method === 'POST' && call.path === `/students/${SID}/access-code`) {
    return json(200, { code: '849201' });
  }
  if (call.method === 'POST' && call.path === `/students/${SID}/telegram-unlink`) {
    return json(200, { ok: true });
  }
  return json(200, {});
};

describe('W-06 Mini App kirish bloki (T-126)', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('boshlangʻich holat: kod va telegram yoʻq, kod yaratish tugmasi chiqadi', async () => {
    fakeApi(['student.view', 'student.manage'], createHandler(makeDetail()));
    renderApp(`/students/${SID}`);

    expect(await screen.findByText(c.miniAppAccess)).toBeTruthy();
    expect(screen.getByText(c.notLinked)).toBeTruthy();
    expect(screen.getByText(c.codeNotSet)).toBeTruthy();
    expect(screen.getByRole('button', { name: c.generateCode })).toBeTruthy();
    expect(screen.queryByRole('button', { name: c.unlinkTelegram })).toBeNull();
  });

  it('kod yaratish: confirm soʻraladi, kod koʻrsatiladi va nusxa olinadi', async () => {
    const calls = fakeApi(['student.view', 'student.manage'], createHandler(makeDetail()));
    renderApp(`/students/${SID}`);

    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: c.generateCode });
    await user.click(btn);

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: `/students/${SID}/access-code`,
        body: undefined,
      }),
    );

    expect(await screen.findByText('849201')).toBeTruthy();
    expect(screen.getByText(c.codeGeneratedHint)).toBeTruthy();

    const copyBtn = screen.getByRole('button', { name: c.copyCode });
    await user.click(copyBtn);
    expect(await navigator.clipboard.readText()).toBe('849201');
    expect(await screen.findByText(c.copied)).toBeTruthy();
  });

  it('kod va telegram mavjud: qayta yaratish va uzish amallari ishlaydi', async () => {
    const detail = makeDetail({ accessCodeSet: true, telegramLinked: true });
    const calls = fakeApi(['student.view', 'student.manage'], createHandler(detail));
    renderApp(`/students/${SID}`);

    expect(await screen.findByText(c.linked)).toBeTruthy();
    expect(screen.getByText(c.codeSet)).toBeTruthy();

    const user = userEvent.setup();
    const resetBtn = screen.getByRole('button', { name: c.resetCode });
    const unlinkBtn = screen.getByRole('button', { name: c.unlinkTelegram });

    await user.click(unlinkBtn);
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: `/students/${SID}/telegram-unlink`,
        body: undefined,
      }),
    );

    await user.click(resetBtn);
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: `/students/${SID}/access-code`,
        body: undefined,
      }),
    );
  });

  it('student.manage ruxsati boʻlmaganda amallar koʻrinmaydi', async () => {
    fakeApi(['student.view'], createHandler(makeDetail({ telegramLinked: true })));
    renderApp(`/students/${SID}`);

    expect(await screen.findByText(c.miniAppAccess)).toBeTruthy();
    expect(screen.getByText(c.linked)).toBeTruthy();
    expect(screen.queryByRole('button', { name: c.generateCode })).toBeNull();
    expect(screen.queryByRole('button', { name: c.resetCode })).toBeNull();
    expect(screen.queryByRole('button', { name: c.unlinkTelegram })).toBeNull();
  });
});
