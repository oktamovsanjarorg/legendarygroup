import type { TicketDetail, TicketItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const TID = '11111111-1111-4111-8111-111111111111';
const AUTHOR = '22222222-2222-4222-8222-222222222222';
const ticket: TicketItem = {
  id: TID,
  branchId: '33333333-3333-4333-8333-333333333333',
  authorId: AUTHOR,
  authorName: 'Malika Ergasheva',
  authorPhone: '+998901112233',
  studentId: null,
  studentName: 'Jasur',
  subject: 'Dars jadvali',
  status: 'open',
  priority: 'high',
  assignedTo: null,
  assignedToName: null,
  lastMessageAt: '2026-11-15T04:20:00.000Z',
  createdAt: '2026-11-15T04:20:00.000Z',
  updatedAt: '2026-11-15T04:20:00.000Z',
};
const msg = (id: string, authorId: string, authorName: string, text: string) => ({
  id,
  ticketId: TID,
  authorId,
  authorName,
  authorRole: 'author' as const,
  text,
  fileUrl: null,
  createdAt: '2026-11-15T04:20:00.000Z',
});
const detail: TicketDetail = {
  ...ticket,
  messages: [
    msg('44444444-4444-4444-8444-444444444444', AUTHOR, 'Malika Ergasheva', 'Ertaga dars bormi?'),
  ],
};

const handler = (c: Call) => {
  if (c.path.startsWith('/tickets?')) return json(200, { items: [ticket] });
  if (c.path === `/tickets/${TID}` && c.method === 'GET') return json(200, detail);
  if (c.path === `/tickets/${TID}/messages`) return json(201, msg('5', 'u1', 'Admin', 'Ha'));
  if (c.path === `/tickets/${TID}`) return json(200, { ...ticket, status: 'in_progress' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-21 murojaatlar (T-306, FR-RPT-7)', () => {
  it('forbidden: ticket.handle yoʻq — soʻrov ketmaydi', async () => {
    const calls = fakeApi(['ticket.create'], handler);
    renderApp('/tickets');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('roʻyxat → tafsilot; javob va "ishga olish" API’ga ketadi', async () => {
    const calls = fakeApi(['ticket.handle'], handler);
    renderApp('/tickets');
    expect(await screen.findByText('Ertaga dars bormi?')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.tickets.reply.placeholder), {
      target: { value: 'Ha' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.tickets.reply.send }));
    fireEvent.click(screen.getByRole('button', { name: t.tickets.reply.take }));
    await waitFor(() => {
      expect(calls.find((c) => c.path.endsWith('/messages'))?.body).toEqual({ text: 'Ha' });
      expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ status: 'in_progress' });
    });
  });
});
