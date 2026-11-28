import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  const fns = { onOpen: vi.fn(), onEnroll: vi.fn(), onArchive: vi.fn(), onRestore: vi.fn() };
  wrap(<StudentCardView s={S} guardians={[]} manage={{ m, busy: false, ...fns, ...over }} />);
  return fns;
};

describe('MS-05 boshqaruv: guruhdan chiqarish va arxiv (T-144, FR-STU-6, Q-93)', () => {
  it('guruhda — guruh bosilsa aʼzolik ekrani ochiladi; arxivlash bloklangan, izoh bor', () => {
    const fns = card({
      groups: [{ enrollmentId: 'e1', name: 'IELTS-1', text: '01.09.2026 dan' }],
      past: [],
      canArchive: false,
      archived: false,
    });
    fireEvent.click(screen.getByText('IELTS-1'));
    expect(fns.onOpen).toHaveBeenCalledWith('e1');
    expect(screen.getByText(c.archiveBlocked)).toBeTruthy();
    fireEvent.click(screen.getByText(c.archive));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('guruhsiz — «Arxivlash» → tasdiq oynasi → bir marta arxivlaydi', () => {
    const fns = card({ groups: [], past: [], canArchive: true, archived: false });
    fireEvent.click(screen.getByText(c.archive));
    const dialog = screen.getByRole('dialog', { name: c.archiveTitle });
    expect(dialog.textContent).toContain(c.archiveText);
    fireEvent.click(screen.getAllByText(c.archive).at(-1) as HTMLElement);
    expect(fns.onArchive).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('arxivda — belgisi va «Arxivdan chiqarish»', () => {
    const fns = card({ groups: [], past: [], canArchive: true, archived: true });
    expect(screen.getByText(c.archived)).toBeTruthy();
    fireEvent.click(screen.getByText(c.restore));
    expect(fns.onRestore).toHaveBeenCalledOnce();
  });

  it('arxivda, «student.delete» yoʻq — «Butunlay oʻchirish» koʻrinmaydi (Q-124)', () => {
    card({ groups: [], past: [], canArchive: true, archived: true });
    expect(screen.queryByText(c.delete)).toBeNull();
  });

  it('arxivda, Director — «Butunlay oʻchirish» → ogohlantirish → bir marta oʻchiradi (Q-124)', () => {
    const onDelete = vi.fn();
    card({ groups: [], past: [], canArchive: true, archived: true }, { onDelete });
    fireEvent.click(screen.getByText(c.delete));
    const dialog = screen.getByRole('dialog', { name: c.deleteTitle });
    expect(dialog.textContent).toContain(c.deleteText);
    fireEvent.click(within(dialog).getByText(c.deleteConfirm));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('faol oʻquvchida «Butunlay oʻchirish» yoʻq — avval arxivlanadi', () => {
    card({ groups: [], past: [], canArchive: true, archived: false }, { onDelete: vi.fn() });
    expect(screen.queryByText(c.delete)).toBeNull();
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
    const onRemove = vi.fn();
    wrap(
      <LeaveView
        student="Karimov Aziz"
        group="IELTS-1"
        minDate="2026-09-01"
        value={base}
        saving={false}
        onChange={onChange}
        onSave={onSave}
        onRemove={onRemove}
      />,
      wa,
    );
    expect(wa.MainButton.params).toMatchObject({ is_visible: true, text: t.staffLeave.save });
    wa.MainButton.click();
    expect(onSave).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('radio', { name: t.staffLeave.reasons.finished }));
    expect(onChange).toHaveBeenCalledWith({ ...base, reason: 'finished' });
    // Q-96: xato kiritilgan — tasdiq (ActionSheet) bilan butunlay olib tashlash.
    fireEvent.click(screen.getByRole('button', { name: t.staffLeave.remove }));
    expect(onRemove).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: t.staffLeave.removeTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: t.staffLeave.remove }));
    expect(onRemove).toHaveBeenCalledOnce();
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
        onRemove={vi.fn()}
      />,
      wa,
    );
    expect(wa.MainButton.params.is_visible).toBe(false);
  });
});
