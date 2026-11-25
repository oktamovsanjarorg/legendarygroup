import { appWebApp } from './test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const director = {
  id: 'u1',
  fullName: 'Bosh Direktor',
  phone: '+998901112233',
  roles: ['director'],
  activeRole: 'director',
};

const KPI = {
  revenueToday: '0',
  revenueYesterday: '0',
  attendance: 0,
  unmarked: 0,
  absentToday: 0,
  queue: 0,
  approvals: 0,
};

function fakeApi() {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/auth/telegram')
      return json(200, { next: 'done', accessToken: 't-director', user: director });
    if (path === '/auth/me') return json(200, { ...director, permissions: ['payment.create'] });
    if (path === '/dashboard/director') return json(200, KPI);
    return json(500, { code: 'INTERNAL' });
  });
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MS-01 bosh sahifa (Q-99): tashqi panel yoʻq', () => {
  it('MainButton yoʻq (Q-113); «Toʻlov kiritish» — tezkor amal; tashqi havola ochilmaydi', async () => {
    const calls = fakeApi();
    const wa = appWebApp();
    render(<App webApp={wa} />);
    fireEvent.click(await screen.findByRole('button', { name: t.staffMore.items.pay }));
    await waitFor(() => expect(screen.getByText(t.staffPay.searchTitle)).toBeTruthy());
    expect(wa.MainButton.params.is_visible).toBeFalsy();
    expect(wa.links).toEqual([]);
    expect(calls).not.toContain('POST /auth/panel-handoff');
  });

  it('keng ekran (Telegram Desktop): yon panelda barcha boʻlimlar, pastki menyu yoʻq (T-164)', async () => {
    fakeApi();
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('min-width'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<App webApp={appWebApp()} />);
    const side = await screen.findByRole('navigation', { name: 'Boʻlimlar' });
    expect(side.textContent).toContain(t.stabs.students);
    expect(side.textContent).toContain(t.staffMore.sections.money);
    expect(side.textContent).not.toContain(t.stabs.menu);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });
});
