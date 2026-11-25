import { ROLE_PERMISSIONS } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { helpFor } from '../../data/staff-help.js';
import { HelpView, SessionsView } from './help.js';

afterEach(cleanup);
const ids = (role: 'admin' | 'director', q = '') =>
  helpFor(ROLE_PERMISSIONS[role], q).flatMap((s) => s.items.map((i) => i.id));

describe('MS-34 Yordam (T-163)', () => {
  it('ruxsatga qarab: Adminda oylik, sozlama, xodim savollari yoʻq', () => {
    expect(ids('director')).toEqual(expect.arrayContaining(['oylik', 'sozlama', 'xodim']));
    for (const id of ['oylik', 'sozlama', 'xodim', 'moliya'])
      expect(ids('admin')).not.toContain(id);
  });

  it("qidiruv ikki yozuvda bir xil (o' va oʻ); topilmasa — boʻsh", () => {
    expect(ids('director', "to'lov")).toEqual(ids('director', 'toʻlov'));
    expect(ids('director', "to'lov").length).toBeGreaterThan(0);
    expect(ids('director', 'xyzxyz')).toEqual([]);
  });

  it('tashqi saytga yoʻl koʻrsatilmaydi (Q-99)', () => {
    const text = JSON.stringify(t.staffHelp.sections);
    expect(text).not.toMatch(/https?:|web panel|boshqaruv panel/i);
  });

  it('savol bosilsa qadamlar ochiladi, yana bosilsa yopiladi', () => {
    render(<HelpView permissions={ROLE_PERMISSIONS.admin} />);
    const q = screen.getByRole('button', { name: /Kassani qanday/ });
    fireEvent.click(q);
    expect(screen.getByText(/sanalgan naqdni kiriting/)).toBeDefined();
    fireEvent.click(q);
    expect(screen.queryByText(/sanalgan naqdni kiriting/)).toBeNull();
  });

  it('sessiyani yopish — tasdiq bilan', () => {
    const onEnd = vi.fn();
    const item = { id: '1', device: 'Chrome', ip: null, createdAt: '2026-11-20T05:00:00Z' };
    render(<SessionsView items={[{ ...item, current: false }]} busy={false} onEnd={onEnd} />);
    fireEvent.click(screen.getByRole('button', { name: /Chrome/ }));
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.staffSessions.end }));
    expect(onEnd).toHaveBeenCalledWith('1');
  });
});
