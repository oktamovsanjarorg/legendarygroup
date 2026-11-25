import { appWebApp } from './test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';
import { resolveSplit, SPLITS } from './split-view.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const SID = '11111111-1111-4111-8111-111111111111';
const admin = {
  id: 'u1',
  fullName: 'A',
  phone: '+998901112233',
  roles: ['admin'],
  activeRole: 'admin',
};
const row = {
  id: SID,
  code: 1042,
  fullName: 'Ali Valiyev',
  birthDate: null,
  phone: null,
  archivedAt: null,
  groups: [],
  frozen: false,
  guardian: null,
};

function wide() {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('min-width'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function fakeApi() {
  const paths: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace('/api', '').split('?')[0] ?? '';
    paths.push(path);
    if (path === '/auth/telegram')
      return json(200, { next: 'done', accessToken: 't', user: admin });
    if (path === '/auth/me')
      return json(200, { ...admin, permissions: ['student.view', 'student.manage'] });
    if (path === '/students') return json(200, { items: [row], nextCursor: null });
    if (path === `/billing/ledger/${SID}/summary`)
      return json(200, {
        studentId: SID,
        balance: '0',
        totalDebt: '0',
        totalAdvance: '0',
        isCritical: false,
      });
    return json(404, { code: 'NOT_FOUND' });
  });
  return paths;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Keng ekran: roʻyxat + tafsilot (T-164)', () => {
  it('tafsilotda chap panel — oxirgi ochilgan mos roʻyxat; mos kelmasa — yoʻq', () => {
    const debtors = SPLITS.find((s) => s.list === '/staff/debtors') ?? null;
    expect(resolveSplit('/staff/search', null)).toMatchObject({ detail: false });
    expect(resolveSplit(`/staff/student/${SID}`, debtors)?.split.list).toBe('/staff/debtors');
    expect(resolveSplit(`/staff/student/${SID}`, null)?.split.list).toBe('/staff/search');
    expect(resolveSplit('/staff/leads/x', debtors)?.split.list).toBe('/staff/leads');
    expect(resolveSplit('/staff/cash', debtors)).toBeNull();
  });

  it('qidiruv → oʻquvchi: roʻyxat va qidiruv matni chapda qoladi, kartochka oʻngda', async () => {
    wide();
    const paths = fakeApi();
    render(<App webApp={appWebApp()} />);
    const side = await screen.findByRole('navigation', { name: 'Boʻlimlar' });
    fireEvent.click(
      [...side.querySelectorAll('button')].find((b) => b.textContent === t.stabs.students) ?? side,
    );
    expect(await screen.findByText(t.split.pick)).toBeTruthy();
    const input = screen.getByPlaceholderText(t.search.placeholder) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ali' } });
    fireEvent.click(await screen.findByText('Ali Valiyev'));
    await waitFor(() => expect(paths).toContain(`/students/${SID}`));
    expect(screen.queryByText(t.split.pick)).toBeNull();
    expect((screen.getByPlaceholderText(t.search.placeholder) as HTMLInputElement).value).toBe(
      'Ali',
    );
  });
});
