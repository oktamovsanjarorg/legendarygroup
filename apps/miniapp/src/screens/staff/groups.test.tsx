import { miniappMessages as t } from '@lg/i18n';
import { ApiError } from '@lg/ui-core';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  conflictText,
  emptyGroup,
  groupForm,
  groupReady,
  matches,
  scheduleText,
  updateGroupBody,
} from '../../data/staff-groups.js';
import { GroupScheduleView, GroupTeacherView } from './group-forms.js';
import { GroupsView, GroupView } from './groups.js';
import { group, groupItem, roster } from './org-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const noop = () => undefined;
const c = t.staffGroups;

describe('MS-12/MS-20 Guruhlar (T-136, T-149)', () => {
  it('jadval matni: bir vaqtdagi kunlar birga; qidiruv apostrofga qaramaydi', () => {
    expect(scheduleText(group.slots)).toBe('Du, Ch, Ju 15:00–16:30');
    expect(matches({ ...groupItem, name: 'Oʻquv' }, "o'quv")).toBe(true);
    expect(matches(groupItem, 'karim')).toBe(true);
    expect(matches(groupItem, 'zzz')).toBe(false);
  });

  it('forma: kurs, narx, sigʻim shart; tahrirda faqat oʻzgargani yuboriladi', () => {
    expect(groupReady(emptyGroup('2026-11-24'))).toBe(false);
    const f = groupForm(group);
    expect(groupReady(f)).toBe(true);
    expect(groupReady({ ...f, maxStudents: '0' })).toBe(false);
    expect(groupReady({ ...f, endDate: '2026-08-01' })).toBe(false);
    expect(updateGroupBody(f, group)).toBeNull();
    expect(updateGroupBody({ ...f, price: 700_000n }, group)).toEqual({ monthlyPrice: '700000' });
  });

  it('jadval toʻqnashuvi — qaysi guruh bilan', () => {
    const e = new ApiError(409, 'SCHEDULE_CONFLICT', '', 'r1', {
      conflicts: [
        {
          kind: 'room',
          resourceId: 'r1',
          groupId: 'g2',
          groupName: 'Matematika 7',
          weekday: 3,
          startTime: '15:00',
          endTime: '16:30',
        },
      ],
    });
    expect(conflictText(e)).toBe('Xona band: Matematika 7 — Ch 15:00–16:30');
    expect(conflictText(new Error('x'))).toBeNull();
  });

  it('roʻyxat: toʻlganlik; yangi guruh — faqat ruxsat bilan', () => {
    const view = (canManage: boolean) => (
      <GroupsView
        items={[groupItem]}
        counts={{ g1: 9 }}
        filter="current"
        query=""
        canManage={canManage}
        onFilter={noop}
        onQuery={noop}
        onOpen={noop}
        onAdd={noop}
      />
    );
    expect(wrap(view(false)).MainButton.params.is_visible).toBe(false);
    expect(screen.getByText('9/12')).toBeTruthy();
    cleanup();
    expect(wrap(view(true)).MainButton.params.is_visible).toBe(true);
  });

  const groupView = (over: object) => (
    <GroupView
      group={group}
      today="2026-11-24"
      roster={roster}
      lessons={[]}
      canManage
      canEditPast
      busy={false}
      onEdit={noop}
      onSchedule={noop}
      onTeacher={noop}
      onEndTeacher={noop}
      onStatus={noop}
      onStudent={noop}
      onLesson={noop}
      onAttendance={noop}
      {...over}
    />
  );

  it('yakunlash — oqibati bilan tasdiqlanadi (Q-102)', () => {
    const onStatus = vi.fn();
    wrap(groupView({ onStatus }));
    fireEvent.click(button(c.to.finished));
    expect(onStatus).not.toHaveBeenCalled();
    expect(screen.getByText(c.ask.finished)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: c.to.finished }).at(-1)!);
    expect(onStatus).toHaveBeenCalledWith('finished');
  });

  it('yordamchi ustoz chiqariladi; ruxsatsiz amallar yoʻq', () => {
    const onEndTeacher = vi.fn();
    wrap(groupView({ onEndTeacher }));
    fireEvent.click(button(/Sodiqova Lola/));
    fireEvent.click(button(c.endAssistant));
    expect(onEndTeacher).toHaveBeenCalledWith('a2');
    cleanup();
    wrap(groupView({ canManage: false }));
    expect(screen.queryByText(c.actions)).toBeNull();
  });

  it('MS-25: testlar havolasi faqat ruxsat (onTests) boʻlsa', () => {
    const onTests = vi.fn();
    wrap(groupView({ onTests }));
    fireEvent.click(button(c.tests));
    expect(onTests).toHaveBeenCalled();
    cleanup();
    wrap(groupView({}));
    expect(screen.queryByText(c.tests)).toBeNull();
  });

  it('jadval: kun + vaqt qoʻshiladi, tugash kurs davomiyligidan', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <GroupScheduleView
        initial={[]}
        from="2026-11-24"
        durationMin={90}
        saving={false}
        onSave={onSave}
      />,
    );
    fireEvent.click(button('Du'));
    fireEvent.click(button('Ch'));
    fireEvent.change(screen.getByLabelText(c.start), { target: { value: '15:00' } });
    fireEvent.click(button(c.addSlot));
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith('2026-11-24', [
      { weekday: 1, startTime: '15:00', endTime: '16:30' },
      { weekday: 3, startTime: '15:00', endTime: '16:30' },
    ]);
  });

  it('ustoz biriktirish: ustoz tanlanmasa yopiq', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <GroupTeacherView
        teachers={[{ id: 't1', name: 'Karimov Anvar' }]}
        from="2026-11-24"
        saving={false}
        onSave={onSave}
      />,
    );
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.click(button('Karimov Anvar'));
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith({ teacherId: 't1', role: 'main', from: '2026-11-24' });
  });
});
