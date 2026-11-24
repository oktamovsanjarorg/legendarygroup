import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markState, perLesson, perStudent } from '../../data/staff-attendance.js';
import { lessonActions, whenReady } from '../../data/staff-calendar.js';
import { courseForm, courseReady, parseLevels } from '../../data/staff-catalog.js';
import { AttendanceView } from '../teacher/attendance.js';
import { LESSON, ROSTER } from '../teacher/mock.js';
import { AttendanceDayView } from './attendance.js';
import { LessonView } from './calendar.js';
import { HolidaysView } from './holidays.js';
import { lesson } from './lists-mock.js';
import { LessonCancelView, LessonReplaceView } from './lesson-forms.js';
import { cancelledLesson, course, day, oldUnmarked } from './org-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const noop = () => undefined;
const c = t.staffCalendar;

describe('MS-22 Darslar kalendari (T-151, BR-5)', () => {
  it('amallar holatga qarab: yopilgan oy darsi bekor/qoplanmaydi, oʻtgan dars koʻchmaydi', () => {
    const can = (l: typeof lesson, today: string) => lessonActions(l, today);
    expect(can(lesson, '2026-11-24')).toMatchObject({ cancel: true, move: true, makeup: false });
    expect(can(lesson, '2026-12-01')).toMatchObject({ cancel: false, move: false });
    expect(can({ ...lesson, status: 'done' }, '2026-11-26')).toMatchObject({
      cancel: true,
      move: false,
      attendance: true,
    });
    expect(can(cancelledLesson, '2026-11-24')).toMatchObject({ restore: true, makeup: true });
    expect(can({ ...cancelledLesson, cancelSource: 'holiday' }, '2026-11-24').restore).toBe(false);
  });

  it('vaqt: oʻtmas, kamida 15 daqiqa', () => {
    const w = { date: '2026-11-25', startTime: '10:00', endTime: '11:00' };
    expect(whenReady(w, '2026-11-24')).toBe(true);
    expect(whenReady({ ...w, endTime: '10:10' }, '2026-11-24')).toBe(false);
    expect(whenReady({ ...w, date: '2026-11-23' }, '2026-11-24')).toBe(false);
  });

  it('kartochka: kelajak darsda davomat tugmasi yoʻq; qaytarish tasdiq bilan', () => {
    const onRestore = vi.fn();
    const props = {
      busy: false,
      onAttendance: noop,
      onGroup: noop,
      onCancel: noop,
      onMove: noop,
      onMakeup: noop,
      onReplace: noop,
      onRestore,
    };
    const wa = wrap(
      <LessonView lesson={lesson} can={lessonActions(lesson, '2026-11-24')} {...props} />,
    );
    expect(wa.MainButton.params.is_visible).toBe(false);
    cleanup();
    wrap(
      <LessonView
        lesson={cancelledLesson}
        can={lessonActions(cancelledLesson, '2026-11-24')}
        {...props}
      />,
    );
    expect(screen.getByText(c.compensations.none)).toBeTruthy();
    fireEvent.click(button(c.restore));
    fireEvent.click(screen.getAllByRole('button', { name: c.restore }).at(-1)!);
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('bekor qilish: sabab shart, kredit tanlanadi', () => {
    const onSave = vi.fn();
    const wa = wrap(<LessonCancelView saving={false} onSave={onSave} />);
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.change(screen.getByLabelText(c.reason), { target: { value: 'Ustoz kasal' } });
    fireEvent.click(button(c.compensations.credit));
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith('Ustoz kasal', 'credit');
  });

  it('oʻrinbosar: faqat oʻzgargani yuboriladi', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <LessonReplaceView
        teachers={[{ id: 't2', name: 'Sodiqova Lola' }]}
        rooms={[]}
        teacherId={null}
        roomId={null}
        saving={false}
        onSave={onSave}
      />,
    );
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.click(button('Sodiqova Lola'));
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith({ teacherId: 't2' });
  });

  it('bayram: oʻtgani olib tashlanmaydi', () => {
    const onDelete = vi.fn();
    wrap(
      <HolidaysView
        year={2026}
        today="2026-11-24"
        items={[
          { date: '2026-09-01', name: 'Mustaqillik' },
          { date: '2026-12-08', name: 'Konstitutsiya' },
        ]}
        saving={false}
        onYear={noop}
        onAdd={noop}
        onDelete={onDelete}
      />,
    );
    expect(screen.queryByRole('button', { name: /Mustaqillik/ })).toBeNull();
    fireEvent.click(button(/Konstitutsiya/));
    fireEvent.click(button(c.deleteHoliday));
    expect(onDelete).toHaveBeenCalledWith('2026-12-08');
  });
});

