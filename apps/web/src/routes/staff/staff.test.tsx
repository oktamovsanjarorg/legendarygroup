import type { StaffDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, noContent, renderApp } from '../../test/app.js';
import { nextOverride, permissionRows } from './permissions.js';

const admin: StaffDetail = {
  id: '0190a000-0000-7000-8000-000000000002',
  fullName: 'Rahimova Gulnoza',
  phone: '+998901000002',
  roles: ['admin'],
  status: 'active',
  telegramLinked: false,
  lastLoginAt: null,
  overridesCount: 1,
  overrides: [{ permission: 'payment.reverse', granted: false }],
  inviteExpiresAt: null,
};
const invite = {
  channel: 'bot',
  url: 'https://t.me/lg_bot?start=inv_abc',
  expiresAt: '2026-11-20T10:00:00Z',
};

const handler = (c: Call) => {
  if (c.method === 'GET' && c.path === '/staff') return json(200, [admin]);
  if (c.method === 'GET' && c.path === `/staff/${admin.id}`) return json(200, admin);
  if (c.method === 'POST' && c.path === '/staff') return json(201, { id: 'new', invite });
  if (c.path.startsWith(`/rbac/users/${admin.id}/`)) return noContent();
  return undefined;
};
const FULL = ['staff.manage', 'staff.permissions'] as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-28 Xodimlar (T-101)', () => {
  it("staff.manage yo'q — ruxsat yo'q holati, API chaqirilmaydi", async () => {
    const calls = fakeApi(['course.manage'], handler);
    renderApp('/staff');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("ro'yxat: ism, rol, holat; menyuda bo'lim bor", async () => {
    fakeApi(FULL, handler);
    renderApp('/staff');
    const row = (await screen.findByText(admin.fullName)).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText(t.roles.admin)).toBeTruthy();
    expect(within(row as HTMLElement).getByText(t.staff.status.active)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.menu.staff })).toBeTruthy();
  });

  it('xato holati: server matni va qayta urinish', async () => {
    fakeApi(FULL, () =>
      json(500, { code: 'INTERNAL', message: 'Server xatosi.', requestId: 'r1' }),
    );
    renderApp('/staff');
    expect(await screen.findByText('Server xatosi.')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.states.retry })).toBeTruthy();
  });

  it("qo'shish: telefon normalizatsiya qilinadi (FR-AUTH-5), taklif havolasi ko'rsatiladi", async () => {
    const calls = fakeApi(FULL, handler);
    renderApp('/staff');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: t.staff.invite }));
    await user.click(screen.getByRole('button', { name: t.staff.form.submit }));
    expect(screen.getByText(t.staff.form.nameInvalid)).toBeTruthy();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    await user.type(screen.getByLabelText(t.staff.form.fullName), 'Saidova Lola');
    const phone = screen.getByLabelText(t.staff.form.phone);
    await user.clear(phone);
    await user.type(phone, '90 100 00 04');
    await user.click(screen.getByRole('button', { name: t.staff.form.submit }));
    expect(await screen.findByText(invite.url)).toBeTruthy();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      fullName: 'Saidova Lola',
      phone: '+998901000004',
      role: 'teacher',
    });
  });

  it('02 §4: cheklangan ruxsatni qaytarish — DELETE; delegatsiya — PUT granted=true', async () => {
    const calls = fakeApi(FULL, handler);
    renderApp('/staff');
    const user = userEvent.setup();
    await user.click(await screen.findByText(admin.fullName));
    const restricted = await screen.findByLabelText(new RegExp(t.permissions['payment.reverse']));
    expect((restricted as HTMLInputElement).checked).toBe(false);
    await user.click(restricted);
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: `/rbac/users/${admin.id}/overrides/payment.reverse`,
        body: undefined,
      }),
    );
    await user.click(screen.getByLabelText(new RegExp(t.permissions['finance.view'])));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: `/rbac/users/${admin.id}/overrides/finance.view`,
        body: { granted: true },
      }),
    );
  });

  it("staff.permissions yo'q — ruxsatlar faqat ko'rish uchun", async () => {
    fakeApi(['staff.manage'], handler);
    renderApp('/staff');
    await userEvent.setup().click(await screen.findByText(admin.fullName));
    const box = await screen.findByLabelText(new RegExp(t.permissions['finance.view']));
    expect((box as HTMLInputElement).disabled).toBe(true);
  });

  it('bloklash — tasdiqdan keyin POST /rbac/users/:id/block', async () => {
    const calls = fakeApi(FULL, handler);
    vi.stubGlobal('confirm', () => true);
    renderApp('/staff');
    const user = userEvent.setup();
    await user.click(await screen.findByText(admin.fullName));
    await user.click(await screen.findByRole('button', { name: t.staff.detail.block }));
    await waitFor(() =>
      expect(calls.map((c) => `${c.method} ${c.path}`)).toContain(
        `POST /rbac/users/${admin.id}/block`,
      ),
    );
  });
});

describe('02 §4 override qoidasi (permissionRows)', () => {
  it('Ustozga delegatsiya qilinadigan ruxsatlar taklif qilinmaydi', () => {
    const rows = permissionRows({ roles: ['teacher'], overrides: [] });
    expect(rows.every((r) => r.inRole && r.effective)).toBe(true);
    expect(rows.some((r) => r.permission === 'finance.view')).toBe(false);
  });
  it('Admin: delegatsiya qilinadiganlar standartda yoqilmagan', () => {
    const rows = permissionRows({ roles: ['admin'], overrides: [] });
    expect(rows.filter((r) => !r.inRole).map((r) => r.permission)).toEqual([
      'expense.manage',
      'finance.view',
    ]);
    expect(rows.filter((r) => !r.inRole).every((r) => !r.effective)).toBe(true);
  });
  it('standartga qaytish — null (override yozuvi qolmaydi)', () => {
    const base = { permission: 'payment.reverse', effective: false } as const;
    expect(nextOverride({ ...base, inRole: true }, true)).toBeNull();
    expect(nextOverride({ ...base, inRole: true }, false)).toBe(false);
    expect(nextOverride({ ...base, inRole: false }, true)).toBe(true);
    expect(nextOverride({ ...base, inRole: false }, false)).toBeNull();
  });
});
