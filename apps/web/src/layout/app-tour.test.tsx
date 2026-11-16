import { ROLE_PERMISSIONS } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, renderApp } from '../test/app.js';

/** jsdom'da maket yoʻq: menyu bandlari "koʻrinadi" deb hisoblansin. */
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  Element.prototype.scrollIntoView = () => undefined;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Tur oxirigacha yuriladi; har qadam sarlavhasi qaytadi. */
async function walk(user: ReturnType<typeof userEvent.setup>): Promise<string[]> {
  const seen: string[] = [];
  for (;;) {
    const dialog = await screen.findByRole('dialog');
    seen.push(dialog.querySelector('#tour-title')?.textContent ?? '');
    const done = screen.queryByRole('button', { name: t.tour.done });
    if (done) {
      await user.click(done);
      return seen;
    }
    await user.click(screen.getByRole('button', { name: t.tour.next }));
  }
}

describe('Birinchi kirishda tanishtiruv (T-124)', () => {
  it('Direktor: birinchi kirishda oʻzi ochiladi, menyu boʻylab yuradi; qayta kirishda chiqmaydi', async () => {
    const user = userEvent.setup();
    fakeApi(ROLE_PERMISSIONS.director, () => undefined);
    renderApp('/');
    expect(await screen.findByRole('dialog', { name: 'Bosh sahifa' })).toBeTruthy();
    const seen = await walk(user);
    expect(seen).toContain('Tasdiqlash soʻrovlari');
    expect(seen.at(-1)).toBe('Yordam');
    cleanup();
    renderApp('/');
    await screen.findByText(t.home.greeting.replace('{name}', 'Bosh Direktor'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Admin: ruxsatsiz boʻlim (Tasdiqlash soʻrovlari) qadami yoʻq', async () => {
    const user = userEvent.setup();
    fakeApi(ROLE_PERMISSIONS.admin, () => undefined);
    renderApp('/');
    await screen.findByRole('dialog');
    expect(await walk(user)).not.toContain('Tasdiqlash soʻrovlari');
  });

  it('«Oʻtkazib yuborish» — koʻrildi; «Yordam» → «Tanishtiruvni qayta koʻrish» qayta ochadi', async () => {
    const user = userEvent.setup();
    fakeApi(ROLE_PERMISSIONS.director, () => undefined);
    renderApp('/help');
    await user.click(await screen.findByRole('button', { name: t.tour.skip }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getByRole('button', { name: t.help.replayTour }));
    expect(await screen.findByRole('dialog', { name: 'Bosh sahifa' })).toBeTruthy();
  });
});
