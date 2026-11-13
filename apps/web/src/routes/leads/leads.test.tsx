import type { LeadDto } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { convertBody } from './convert-form.js';

const GROUP = '0190a000-0000-7000-8000-0000000000d1';
const STUDENT = '0190a000-0000-7000-8000-0000000000e1';
const lead = (over: Partial<LeadDto>): LeadDto => ({
  id: 'd1',
  fullName: 'Rustamov Anvar',
  phone: '+998901112233',
  course: { id: 'c1', name: 'Ingliz tili' },
  source: 'instagram',
  status: 'new',
  assignedTo: null,
  notes: null,
  lostReason: null,
  trial: null,
  studentId: null,
  statusChangedAt: '2026-11-10T05:00:00Z',
  createdAt: '2026-11-10T05:00:00Z',
  ...over,
});
const onTrial = lead({
  id: 'd2',
  fullName: 'Qosimova Feruza',
  status: 'trial',
  trial: {
    lessonId: 'l1',
    date: '2026-11-16',
    startTime: '15:00',
    group: { id: GROUP, name: 'IELTS — B2' },
  },
});
const funnel = { total: 2, contacted: 1, trial: 1, won: 1, lost: 0, conversionPercent: 50 };
const stats = {
  from: '2026-11-01',
  to: '2026-11-13',
  total: funnel,
  bySource: [{ ...funnel, source: 'instagram' }],
};

const handler = (c: Call) => {
  if (c.method === 'GET') {
    if (c.path.startsWith('/leads/stats')) return json(200, stats);
    if (c.path.startsWith('/leads')) return json(200, [lead({}), onTrial]);
    if (c.path.startsWith('/students/')) return undefined;
    if (c.path === '/groups?status=current') return json(200, [{ id: GROUP, name: 'IELTS — B2' }]);
    return json(200, []);
  }
  if (c.path === '/leads')
    return json(409, {
      code: 'LEAD_EXISTS',
      message: 'Bu raqamli ochiq lid bor.',
      details: { leadId: 'd2' },
    });
  if (c.path.endsWith('/convert'))
    return json(200, { ...onTrial, status: 'won', studentId: STUDENT });
  return json(200, lead({}));
};
const FULL = ['lead.manage', 'group.view', 'student.view'] as const;
const d = t.leads.detail;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-08 Lidlar (T-107)', () => {
  it("lead.manage yo'q — ruxsat yo'q holati, API chaqirilmaydi", async () => {
    const calls = fakeApi(['student.view'], handler);
    renderApp('/leads');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('kanban: lid oʻz ustunida; oy statistikasi — jami va konversiya (vergulli)', async () => {
    fakeApi(FULL, handler);
    renderApp('/leads');
    const column = await screen.findByRole('region', { name: t.leads.stages.trial });
    expect(await within(column).findByText('Qosimova Feruza')).toBeTruthy();
    expect(within(column).queryByText('Rustamov Anvar')).toBeNull();
    expect(await screen.findByText(t.leads.stats.total.replace('{n}', '2'))).toBeTruthy();
    expect(screen.getByText(t.leads.stats.conversion.replace('{p}', '50'))).toBeTruthy();
  });

  it('FR-STU-4: rad etish — sabab majburiy; faqat ruxsat etilgan oʻtishlar', async () => {
    const calls = fakeApi(FULL, handler);
    renderApp('/leads');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Rustamov Anvar' }));
    expect(screen.queryByRole('button', { name: d.to.new })).toBeNull();
    await user.click(screen.getByRole('button', { name: d.to.lost }));
    await user.click(screen.getByRole('button', { name: d.lostSubmit }));
    expect(screen.getByText(d.reasonRequired)).toBeTruthy();
    await user.type(screen.getByLabelText(d.lostReason), 'Narx qimmat');
    await user.click(screen.getByRole('button', { name: d.lostSubmit }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: '/leads/d1/status',
        body: { status: 'lost', lostReason: 'Narx qimmat' },
      }),
    );
  });

  it('takroriy telefon — LEAD_EXISTS: mavjud lidni ochish taklif qilinadi', async () => {
    fakeApi(FULL, handler);
    renderApp('/leads');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: t.common.add }));
    await user.type(screen.getByLabelText(t.leads.form.fullName), 'Yangi Lid');
    await user.type(screen.getByLabelText(t.leads.form.phone), '901112234');
    await user.click(screen.getByRole('button', { name: t.leads.form.create }));
    await user.click(await screen.findByRole('button', { name: t.leads.form.openExisting }));
    expect(await screen.findByRole('dialog', { name: 'Qosimova Feruza' })).toBeTruthy();
  });

  it('sinovdagi lid → oʻquvchi: sinov guruhi tanlangan; kartochkaga oʻtadi', async () => {
    const calls = fakeApi(FULL, handler);
    const router = renderApp('/leads');
    const user = userEvent.setup();
    const column = await screen.findByRole('region', { name: t.leads.stages.trial });
    await user.click(await within(column).findByRole('button', { name: t.leads.convert }));
    const dialog = await screen.findByRole('dialog', { name: 'Qosimova Feruza' });
    await user.click(
      within(dialog).getAllByRole('button', { name: t.leads.convert }).at(-1) as HTMLElement,
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`/students/${STUDENT}`));
    expect(calls.find((c) => c.path === '/leads/d2/convert')?.body).toMatchObject({
      student: { fullName: 'Qosimova Feruza', guardians: [], allowDuplicate: false },
      enroll: { groupId: GROUP },
    });
  });
});

describe('convertBody (API bilan bitta Zod sxema)', () => {
  const base = {
    fullName: 'Ali Valiyev',
    birthDate: '',
    guardian: { fullName: '', phone: '+998', relation: 'mother' as const },
    groupId: '',
    startDate: '2026-11-13',
  };
  it("guruhsiz — enroll null; to'ldirilmagan ota-ona yuborilmaydi", () => {
    const r = convertBody(base, false);
    expect(r.ok && r.body).toMatchObject({ enroll: null, student: { guardians: [] } });
  });
  it("xatolar maydon bo'yicha: o'quvchi ismi va ota-ona telefoni alohida", () => {
    const r = convertBody(
      { ...base, fullName: 'A', guardian: { ...base.guardian, fullName: 'Vali Ota', phone: '12' } },
      false,
    );
    expect(Object.keys(r.ok ? {} : r.errors).sort()).toEqual(['fullName', 'guardianPhone']);
  });
});
