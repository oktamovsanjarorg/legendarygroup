import { appWebApp } from '../test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app.js';
import { RELINK_DELAY_MS, RELINK_TRIES } from './not-linked.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const user = {
  id: 'u1',
  fullName: 'Ali Valiyev',
  phone: '+998901112233',
  roles: ['guardian'],
  activeRole: 'guardian',
};

/** Bot kontaktni `linkAfter` urinishdan keyin bog'laydi (`null` — hech qachon). */
function fakeApi(linkAfter: number | null) {
  let tries = 0;
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace('/api', '');
    if (path === '/auth/telegram') {
      tries += 1;
      if (linkAfter === null || tries <= linkAfter)
        return json(401, { code: 'TELEGRAM_NOT_LINKED', message: 'bogʻlanmagan' });
      return json(200, { next: 'done', accessToken: 't-guardian', user });
    }
    if (path === '/auth/me') return json(200, { ...user, permissions: [] });
    return json(404, { code: 'NOT_FOUND' });
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const shareButton = async (wa: ReturnType<typeof appWebApp>) =>
  waitFor(() =>
    expect(wa.MainButton.params).toMatchObject({ text: t.notLinked.share, is_visible: true }),
  );

describe('C-03 Mini App ichida bogʻlash (Q-109)', () => {
  it('raqam ulashiladi → bot bogʻlaydi → ilova oʻzi kiradi (botga chiqmasdan)', async () => {
    fakeApi(2);
    const wa = appWebApp();
    render(<App webApp={wa} />);
    await screen.findByText(t.notLinked.title);
    await shareButton(wa);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    act(() => wa.MainButton.click());
    expect(wa.contactRequests).toBe(1);
    expect(await screen.findByText(t.notLinked.waiting)).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(RELINK_DELAY_MS * 2));
    await waitFor(() => expect(screen.queryByText(t.notLinked.title)).toBeNull());
    expect(wa.closed).toBe(false);
  });

  it('raqam topilmasa — tushuntirish va «Botga qaytish»', async () => {
    fakeApi(null);
    const wa = appWebApp();
    render(<App webApp={wa} />);
    await shareButton(wa);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    act(() => wa.MainButton.click());
    await act(() => vi.advanceTimersByTimeAsync(RELINK_DELAY_MS * (RELINK_TRIES + 1)));
    expect(await screen.findByText(t.notLinked.notFound)).toBeTruthy();
    await waitFor(() =>
      expect(wa.MainButton.params).toMatchObject({ text: t.notLinked.backToBot }),
    );
  });

  it('ulashishdan voz kechsa — qayta soʻrash mumkin', async () => {
    fakeApi(null);
    const wa = appWebApp();
    wa.contactAnswer = false;
    render(<App webApp={wa} />);
    await shareButton(wa);
    act(() => wa.MainButton.click());
    expect(await screen.findByText(t.notLinked.declined)).toBeTruthy();
    await shareButton(wa);
  });
});
