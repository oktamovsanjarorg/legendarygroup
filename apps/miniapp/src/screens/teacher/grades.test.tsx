import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { changedGrades, lessonGrades } from '../../data/grades-map.js';
import { AttendanceView } from './attendance.js';
import { GradesView, type GradesViewProps } from './grades.js';
import { LESSON, ROSTER } from './mock.js';

afterEach(cleanup);
const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
const S1 = ROSTER[0]!;
const S2 = ROSTER[1]!;
const g = t.grades;

const view = (over: Partial<GradesViewProps> = {}) => {
  const wa = createFakeWebApp();
  const onSave = vi.fn();
  wrap(
    wa,
    <GradesView
      lesson={LESSON}
      students={ROSTER.slice(0, 3)}
      absent={new Set([S2.id])}
      grades={{ scale: '0_5', kinds: ['homework', 'activity'], saved: {}, date: '2026-11-26' }}
      locked={false}
      onSave={onSave}
      {...over}
    />,
  );
  return { wa, onSave };
};

describe('MT-02b Baholar (FR-GRD-1, BR-33, BR-37)', () => {
  it('0–5: baho tanlash → MainButton «Baholarni saqlash (2)»; tur almashtirilsa alohida', async () => {
    const { wa, onSave } = view();
    expect(wa.MainButton.params.is_visible).toBeFalsy();
    fireEvent.click(
      screen
        .getByRole('radiogroup', { name: g.pick.replace('{name}', S1.name) })
        .querySelectorAll('button')[5]!,
    );
    fireEvent.click(screen.getByRole('radio', { name: t.student.gradeKinds.activity }));
    fireEvent.click(
      screen
        .getByRole('radiogroup', { name: g.pick.replace('{name}', S1.name) })
        .querySelectorAll('button')[4]!,
    );
    await waitFor(() => expect(wa.MainButton.params.text).toBe('Baholarni saqlash (2)'));
    expect(wa.closingConfirmation).toBe(true);
    act(() => wa.MainButton.click());
    expect(onSave.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        { studentId: S1.id, kind: 'homework', value: 5 },
        { studentId: S1.id, kind: 'activity', value: 4 },
      ]),
    );
  });

  it('kelmagan oʻquvchi belgilanadi; muddat tugagan — tahrirlab boʻlmaydi', () => {
    view({ locked: true });
    expect(screen.getByText(g.absent)).toBeTruthy();
    expect(screen.getByText(g.locked)).toBeTruthy();
    const first = screen.getByRole('radiogroup', { name: g.pick.replace('{name}', S1.name) });
    expect(first.querySelector('button')?.hasAttribute('disabled')).toBe(true);
  });

  it('0–100: raqam maydoni; guruhda baholash yoʻq — izoh', () => {
    view({ grades: { scale: '0_100', kinds: ['homework'], saved: {}, date: '2026-11-26' } });
    expect(screen.getByLabelText(g.pick.replace('{name}', S1.name))).toHaveProperty(
      'type',
      'number',
    );
    expect(screen.queryByRole('radio', { name: t.student.gradeKinds.activity })).toBeNull();
    cleanup();
    view({ grades: { scale: '0_5', kinds: [], saved: {}, date: '2026-11-26' } });
    expect(screen.getByText(g.off)).toBeTruthy();
  });

  it('faqat oʻzgargan baholar yuboriladi; nomaʼlum tur tashlanadi', () => {
    const saved = { [`${S1.id}:homework`]: 4 };
    expect(changedGrades(saved, { ...saved, [`${S2.id}:homework`]: 3 })).toEqual([
      { studentId: S2.id, kind: 'homework', value: 3 },
    ]);
    const r = lessonGrades({
      lessonId: 'l',
      groupId: 'g',
      groupName: 'G',
      date: '2026-11-26',
      scale: '0_5',
      allowedKinds: ['homework', 'other'],
      grades: [],
      comments: [],
    });
    expect(r.kinds).toEqual(['homework']);
  });

  it('davomat saqlangan — «Baho qoʻyish» havolasi', () => {
    const onGrades = vi.fn();
    wrap(
      createFakeWebApp(),
      <AttendanceView
        lesson={LESSON}
        students={ROSTER}
        saved={{}}
        onSave={vi.fn()}
        onGrades={onGrades}
      />,
    );
    fireEvent.click(screen.getByText(g.open));
    expect(onGrades).toHaveBeenCalledOnce();
  });
});
