import { appWebApp } from './test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { act, cleanup, render, waitFor } from '@testing-library/react';
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

function fakeApi() {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/auth/telegram')
      return json(200, { next: 'done', accessToken: 't-director', user: director });
    if (path === '/auth/me') return json(200, { ...director, permissions: ['payment.create'] });
    return json(500, { code: 'INTERNAL' });
  });
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MS-01 bosh sahifa (Q-99): tashqi panel yoʻq', () => {
  it('MainButton — «Toʻlov kiritish», tashqi havola ochilmaydi', async () => {
    const calls = fakeApi();
    const wa = appWebApp();
    render(<App webApp={wa} />);
    await waitFor(() =>
      expect(wa.MainButton.params).toMatchObject({
        text: t.staffMore.items.pay,
        is_visible: true,
      }),
    );
    act(() => wa.MainButton.click());
    expect(wa.links).toEqual([]);
    expect(calls).not.toContain('POST /auth/panel-handoff');
  });
});
