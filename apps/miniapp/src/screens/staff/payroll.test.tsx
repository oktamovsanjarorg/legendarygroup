import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advanceBody,
  contractBody,
  contractState,
  contractTerms,
  defaultPeriod,
  emptyContract,
  itemHint,
  percentBp,
  runPhase,
  type RunPhase,
} from '../../data/staff-payroll.js';
import { AdvancesView } from './advances.js';
import { advances, contracts, payrollRun, payrollStaff } from './payroll-mock.js';
import { ContractNewView, ContractView } from './payroll-terms.js';
import { PayrollAdjustView, PayrollTeacherView, PayrollView } from './payroll.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const noop = () => undefined;
const c = t.staffPayroll;

describe('MS-28 maʼlumot qatlami (T-157)', () => {
  it('davr: oyning 15-kunigacha — oʻtgan oy', () => {
    expect(defaultPeriod('2026-01-15')).toBe('2025-12');
    expect(defaultPeriod('2026-01-16')).toBe('2026-01');
  });

  it('BR-27: bosqich — oy tugamagan, eskirgan, tayyor', () => {
    const run = { ...payrollRun, generatedAt: '2026-10-31T18:59:59.000Z' };
    expect(runPhase(null, '2026-10', '2026-11-01')).toBe('none');
    expect(runPhase(run, '2026-10', '2026-10-31')).toBe('open');
    expect(runPhase(run, '2026-10', '2026-11-01')).toBe('stale');
    expect(runPhase({ ...run, generatedAt: null }, '2026-10', '2026-11-01')).toBe('stale');
    const fresh = { ...run, generatedAt: '2026-10-31T19:00:00.000Z' };
    expect(runPhase(fresh, '2026-10', '2026-11-01')).toBe('ready');
    expect(runPhase({ ...run, status: 'paid' }, '2026-10', '2026-11-01')).toBe('paid');
  });

  it('foiz va shartnoma soʻrovi', () => {
    expect(['40', '37,5', '100', '0', '101', 'x'].map(percentBp)).toEqual([
      4000,
      3750,
      10_000,
      null,
      null,
      null,
    ]);
    const f = { ...emptyContract('2026-11-24'), teacherId: 't1', percent: '40' };
    expect(contractBody(f)).toMatchObject({
      type: 'percent',
      fixedAmount: '0',
      percentBp: 4000,
      validFrom: '2026-11-01',
      validTo: null,
    });
    expect(contractBody({ ...f, type: 'mixed' })).toBeNull();
    expect(contractBody({ ...f, to: '2026-10-01' })).toBeNull();
    expect(contractTerms(contracts[0]!)).toMatch(/2.000.000.soʻm \+ 40%/);
    expect(contractState({ validFrom: '2026-01-01', validTo: '2026-11-23' }, '2026-11-24')).toBe(
      'ended',
    );
  });

  it('BR-28: avans kelajak sanaga yozilmaydi', () => {
    const f = { teacherId: 't1', amount: 5n, date: '2026-11-25', note: '' };
    expect(advanceBody(f, '2026-11-24')).toBeNull();
    expect(advanceBody({ ...f, date: '2026-11-24' }, '2026-11-24')).toEqual({
      teacherId: 't1',
      amount: '5',
      givenAt: '2026-11-24',
    });
  });

  it('qator izohi: kunlar, oʻrinbosar, foiz bazasi', () => {
    const [fixed, percent, sub, bonus] = payrollRun.teachers[0]!.items;
    expect(itemHint(fixed!)).toContain('16/31');
    expect(itemHint(fixed!)).toContain('12');
    expect(itemHint(percent!)).toMatch(/10.000.000.soʻm.*40%/);
    expect(itemHint(sub!)).toMatch(/1 dars × 50.000/);
    expect(itemHint(bonus!)).toBe('Olimpiada natijasi');
  });
});

function runView(phase: RunPhase, canApprove = true) {
  const onAction = vi.fn();
  const wa = wrap(
    <PayrollView
      run={phase === 'none' ? null : payrollRun}
      phase={phase}
      period="2026-10"
      current="2026-11"
      canApprove={canApprove}
      busy={false}
      onStep={noop}
      onAction={onAction}
      onTeacher={noop}
      onContracts={noop}
      onAdvances={noop}
      onAdjust={noop}
    />,
  );
  return { wa, onAction };
}

