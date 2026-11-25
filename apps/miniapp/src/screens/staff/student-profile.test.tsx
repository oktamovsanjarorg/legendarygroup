import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  emptyGuardian,
  freezeAction,
  guardianBody,
  guardianReady,
  studentForm,
  studentFormReady,
  updateStudentBody,
} from '../../data/staff-profile.js';
import { StudentAccessView, StudentAttendanceView } from './student-access.js';
import { StudentCardView } from './student-card.js';
import { StudentInfo, StudentLinks } from './student-edit.js';
import { EnrollmentView, EnrollView, FreezeView, TransferView } from './student-enroll.js';
import { GuardianEditView, GuardianNewView } from './student-guardian.js';
import { attendanceItems, enrollment, groupOptions, studentDetail, TODAY } from './student-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const input = (label: string) => screen.getByLabelText(label);
const type = (label: string, value: string) =>
  fireEvent.change(input(label), { target: { value } });
const noop = () => undefined;
const c = t.staffEnroll;

describe('MS-23 maʼlumotlar (T-152, FR-STU-1/2)', () => {
  it('faqat oʻzgargan maydon yuboriladi; telefon E.164; boʻsh — null', () => {
    const f = studentForm(studentDetail);
    expect(updateStudentBody(f, studentDetail)).toBeNull();
    expect(updateStudentBody({ ...f, school: ' ', phone: '90 111 22 33' }, studentDetail)).toEqual({
      school: null,
    });
    expect(studentFormReady({ ...f, phone: '12' }, TODAY)).toBe(false);
    expect(studentFormReady({ ...f, birthDate: '2027-01-01' }, TODAY)).toBe(false);
  });

  it('kartochka: maʼlumot, ichki ekranlar, ota-ona tahriri va qoʻshish', () => {
    const open = vi.fn();
    const fns = { onGuardian: vi.fn(), onAddGuardian: vi.fn(), onEnroll: vi.fn() };
    const hit = { id: 's1', code: 'LG-1', name: 'Karimov Aziz', phone: '', groups: [], debt: 0n };
    wrap(
      <StudentCardView
        s={hit}
        guardians={[
          {
            id: 'g1',
            name: 'Karimova Zuhra',
            relation: 'Onasi',
            phone: '+998901234567',
            telegramLinked: false,
            isPrimary: true,
            notify: false,
          },
        ]}
        manage={{
          m: { groups: [], past: [], canArchive: true, archived: false },
          busy: false,
          onOpen: noop,
          onArchive: noop,
          onRestore: noop,
          ...fns,
        }}
        details={
          <>
            <StudentInfo s={studentDetail} />
            <StudentLinks onFinance={open} />
          </>
        }
      />,
    );
    expect(screen.getByText(t.leads.sources.referral)).toBeTruthy();
    expect(screen.queryByText(t.staffProfile.access)).toBeNull();
    fireEvent.click(button(t.staffProfile.finance));
    expect(open).toHaveBeenCalledOnce();
    fireEvent.click(button(/Karimova Zuhra.*asosiy.*xabar olmaydi/));
    expect(fns.onGuardian).toHaveBeenCalledWith('g1');
    fireEvent.click(button(t.staffProfile.addGuardian));
    fireEvent.click(button(t.staffProfile.addGroup));
    expect(fns.onAddGuardian).toHaveBeenCalledOnce();
    expect(fns.onEnroll).toHaveBeenCalledOnce();
  });

  it('ota-ona: bazada bor — ismi soʻralmaydi; uzish — tasdiq bilan', () => {
    const f = { ...emptyGuardian, phone: '901234567' };
    expect(guardianReady(f, null)).toBe(false);
    expect(guardianReady(f, 'Karimova Zuhra')).toBe(true);
    expect(guardianBody(f, 'Karimova Zuhra')).toMatchObject({
      fullName: 'Karimova Zuhra',
      phone: '+998901234567',
    });
    const found = {
      id: 'g1',
      fullName: 'Karimova Zuhra',
      phone: '+998901234567',
      children: [{ id: 's2', fullName: 'Karimova Lola', code: 7 }],
    };
    wrap(<GuardianNewView form={f} found={found} saving={false} onForm={noop} onSave={noop} />);
    expect(screen.queryByLabelText(t.staffGuardian.name)).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Karimova Lola');
    cleanup();
    const onUnlink = vi.fn();
    const form = { ...f, fullName: 'Karimova Zuhra' };
    wrap(
      <GuardianEditView
        form={form}
        saving={false}
        onForm={noop}
        onSave={noop}
        onUnlink={onUnlink}
      />,
    );
    fireEvent.click(button(t.staffGuardian.unlink));
    expect(onUnlink).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: t.staffGuardian.unlink }),
    );
    expect(onUnlink).toHaveBeenCalledOnce();
  });
});

