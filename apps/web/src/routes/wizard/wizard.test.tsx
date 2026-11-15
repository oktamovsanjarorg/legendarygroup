import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { centerFilled } from './use-setup.js';

const settings = (over: Partial<SystemSettings> = {}): SystemSettings => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...over,
});

/** API kabi: bigint — satr. */
const wire = (v: unknown): unknown =>
  JSON.parse(JSON.stringify(v, (_k, x: unknown) => (typeof x === 'bigint' ? String(x) : x)));

const handler =
  (s: SystemSettings, courses: unknown[] = []) =>
  (c: Call) => {
    if (c.path === '/settings') return json(200, wire(s));
    if (c.path === '/settings/public')
      return json(200, { ...(wire(s) as object), botUrl: 'https://t.me/legendary_test_bot' });
    if (c.path.startsWith('/courses')) return json(200, courses);
    if (c.path.startsWith('/rooms')) return json(200, []);
    if (c.path === '/staff') return json(200, []);
    if (c.path.startsWith('/groups')) return json(200, []);
    if (c.path.startsWith('/students')) return json(200, { items: [], nextCursor: null });
    return undefined;
  };

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-33 birinchi ishga tushirish ustasi (T-117)', () => {
  it('markaz: seed qiymati — kiritilmagan; oʻzgartirilgan — kiritilgan', () => {
    expect(centerFilled(settings())).toBe(false);
    const centerInfo = { ...DEFAULT_SYSTEM_SETTINGS.centerInfo, phone: '+998712000000' };
    expect(centerFilled(settings({ centerInfo }))).toBe(true);
  });

  it('forbidden: settings.manage yoʻq — ruxsat yoʻq', async () => {
    fakeApi(['course.manage'], handler(settings()));
    renderApp('/wizard');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
  });

  it('holat serverdan: kurs bor — "Bajarildi", soni; qadam saqlanadi', async () => {
    const course = { id: 'c1', name: 'Ingliz' };
    fakeApi(['settings.manage', 'course.manage'], handler(settings(), [course]));
    renderApp('/wizard');
    expect(await screen.findByText('1-qadam / 8')).toBeTruthy();
    expect(screen.getByText(t.wizard.pending)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.wizard.skip }));
    fireEvent.click(screen.getByRole('button', { name: t.wizard.next }));
    expect(await screen.findByText('3-qadam / 8')).toBeTruthy();
    expect(localStorage.getItem('lg_wizard_step')).toBe('2');
    expect(await screen.findByText(t.wizard.done)).toBeTruthy();
    expect(screen.getByText(t.wizard.count.replace('{n}', '1'))).toBeTruthy();
  });

  it('oxirgi qadam: haqiqiy bot havolasi (demo emas); yakunlash — progress tozalanadi', async () => {
    localStorage.setItem('lg_wizard_step', '7');
    fakeApi(['settings.manage'], handler(settings()));
    renderApp('/wizard');
    const link = await screen.findByRole('link', { name: 'https://t.me/legendary_test_bot' });
    expect(link).toBeTruthy();
    expect(screen.queryByText(/inv_demo/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.wizard.finish }));
    await waitFor(() => expect(localStorage.getItem('lg_wizard_step')).toBeNull());
  });

  it('bosh sahifa: kurs yoʻq — Director ustaga yoʻnaltiriladi; Admin — yoʻq', async () => {
    fakeApi(['settings.manage'], handler(settings()));
    renderApp('/');
    fireEvent.click(await screen.findByRole('button', { name: t.wizard.bannerAction }));
    expect(await screen.findByText('1-qadam / 8')).toBeTruthy();
    cleanup();
    fakeApi(['course.manage'], handler(settings()));
    renderApp('/');
    await screen.findByText(t.home.greeting.replace('{name}', 'Bosh Direktor'));
    expect(screen.queryByText(t.wizard.banner)).toBeNull();
  });
});
