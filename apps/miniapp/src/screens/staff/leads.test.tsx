import { miniappMessages as t } from '@lg/i18n';
import { ApiError } from '@lg/ui-core';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { convertRequest, existingLeadId, leadForm, leadReady } from '../../data/staff-leads.js';
import { emptyNewStudent } from '../../data/staff-new.js';
import { LeadTrialView, ReasonView } from './lead-forms.js';
import { LeadView } from './leads.js';
import { lead, lesson } from './lists-mock.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const noop = () => undefined;

describe('MS-09 Lidlar (T-133, Q-87)', () => {
  const view = (over: object) => (
    <LeadView
      lead={lead}
      busy={false}
      onStatus={noop}
      onLost={noop}
      onTrial={noop}
      onConvert={noop}
      onEdit={noop}
      onStudent={noop}
      {...over}
    />
  );

  it('keyingi qadamlar — Q-87 oqimidan; rad etish alohida (sabab bilan)', () => {
    const onStatus = vi.fn();
    const onLost = vi.fn();
    wrap(view({ onStatus, onLost }));
    fireEvent.click(button(t.leads.to.contacted));
    expect(onStatus).toHaveBeenCalledWith('contacted');
    fireEvent.click(button(t.leads.to.lost));
    expect(onLost).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: t.leads.to.new })).toBeNull();
  });

  it('rad etilgan — faqat qayta ochish; yozilgan — oʻquvchi kartochkasi', () => {
    const wa = wrap(view({ lead: { ...lead, status: 'lost', lostReason: 'Uzoq' } }));
    expect(button(t.leads.to.new)).toBeTruthy();
    expect(wa.MainButton.params.is_visible).toBe(false);
    cleanup();
    const onStudent = vi.fn();
    const won = wrap(view({ lead: { ...lead, status: 'won', studentId: 's1' }, onStudent }));
    act(() => won.MainButton.click());
    expect(onStudent).toHaveBeenCalledWith('s1');
  });

  it('shakl: telefon yaroqli boʻlishi shart', () => {
    expect(leadReady(leadForm(lead))).toBe(true);
    expect(leadReady({ ...leadForm(lead), phone: '12' })).toBe(false);
  });

  it('aylantirish: guruhsiz ham mumkin; ota-ona ismi boʻsh — avtomatik', () => {
    const f = { ...emptyNewStudent('2026-11-24'), fullName: 'Ali', guardianPhone: '901234567' };
    expect(convertRequest(f, false)).toMatchObject({
      enroll: null,
      student: { guardians: [{ fullName: 'Ali ota-onasi' }] },
    });
    expect(convertRequest({ ...f, groupId: 'g1' }, false).enroll).toEqual({
      groupId: 'g1',
      startDate: '2026-11-24',
    });
  });

  it('takror telefon: 409 dan oʻsha lid olinadi', () => {
    const e = new ApiError(409, 'LEAD_EXISTS', 'x', undefined, { leadId: 'l9' });
    expect(existingLeadId(e)).toBe('l9');
    expect(existingLeadId(new Error('x'))).toBeNull();
  });

  it('sabab 3 belgidan kam boʻlsa saqlanmaydi', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <ReasonView title="x" label="Sabab" action="OK" saving={false} onSave={onSave} />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' a ' } });
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Uzoq ' } });
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith('Uzoq');
  });

  it('sinov: dars tanlanmaguncha saqlanmaydi', () => {
    const onLesson = vi.fn();
    const wa = wrap(
      <LeadTrialView
        groups={[{ id: 'g1', name: 'IELTS A1' }]}
        groupId="g1"
        lessons={[lesson]}
        lessonId={null}
        saving={false}
        onGroup={noop}
        onLesson={onLesson}
        onSave={noop}
      />,
    );
    expect(wa.MainButton.params.is_active).toBe(false);
    fireEvent.click(button(/26\.11\.2026/));
    expect(onLesson).toHaveBeenCalledWith('les1');
  });
});