describe('MS-28 ekranlari (T-157)', () => {
  it('hisoblanmagan: MainButton — hisoblash', () => {
    const { wa, onAction } = runView('none');
    act(() => wa.MainButton.click());
    expect(onAction).toHaveBeenCalledWith('generate');
  });

  it('eskirgan: tasdiqlash yoʻq, qayta hisoblash bor', () => {
    const { wa, onAction } = runView('stale');
    expect(screen.getByText(c.stale)).toBeDefined();
    act(() => wa.MainButton.click());
    expect(onAction).toHaveBeenCalledWith('generate');
  });

  it('BR-27: tayyor — tasdiqlash faqat soʻralgach', () => {
    const { wa, onAction } = runView('ready');
    act(() => wa.MainButton.click());
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(button(c.approve));
    expect(onAction).toHaveBeenCalledWith('approve');
  });

  it('tasdiqlash huquqi yoʻq — faqat qayta hisoblash', () => {
    const { wa, onAction } = runView('ready', false);
    act(() => wa.MainButton.click());
    expect(onAction).toHaveBeenCalledWith('generate');
  });

  it('xodim: faqat qoʻlda yozilgan qator olib tashlanadi', () => {
    const onRemove = vi.fn();
    wrap(
      <PayrollTeacherView
        period="2026-10"
        summary={payrollRun.teachers[0]!}
        draft
        busy={false}
        onAdjust={noop}
        onRemove={onRemove}
      />,
    );
    expect(screen.queryByRole('button', { name: new RegExp(c.kinds.fixed) })).toBeNull();
    fireEvent.click(button(new RegExp(c.kinds.bonus)));
    fireEvent.click(button(c.removeItem));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'i4' }));
  });

  it('BR-26: jarima — sabab va summa shart', () => {
    const onSave = vi.fn();
    const wa = wrap(
      <PayrollAdjustView
        period="2026-10"
        staff={payrollStaff}
        teacherId="t1"
        saving={false}
        onSave={onSave}
      />,
    );
    fireEvent.click(button(c.kinds.penalty));
    type(c.amount, '50000');
    act(() => wa.MainButton.click());
    expect(onSave).not.toHaveBeenCalled();
    type(c.note, 'Kechikish');
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith({
      teacherId: 't1',
      kind: 'penalty',
      amount: '50000',
      note: 'Kechikish',
    });
  });

  it('shartnoma: turga qarab maydon; tugatish sanasi boshlanishidan oldin emas', () => {
    wrap(
      <ContractNewView
        form={emptyContract('2026-11-24')}
        staff={payrollStaff}
        groups={[]}
        saving={false}
        onForm={noop}
        onSave={noop}
      />,
    );
    expect(screen.queryByLabelText(t.staffContracts.fixed)).toBeNull();
    expect(screen.getByLabelText(t.staffContracts.percent)).toBeDefined();
    cleanup();
    const onEnd = vi.fn();
    const wa = wrap(
      <ContractView
        contract={contracts[0]!}
        today="2026-11-24"
        busy={false}
        onEnd={onEnd}
        onRemove={noop}
      />,
    );
    type(t.staffContracts.lastDay, '2025-12-31');
    act(() => wa.MainButton.click());
    expect(onEnd).not.toHaveBeenCalled();
    type(t.staffContracts.lastDay, '2026-11-30');
    act(() => wa.MainButton.click());
    expect(onEnd).toHaveBeenCalledWith('2026-11-30');
  });

  it('avans: qoldigʻi koʻrinadi, oʻchirish soʻraladi', () => {
    const onRemove = vi.fn();
    wrap(<AdvancesView items={advances} onAdd={noop} onRemove={onRemove} />);
    expect(screen.getByText(/Qoldi 500.000/)).toBeDefined();
    fireEvent.click(button(/Aliyeva/));
    fireEvent.click(button(t.staffAdvances.remove));
    expect(onRemove).toHaveBeenCalledWith('a1');
  });
});
