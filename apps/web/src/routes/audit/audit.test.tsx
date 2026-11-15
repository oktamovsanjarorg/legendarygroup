import type { AuditLogItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { actionOf, moduleOf, toLog } from './index.js';

const log = {
  id: '0190a000-0000-7000-8000-0000000000a1',
  timestamp: '2026-11-15T05:00:00Z',
  actorId: null,
  userName: 'Admin Ali',
  userRole: 'admin',
  action: 'payment.create',
  entity: 'payment',
  entityId: 'p1',
  target: 'Toʻlov LG-2026-000001',
  ip: null,
  userAgent: null,
  diff: [{ field: 'amount', before: null, after: '650000' }],
} as AuditLogItem;
const handler = (c: Call) => {
  if (c.path.startsWith('/audit/logs')) return json(200, [log]);
  if (c.path === '/audit/suspicious') return json(200, []);
  if (c.path === '/audit/staff-activity') return json(200, []);
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-30 Audit (T-404, FR-AUD-1)', () => {
  it('amal va boʻlim tasnifi; diff qiymatlari matnga', () => {
    expect(actionOf('payment.create')).toBe('create');
    expect(actionOf('billing.discount.set')).toBe('update');
    expect(actionOf('payment.reverse')).toBe('delete');
    expect(actionOf('auth.login')).toBe('login');
    expect(actionOf('x.ping')).toBe('other');
    expect(moduleOf('enrollment')).toBe('students');
    expect(moduleOf('attendance')).toBe('attendance');
    expect(moduleOf('user')).toBe('system');
    expect(toLog(log)).toMatchObject({ module: 'finance', userRole: t.roles.admin, ip: '' });
    expect(toLog(log).diff?.[0]).toEqual({ field: 'amount', before: '—', after: '650000' });
  });

  it('audit.view yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['finance.view'], handler);
    renderApp('/audit');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('jurnal real maʼlumotdan koʻrinadi', async () => {
    fakeApi(['audit.view'], handler);
    renderApp('/audit');
    expect(await screen.findByText('Toʻlov LG-2026-000001')).toBeTruthy();
    expect(screen.getByText(t.audit.modules.finance)).toBeTruthy();
  });
});
