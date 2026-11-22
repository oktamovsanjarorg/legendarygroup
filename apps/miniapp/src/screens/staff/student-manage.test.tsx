import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudentManage } from '../../data/staff-student.js';
import { LeaveView } from './leave.js';
import { StudentCardView } from './student-card.js';

afterEach(cleanup);
const wrap = (ui: ReactNode, wa: FakeWebApp = createFakeWebApp()) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
const c = t.studentCard;
const S = {
  id: 's1',
  code: 'LG-1',
  name: 'Karimov Aziz',
  phone: '',
  groups: ['IELTS-1'],
  debt: 0n,
};

const card = (m: StudentManage, over = {}) => {
  const fns = { onLeave: vi.fn(), onArchive: vi.fn(), onRestore: vi.fn() };
  wrap(<StudentCardView s={S} guardians={[]} manage={{ m, busy: false, ...fns, ...over }} />);
  return fns;
};

describe('MS-05 boshqaruv: guruhdan chiqarish va arxiv (T-144, FR-STU-6, Q-93)', () => {
  it('guruhda — guruh bosilsa chiqarish ochiladi; arxivlash bloklangan, izoh bor', () => {
    const fns = card({
      groups: [{ enrollmentId: 'e1', name: 'IELTS-1', startDate: '2026-09-01' }],
      canArchive: false,
      archived: false,
    });
    fireEvent.click(screen.getByText('IELTS-1'));
    expect(fns.onLeave).toHaveBeenCalledWith('e1');
    expect(screen.getByText(c.archiveBlocked)).toBeTruthy();
    fireEvent.click(screen.getByText(c.archive));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('guruhsiz — «Arxivlash» → tasdiq oynasi → bir marta arxivlaydi', () => {
    const fns = card({ groups: [], canArchive: true, archived: false });
    fireEvent.click(screen.getByText(c.archive));
    const dialog = screen.getByRole('dialog', { name: c.archiveTitle });
    expect(dialog.textContent).toContain(c.archiveText);
    fireEvent.click(screen.getAllByText(c.archive).at(-1) as HTMLElement);
    expect(fns.onArchive).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('arxivda — belgisi va «Arxivdan chiqarish»', () => {
    const fns = card({ groups: [], canArchive: true, archived: true });
    expect(screen.getByText(c.archived)).toBeTruthy();
    fireEvent.click(screen.getByText(c.restore));
    expect(fns.onRestore).toHaveBeenCalledOnce();
  });

  it('ruxsat yoʻq (manage yoʻq) — arxiv amallari koʻrinmaydi', () => {
    wrap(<StudentCardView s={S} guardians={[]} />);
    expect(screen.queryByText(c.archive)).toBeNull();
    expect(screen.getByText('IELTS-1')).toBeTruthy();
  });
});

describe('MS-05a guruhdan chiqarish', () => {
  const base = { endDate: '2026-11-22', reason: 'left' as const, note: null };
  it('MainButton — sana toʻgʻri boʻlsa; sabab tanlanadi', () => {
    const wa = createFakeWebApp();
    const onChange = vi.fn();
    const onSave = vi.fn();
    wrap(
      <LeaveView
        student="Karimov Aziz"
        group="IELTS-1"
        minDate="2026-09-01"
        value={base}
        saving={false}
        onChange={onChange}
        onSave={onSave}
      />,
      wa,
    );
    expect(wa.MainButton.params).toMatchObject({ is_visible: true, text: t.staffLeave.save });
    wa.MainButton.click();
    expect(onSave).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('radio', { name: t.staffLeave.reasons.finished }));
    expect(onChange).toHaveBeenCalledWith({ ...base, reason: 'finished' });
  });

  it('boshlanishdan oldingi sana — MainButton yashirin', () => {
    const wa = createFakeWebApp();
    wrap(
      <LeaveView
        student="A"
        group="G"
        minDate="2026-09-01"
        value={{ ...base, endDate: '2026-08-31' }}
        saving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
      wa,
    );
    expect(wa.MainButton.params.is_visible).toBe(false);
  });
});
