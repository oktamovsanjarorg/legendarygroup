import type { EnrollmentDto, StudentDetail, StudentListRow } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, noContent, renderApp } from '../../test/app.js';
import { toRow } from './index.js';
import { createBody, EMPTY_GUARDIAN, EMPTY_STUDENT, guardianFilled } from './student-draft.js';

const SID = '0190a000-0000-7000-8000-0000000000e1';
const GROUP = '0190a000-0000-7000-8000-0000000000d1';
const row: StudentListRow = {
  id: SID,
  code: 10001,
  fullName: 'Aliyev Jasur',
  birthDate: '2011-04-17',
  phone: null,
  archivedAt: null,
  groups: [{ id: GROUP, name: 'IELTS 7.0 — B2-guruh' }],
  frozen: false,
  guardian: { fullName: 'Aliyev Bahodir', phone: '+998901234567' },
};
const detail: StudentDetail = {
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
  guardians: [
    {
      guardianId: 'gd1',
      fullName: 'Aliyev Bahodir',
      phone: '+998901234567',
      relation: 'father',
      isPrimary: true,
      notify: true,
      linked: true,
    },
    {
      guardianId: 'gd2',
      fullName: 'Aliyeva Dilnoza',
      phone: '+998909876543',
      relation: 'mother',
      isPrimary: false,
      notify: true,
      linked: false,
    },
  ],
  createdAt: '2026-11-01T05:00:00Z',
  updatedAt: '2026-11-01T05:00:00Z',
};
const enrollment: EnrollmentDto = {
  id: 'e1',
  studentId: SID,
  group: { id: GROUP, name: 'IELTS 7.0 — B2-guruh' },
  startDate: '2026-09-01',
  endDate: null,
  endReason: null,
  discountPercent: null,
  state: 'active',
  freezes: [],
};
const duplicate = {
  code: 'POSSIBLE_DUPLICATE',
  message: 'Shunday oʻquvchi bor.',
  details: { matches: [{ id: SID, code: 10001, fullName: 'Aliyev Jasur' }] },
};