describe('MS-13 Davomat nazorati (T-137, BR-30)', () => {
  const [marked, unmarked] = day.lessons as [(typeof day.lessons)[0], (typeof day.lessons)[0]];
  const start = new Date('2026-11-24T06:00:00Z');

  it('dars holati', () => {
    const after = new Date('2026-11-24T07:00:00Z');
    expect(markState(marked, start, after)).toBe('marked');
    expect(markState(unmarked, start, after)).toBe('unmarked');
    expect(markState(unmarked, after, start)).toBe('notStarted');
    expect(markState({ ...unmarked, expected: 0 }, start, after)).toBe('noStudents');
    expect(markState({ ...marked, cancelled: true }, start, after)).toBe('cancelled');
  });

  it('oy jadvali: bekor dars hisobga olinmaydi, kech qolgan — kelgan', () => {
    const g = {
      groupId: 'g1',
      lessons: [
        { id: 'l1', date: '2026-11-02', startTime: '10:00', cancelled: false },
        { id: 'l2', date: '2026-11-04', startTime: '10:00', cancelled: true },
      ],
      students: [{ id: 's1', name: 'A' }],
      marks: [
        { lessonId: 'l1', studentId: 's1', status: 'late' as const },
        { lessonId: 'l2', studentId: 's1', status: 'absent' as const },
      ],
    };
    expect(perStudent(g)).toEqual([{ id: 's1', name: 'A', came: 1, total: 1 }]);
    expect(perLesson(g)[0]).toMatchObject({ came: 1, total: 1 });
  });

  it('kun: kelmaganlar va eski belgilanmaganlar', () => {
    const onLesson = vi.fn();
    wrap(
      <AttendanceDayView
        date="2026-11-24"
        today="2026-11-24"
        lessons={[
          { lesson: marked, state: 'marked' },
          { lesson: unmarked, state: 'unmarked' },
        ]}
        absentees={day.absentees}
        oldUnmarked={[oldUnmarked]}
        onStep={noop}
        onLesson={onLesson}
        onStudent={noop}
      />,
    );
    expect(screen.getByText('10/12 keldi')).toBeTruthy();
    expect(screen.getByText('Kech: 20 daq')).toBeTruthy();
    fireEvent.click(button(/Matematika 7/));
    expect(onLesson).toHaveBeenCalledWith('les2');
  });

  it('BR-30: oʻtgan kun — sababsiz saqlanmaydi; yopilgan — tugma yoʻq', () => {
    const onSave = vi.fn();
    const base = { lesson: LESSON, students: ROSTER, onSave };
    const wa = wrap(<AttendanceView {...base} reason={{ value: '', onChange: noop }} />);
    expect(wa.MainButton.params.is_active).toBe(false);
    cleanup();
    const ok = wrap(<AttendanceView {...base} reason={{ value: 'Xato', onChange: noop }} />);
    act(() => ok.MainButton.click());
    expect(onSave).toHaveBeenCalledOnce();
    cleanup();
    const locked = wrap(<AttendanceView {...base} readOnly readOnlyText="yopiq" />);
    expect(locked.MainButton.params.is_visible).toBe(false);
    expect(screen.getByText('yopiq')).toBeTruthy();
  });
});

describe('MS-21 Kurslar (T-150)', () => {
  it('darajalar takrorsiz; davomiylik chegarasi', () => {
    expect(parseLevels('A1, a1, , B2')).toEqual(['A1', 'B2']);
    const f = courseForm(course);
    expect(courseReady(f)).toBe(true);
    expect(courseReady({ ...f, duration: '5' })).toBe(false);
    expect(courseReady({ ...f, price: null })).toBe(false);
  });
});
