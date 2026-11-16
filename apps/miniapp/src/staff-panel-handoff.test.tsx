import { miniappMessages as t } from '@lg/i18n';
import { createFakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const URL_ = 'https://app.test.lg/handoff#t=kkkk';
const director = {
  id: 'u1',
  fullName: 'Bosh Direktor',
  phone: '+998901112233',
  roles: ['director'],
  activeRole: 'director',
};

/** Soxta API: Director Mini App'i; `panel-handoff` — berilgan javob. */
function fakeApi(handoff: Response) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/auth/telegram')
      return json(200, { next: 'done', accessToken: 't-director', user: director });
    if (path === '/auth/me') return json(200, { ...director, permissions: [] });
    if (path === '/auth/panel-handoff') return handoff.clone();
    return json(500, { code: 'INTERNAL' });
  });
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MS-01 «Boshqaruv panelini ochish» (T-121)', () => {
  it('MainButton → bir martalik havola tizim brauzerida (openLink)', async () => {
    const calls = fakeApi(json(200, { url: URL_, expiresAt: '2026-11-16T10:01:00Z' }));
    const wa = createFakeWebApp();
    render(<App webApp={wa} />);
    await waitFor(() =>
      expect(wa.MainButton.params).toMatchObject({ text: t.dashboard.openPanel, is_visible: true }),
    );
    expect(calls).not.toContain('POST /auth/panel-handoff');
    act(() => wa.MainButton.click());
    await waitFor(() => expect(wa.links).toEqual([URL_]));
    expect(calls.filter((c) => c === 'POST /auth/panel-handoff')).toHaveLength(1);
  });

  it('server rad etsa — havola ochilmaydi, xato koʻrsatiladi', async () => {
    fakeApi(json(403, { code: 'FORBIDDEN', message: 'Ruxsat yoʻq.' }));
    const wa = createFakeWebApp();
    render(<App webApp={wa} />);
    await waitFor(() =>
      expect(wa.MainButton.params).toMatchObject({ text: t.dashboard.openPanel, is_visible: true }),
    );
    act(() => wa.MainButton.click());
    expect(await screen.findByText('Ruxsat yoʻq.')).toBeTruthy();
    expect(wa.links).toEqual([]);
  });
});