const handler = (c: Call) => {
  if (c.method === 'GET') {
    if (c.path.startsWith('/students?')) return json(200, { items: [row], nextCursor: 'abc' });
    if (c.path === `/students/${SID}`) return json(200, detail);
    if (c.path === `/students/${SID}/enrollments`) return json(200, [enrollment]);
    if (c.path.startsWith('/guardians/lookup'))
      return json(200, {
        guardian: {
          id: 'gd1',
          fullName: 'Aliyev Bahodir',
          phone: '+998901234567',
          children: [{ id: SID, fullName: 'Aliyev Jasur', code: 10001 }],
        },
      });
    if (c.path === '/groups?status=current')
      return json(200, [{ id: GROUP, name: 'IELTS 7.0 — B2-guruh' }]);
    return json(200, []);
  }
  if (c.method === 'POST' && c.path === '/students')
    return (c.body as { allowDuplicate: boolean }).allowDuplicate
      ? json(201, detail)
      : json(409, duplicate);
  return c.method === 'DELETE' ? noContent() : json(200, {});
};
const MANAGE = ['student.view', 'student.manage', 'group.view'] as const;
const f = t.students.form;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-05 Oʻquvchilar (T-105)', () => {
  it("student.view yo'q — ruxsat yo'q holati, API chaqirilmaydi", async () => {
    const calls = fakeApi(['group.view'], handler);
    renderApp('/students');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("ro'yxat: kod, guruh, ota-ona; qidiruv va cursor; student.manage'siz — yaratish yo'q", async () => {
    const calls = fakeApi(['student.view'], handler);
    renderApp('/students');
    const tr = (await screen.findByText(row.fullName)).closest('tr') as HTMLElement;
    expect(within(tr).getByText('LG-10001')).toBeTruthy();
    expect(within(tr).getByText('IELTS 7.0 — B2-guruh')).toBeTruthy();
    expect(within(tr).getByText('Aliyev Bahodir')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.students.new })).toBeNull();
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), "o'quvchi");
    await waitFor(() =>
      expect(calls.map((c) => c.path)).toContain('/students?status=active&q=o%27quvchi'),
    );
    await user.click(screen.getByRole('button', { name: t.common.loadMore }));
    await waitFor(() => expect(calls.some((c) => c.path.includes('cursor=abc'))).toBe(true));
  });

  it("FR-STU-1/2: yaratish — telefon E.164, mavjud ota-ona ko'rsatiladi, dublikatda 'Baribir qoʻshish'", async () => {
    const calls = fakeApi(MANAGE, handler);
    const router = renderApp('/students');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: t.students.new }));
    await user.click(screen.getByRole('button', { name: f.create }));
    expect(screen.getByText(f.errors.fullName)).toBeTruthy();
    await user.type(screen.getByLabelText(f.fullName), 'Aliyev Jasur');
    await user.type(screen.getByLabelText(f.guardianPhone), '901234567');
    expect(await screen.findByText(/Bu raqam bazada bor: Aliyev Bahodir/)).toBeTruthy();
    // Topilgan ota-ona ismi o'zi to'ldiriladi.
    await waitFor(() =>
      expect((screen.getByLabelText(f.guardianName) as HTMLInputElement).value).toBe(
        'Aliyev Bahodir',
      ),
    );
    await user.click(screen.getByRole('button', { name: f.create }));
    expect(await screen.findByText(f.duplicateTitle)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: f.createAnyway }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/students/${SID}`));
    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts.at(-1)?.body).toMatchObject({
      fullName: 'Aliyev Jasur',
      allowDuplicate: true,
      guardians: [
        { fullName: 'Aliyev Bahodir', phone: '+998901234567', relation: 'mother', isPrimary: true },
      ],
    });
  });
});

describe('W-06 Kartochka (T-105/T-106)', () => {
  it("ma'lumot va ota-onalar; asosiy qilish — PATCH; uzish — tasdiqdan keyin DELETE", async () => {
    const calls = fakeApi(MANAGE, handler);
    vi.stubGlobal('confirm', () => true);
    renderApp(`/students/${SID}`);
    expect(await screen.findByText('64-maktab, 9-sinf')).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: t.studentCard.makePrimary }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: `/students/${SID}/guardians/gd2`,
        body: { isPrimary: true },
      }),
    );
    await user.click(
      screen.getAllByRole('button', { name: t.studentCard.removeGuardian })[1] as HTMLElement,
    );
    await waitFor(() =>
      expect(calls.map((c) => `${c.method} ${c.path}`)).toContain(
        `DELETE /students/${SID}/guardians/gd2`,
      ),
    );
  });

  it("student.manage yo'q — faqat ko'rish (amallar yo'q)", async () => {
    fakeApi(['student.view'], handler);
    renderApp(`/students/${SID}`);
    expect(await screen.findByText('Aliyeva Dilnoza')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.studentCard.enroll })).toBeNull();
    expect(screen.queryByRole('button', { name: t.studentCard.removeGuardian })).toBeNull();
  });

  it('BR-9: muzlatish — sabab majburiy; POST /enrollments/:id/freezes', async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp(`/students/${SID}`);
    const user = userEvent.setup();
    const m = t.studentCard.enrollments;
    await user.click(await screen.findByRole('tab', { name: t.studentCard.tabs.groups }));
    await user.click(await screen.findByRole('button', { name: m.freeze }));
    await user.click(screen.getByRole('button', { name: m.freezeSubmit }));
    expect(screen.getByText(m.errors.reason)).toBeTruthy();
    await user.type(screen.getByLabelText(m.reason), 'Safar');
    await user.click(screen.getByRole('button', { name: m.freezeSubmit }));
    await waitFor(() => expect(calls.some((c) => c.path === '/enrollments/e1/freezes')).toBe(true));
    const body = calls.find((c) => c.path === '/enrollments/e1/freezes')?.body as {
      from: string;
      to: string;
      reason: string;
    };
    expect(body.reason).toBe('Safar');
    expect((Date.parse(body.to) - Date.parse(body.from)) / 86_400_000).toBe(14);
  });

  it('FR-STU-3: guruhga yozish — POST /enrollments', async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp(`/students/${SID}`);
    const user = userEvent.setup();
    const m = t.studentCard.enrollments;
    await user.click(await screen.findByRole('button', { name: t.studentCard.enroll }));
    await user.click(screen.getByRole('button', { name: m.enrollSubmit }));
    expect(screen.getByText(m.errors.groupId)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(m.group), GROUP);
    await user.click(screen.getByRole('button', { name: m.enrollSubmit }));
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/enrollments')?.body).toMatchObject({
        studentId: SID,
        groupId: GROUP,
      }),
    );
  });
});

describe('oʻquvchi qoralamasi', () => {
  it("standart '+998' — ota-ona kiritilmagan hisoblanadi; bo'sh maydonlar — null", () => {
    expect(guardianFilled(EMPTY_GUARDIAN)).toBe(false);
    const r = createBody({ ...EMPTY_STUDENT, fullName: 'Ali Valiyev' }, EMPTY_GUARDIAN, false);
    expect(r.ok && r.body).toMatchObject({ fullName: 'Ali Valiyev', phone: null, guardians: [] });
  });
  it("noto'g'ri telefonlar maydon bo'yicha ajratiladi", () => {
    const r = createBody(
      { ...EMPTY_STUDENT, fullName: 'Ali Valiyev', phone: '123' },
      { ...EMPTY_GUARDIAN, fullName: 'A', phone: '12' },
      false,
    );
    expect(Object.keys(r.ok ? {} : r.errors).sort()).toEqual([
      'guardianName',
      'guardianPhone',
      'phone',
    ]);
  });
  it('qator: arxiv > muzlatilgan > faol', () => {
    expect(toRow(row).status).toBe('active');
    expect(toRow({ ...row, frozen: true }).status).toBe('frozen');
    expect(toRow({ ...row, frozen: true, archivedAt: '2026-11-01T00:00:00Z' }).status).toBe(
      'archived',
    );
  });
});
