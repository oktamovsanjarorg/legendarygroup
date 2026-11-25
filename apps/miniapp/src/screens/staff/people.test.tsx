import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { permissionRows, toggleCall, updateBody } from '../../data/staff-people.js';
import { PersonFormView, PersonView } from './people.js';
import { admin, teacher } from './people-mock.js';
import { PermissionsView } from './people-permissions.js';

const c = t.staffPeople;
afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const noop = () => undefined;
const card = {
  own: false,
  canPermissions: true,
  groups: ['MATH-01'],
  busy: false,
  onEdit: noop,
  onPermissions: noop,
};

describe('MS-31 ruxsatlar (02 §4)', () => {
  it('ota-ona ruxsatlari xodim roʻyxatiga aralashmaydi; delegatsiya — faqat Adminda', () => {
    const rows = permissionRows(teacher).map((r) => r.permission);
    expect(rows).toContain('grade.write');
    expect(rows).not.toContain('ticket.create');
    expect(rows).not.toContain('finance.view');
    expect(permissionRows(admin).find((r) => r.permission === 'finance.view')).toEqual({
      permission: 'finance.view',
      inRole: false,
      effective: true,
    });
  });

  it('almashtirish: standartdan — PUT, oʻzgarganidan — DELETE (standartga)', () => {
    const on = { permission: 'cash.close', inRole: true, effective: true } as const;
    expect(toggleCall('u', on)).toMatchObject({ method: 'PUT', body: { granted: false } });
    expect(toggleCall('u', { ...on, effective: false })).toMatchObject({ method: 'DELETE' });
    const extra = { permission: 'finance.view', inRole: false, effective: false } as const;
    expect(toggleCall('u', extra)).toMatchObject({ method: 'PUT', body: { granted: true } });
  });

  it('ekranda holat koʻrinadi va bosilsa almashadi', () => {
    const onToggle = vi.fn();
    wrap(<PermissionsView person={admin} busy={false} onToggle={onToggle} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t.permissions['finance.view']) }),
    );
    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ permission: 'finance.view', effective: true }),
    );
  });
});

describe('MS-31 kartochka (T-160)', () => {
  it('bloklash — tasdiq bilan, guruhlari haqida ogohlantirish', () => {
    const onAction = vi.fn();
    wrap(<PersonView {...card} person={teacher} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: c.block }));
    expect(onAction).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('MATH-01');
    fireEvent.click([...dialog.querySelectorAll('button')].find((b) => b.textContent === c.block)!);
    expect(onAction).toHaveBeenCalledWith({ kind: 'block' });
  });

  it('oʻzi: bloklash, ruxsat va Direktor rolini olish yoʻq', () => {
    wrap(
      <PersonView
        {...card}
        own
        person={{ ...admin, roles: ['director'], overrides: [] }}
        onAction={noop}
      />,
    );
    for (const name of [c.block, c.removeRole.replace('{role}', t.roles.director)])
      expect(screen.queryByRole('button', { name })).toBeNull();
    expect(screen.queryByText(c.permissions)).toBeNull();
  });

  it('ota-ona roli bu yerdan olinmaydi; Telegram ulanmagan — bot havolasi', () => {
    wrap(<PersonView {...card} person={teacher} onAction={noop} />);
    expect(screen.queryByText(c.removeRole.replace('{role}', t.roles.guardian))).toBeNull();
    expect(screen.getByText(teacher.botUrl!)).toBeDefined();
  });

  it('forma: raqam toʻliq boʻlmaguncha saqlanmaydi; faqat oʻzgargan maydon yuboriladi', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <PersonFormView
        form={{ fullName: 'Ali Vali', phone: '+998' }}
        role="teacher"
        own={false}
        saving={false}
        onForm={noop}
        onRole={noop}
        onSave={onSave}
      />,
    );
    act(() => wa.MainButton.click());
    expect(onSave).not.toHaveBeenCalled();
    expect(updateBody({ fullName: teacher.fullName, phone: '90 123 45 67' }, teacher)).toBeNull();
    expect(updateBody({ fullName: ' Yangi ', phone: teacher.phone }, teacher)).toEqual({
      fullName: 'Yangi',
    });
  });
});