describe('MS-23 kirish kodi va davomat', () => {
  it('kod bor — yangisi tasdiq bilan; kod yoʻq — darhol', () => {
    const onGenerate = vi.fn();
    const view = (codeSet: boolean, newCode: string | null = null) => (
      <StudentAccessView
        student="A"
        telegramLinked={false}
        codeSet={codeSet}
        newCode={newCode}
        busy={false}
        onGenerate={onGenerate}
        onUnlink={noop}
      />
    );
    wrap(view(true));
    expect(screen.queryByText(t.staffAccess.unlink)).toBeNull();
    fireEvent.click(button(t.staffAccess.regenerate));
    expect(onGenerate).not.toHaveBeenCalled();
    cleanup();
    wrap(view(false, '123456'));
    expect(screen.getByText('123456')).toBeTruthy();
    fireEvent.click(button(t.staffAccess.generate));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it('davomat: kechikish daqiqasi va izoh', () => {
    wrap(
      <StudentAttendanceView
        period="2026-11"
        current="2026-11"
        items={attendanceItems}
        onStep={noop}
      />,
    );
    expect(screen.getByText(/10 daqiqa/)).toBeTruthy();
    expect(screen.getByText(/Qoʻngʻiroq qilindi/)).toBeTruthy();
  });
});

describe('MS-23a aʼzolik (FR-STU-3, BR-9)', () => {
  const view = (over = {}) => {
    const fns = { onFreezeEnd: vi.fn(), onFreezeCancel: vi.fn(), onTransfer: vi.fn() };
    wrap(
      <EnrollmentView
        student="Karimov Aziz"
        e={enrollment}
        today={TODAY}
        canManage
        busy={false}
        onFreeze={noop}
        onLeave={noop}
        {...fns}
        {...over}
      />,
    );
    return fns;
  };

  it('muzlatish: davom etayotgani — tugatish, boshlanmagani — bekor; bugun boshlangani — hech biri', () => {
    const f = enrollment.freezes[0]!;
    expect(freezeAction({ ...f, from: TODAY }, TODAY)).toBeNull();
    expect(freezeAction({ ...f, to: '2026-11-20' }, TODAY)).toBeNull();
    const fns = view();
    fireEvent.click(button(/Kasallik/));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: c.freezeEnd }));
    expect(fns.onFreezeEnd).toHaveBeenCalledWith('f1');
    fireEvent.click(button(/Safar/));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: c.freezeCancel }),
    );
    expect(fns.onFreezeCancel).toHaveBeenCalledWith('f2');
  });

  it('ruxsat yoʻq yoki yakunlangan — amallar yoʻq', () => {
    view({ canManage: false });
    expect(screen.queryByText(c.transfer)).toBeNull();
    cleanup();
    view({ e: { ...enrollment, endReason: 'left', state: 'ended' } });
    expect(screen.queryByText(c.leave)).toBeNull();
  });

  it('guruhga yozish va koʻchirish: guruh va sana shart', () => {
    const onEnroll = vi.fn();
    let wa = wrap(
      <EnrollView
        student="A"
        today={TODAY}
        groups={groupOptions}
        saving={false}
        onSave={onEnroll}
      />,
    );
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.click(button(/IELTS-2/));
    act(() => wa.MainButton.click());
    expect(onEnroll).toHaveBeenCalledWith({ groupId: 'g2', startDate: TODAY });
    cleanup();
    const onMove = vi.fn();
    wa = wrap(
      <TransferView
        student="A"
        fromGroup="IELTS-1"
        minDate={TODAY}
        today={TODAY}
        groups={groupOptions}
        saving={false}
        onSave={onMove}
      />,
    );
    fireEvent.click(button(/Matematika 7/));
    // Aʼzolik boshlangan kunning oʻzida koʻchirib boʻlmaydi (eski guruhda kun qolmaydi).
    expect(wa.MainButton.params.is_active).toBe(false);
    type(c.transferDate, '2026-12-01');
    act(() => wa.MainButton.click());
    expect(onMove).toHaveBeenCalledWith({ toGroupId: 'g3', date: '2026-12-01', note: null });
  });

  it('muzlatish: tugash va sabab shart', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <FreezeView
        student="A"
        group="G"
        minDate="2026-09-01"
        today={TODAY}
        saving={false}
        onSave={onSave}
      />,
    );
    type(c.freezeTo, '2026-11-20');
    type(c.freezeReason, 'Kasallik');
    expect(wa.MainButton.params.is_active).toBe(false);
    type(c.freezeTo, '2026-12-10');
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith({ from: TODAY, to: '2026-12-10', reason: 'Kasallik' });
  });
});
