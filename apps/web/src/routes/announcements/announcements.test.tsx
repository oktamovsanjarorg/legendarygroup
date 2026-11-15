import type { AnnouncementItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const a = t.announcements;
const GROUP = '11111111-1111-4111-8111-111111111111';
const ann: AnnouncementItem = {
  id: '22222222-2222-4222-8222-222222222222',
  branchId: '33333333-3333-4333-8333-333333333333',
  authorId: '44444444-4444-4444-8444-444444444444',
  authorName: 'Admin',
  title: 'Ertaga ochiq dars',
  body: 'Soat 15:00 da ochiq dars.',
  targetType: 'group',
  targetId: GROUP,
  fileUrl: null,
  fileType: null,
  status: 'completed',
  totalRecipients: 14,
  sentCount: 12,
  failedCount: 1,
  blockedCount: 1,
  sentAt: '2026-11-14T13:00:00.000Z',
  createdAt: '2026-11-14T13:00:00.000Z',
};

const handler = (c: Call) => {
  if (c.path.startsWith('/announcements?')) return json(200, { items: [ann] });
  if (c.path.startsWith('/announcements/preview'))
    return json(200, {
      targetType: 'group',
      targetId: GROUP,
      recipientCount: 7,
      sampleRecipients: [],
    });
  if (c.path === '/announcements') return json(201, ann);
  if (c.path.startsWith('/groups')) return json(200, [{ id: GROUP, name: 'MAT-1' }]);
  if (c.path.startsWith('/courses')) return json(200, []);
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-20 eʼlonlar (T-305, FR-RPT-5)', () => {
  it('forbidden: announcement.send yoʻq — soʻrov ketmaydi', async () => {
    const calls = fakeApi(['student.view'], handler);
    renderApp('/announcements');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('roʻyxat: guruh nomi, server yigʻindilari', async () => {
    fakeApi(['announcement.send'], handler);
    renderApp('/announcements');
    expect(await screen.findByText('Ertaga ochiq dars')).toBeTruthy();
    expect(await screen.findByText('MAT-1')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('forma: guruh tanlanmasa yuborilmaydi; tanlansa — preview soni va POST', async () => {
    const calls = fakeApi(['announcement.send'], handler);
    renderApp('/announcements');
    fireEvent.click(await screen.findByRole('button', { name: a.new }));
    fireEvent.change(screen.getByLabelText(a.audience), { target: { value: 'group' } });
    fireEvent.change(screen.getByLabelText(a.form.titleLabel), { target: { value: 'Ochiq dars' } });
    fireEvent.change(screen.getByLabelText(a.form.bodyLabel), {
      target: { value: 'Ertaga 15:00 da.' },
    });
    fireEvent.click(screen.getByRole('button', { name: a.form.send }));
    expect(await screen.findByText(a.form.targetRequired)).toBeTruthy();
    expect(calls.some((c) => c.path === '/announcements' && c.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText(a.form.groupLabel), { target: { value: GROUP } });
    expect(await screen.findByText(a.form.recipients.replace('{n}', '7'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: a.form.send }));
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/announcements' && c.method === 'POST')?.body).toEqual({
        title: 'Ochiq dars',
        body: 'Ertaga 15:00 da.',
        targetType: 'group',
        targetId: GROUP,
        sendNow: true,
      }),
    );
    expect(await screen.findByText(a.form.sent)).toBeTruthy();
  });
});
