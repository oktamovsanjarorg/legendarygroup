import type { UndeliveredNotificationItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { toItem } from './index.js';

const f = t.failedMessages;
const item = (over: Partial<UndeliveredNotificationItem>): UndeliveredNotificationItem => ({
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  userName: 'Kamola Saidova',
  recipient: '987654321',
  type: 'billing_reminder',
  status: 'failed',
  failedReason: 'Telegram 400',
  attempts: 8,
  createdAt: '2026-11-15T06:00:00.000Z',
  ...over,
});
const blocked = item({
  id: 'b1',
  userName: 'Bloklagan',
  status: 'blocked',
  failedReason: 'TelegramChatBlocked',
});
const notLinked = item({
  id: 'n1',
  userName: 'Ulanmagan',
  failedReason: 'NO_TELEGRAM',
  attempts: 0,
});

const handler = (c: Call) => {
  if (c.path === '/notifications/undelivered') return json(200, [blocked, notLinked]);
  if (c.path.endsWith('/retry')) return json(201, { success: true });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-22 yetib bormagan xabarlar (T-109, FR-RPT-6)', () => {
  it('sabab: blocked / NO_TELEGRAM / xato matni', () => {
    expect(toItem(blocked).reason).toBe('blocked');
    expect(toItem(notLinked).reason).toBe('notLinked');
    expect(toItem(item({})).detail).toBe('Telegram 400');
  });

  it('forbidden: settings.manage yoʻq — soʻrov ketmaydi', async () => {
    const calls = fakeApi(['student.manage'], handler);
    renderApp('/failed-messages');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('Telegram yoʻqqa qayta yuborish yoʻq; "barchasi" — faqat yuborsa boʻladiganlar', async () => {
    const calls = fakeApi(['settings.manage'], handler);
    renderApp('/failed-messages');
    expect(await screen.findByText('Ulanmagan')).toBeTruthy();
    expect(screen.getByText(f.notLinkedHint)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: f.actions.retry })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: f.actions.retryAll }));
    expect(await screen.findByText(f.retried.replace('{n}', '1'))).toBeTruthy();
    await waitFor(() =>
      expect(calls.filter((c) => c.path.endsWith('/retry')).map((c) => c.path)).toEqual([
        '/notifications/undelivered/b1/retry',
      ]),
    );
  });
});
