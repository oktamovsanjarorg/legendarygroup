import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { annReady, emptyAnn } from '../../data/staff-announcements.js';
import { diffText } from '../../data/staff-audit.js';
import { retryable, undeliveredReason } from '../../data/staff-undelivered.js';
import { AnnFormView, AnnouncementView } from './announcements.js';
import { AuditItemView, AuditLogList } from './audit.js';
import { annStats, auditItem, undeliveredItem } from './lists-mock.js';
import { UndeliveredView } from './undelivered.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const noop = () => undefined;

describe('MS-15 Eʼlon (T-139)', () => {
  const form = { ...emptyAnn, targetId: 'g1', title: 'Dars', body: 'Ertaga 15:00' };
  const view = (over: object) => (
    <AnnFormView
      form={form}
      groups={[{ id: 'g1', name: 'A1' }]}
      courses={[]}
      count={12}
      file={{ kind: 'empty' }}
      sending={false}
      onForm={noop}
      onPickFile={noop}
      onSend={noop}
      {...over}
    />
  );

  it('auditoriya, matn va kamida bitta qabul qiluvchi shart', () => {
    expect(annReady(form, 12)).toBe(true);
    expect(annReady(form, 0)).toBe(false);
    expect(annReady({ ...form, targetId: null }, 12)).toBe(false);
    expect(annReady({ ...form, targetType: 'all', targetId: null }, 12)).toBe(true);
    expect(annReady({ ...form, body: ' abc ' }, 12)).toBe(false);
  });

  it('yuborish — soni bilan tasdiq; fayl yuklanayotganda yopiq', () => {
    const onSend = vi.fn();
    const wa = wrap(view({ onSend }));
    act(() => wa.MainButton.click());
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByText(t.staffAnn.confirm.replace('{n}', '12'))).toBeTruthy();
    fireEvent.click(button(t.staffAnn.send));
    expect(onSend).toHaveBeenCalledOnce();
    cleanup();
    const up = wrap(view({ file: { kind: 'uploading', name: 'a', percent: 1 } }));
    expect(up.MainButton.params.is_active).toBe(false);
  });

  it('auditoriya almashsa — tanlangan guruh tozalanadi', () => {
    const onForm = vi.fn();
    wrap(view({ onForm }));
    fireEvent.click(button(t.staffAnn.audiences.course));
    expect(onForm).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'course', targetId: null }),
    );
  });

  it('yetmaganga qoʻngʻiroq havolasi', () => {
    wrap(<AnnouncementView stats={annStats} />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      'tel:+998901230001',
    ]);
  });
});

describe('MS-26 Yetib bormagan xabarlar (T-155)', () => {
  const unlinked = {
    ...undeliveredItem,
    id: 'n2',
    status: 'failed' as const,
    failedReason: 'NO_TELEGRAM',
    retryable: false,
  };

  it('sabab; ulanmagan — qayta yuborilmaydi', () => {
    expect(undeliveredReason(undeliveredItem)).toBe(t.undelivered.reasons.blocked);
    expect(undeliveredReason(unlinked)).toBe(t.undelivered.reasons.notLinked);
    expect(retryable([undeliveredItem, unlinked]).map((x) => x.id)).toEqual(['n1']);
  });

  it('qator → qoʻngʻiroq va qayta yuborish', () => {
    const onRetry = vi.fn();
    wrap(
      <UndeliveredView
        items={[undeliveredItem]}
        filter="all"
        busy={false}
        onFilter={noop}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(button(/Aliyeva Nodira/));
    expect(screen.getByRole('link').getAttribute('href')).toBe('tel:+998901234567');
    fireEvent.click(button(t.undelivered.retry));
    expect(onRetry).toHaveBeenCalledWith(['n1']);
  });
});

describe('MS-33 Audit (T-162)', () => {
  it('amal nomi oʻzbekcha; nomaʼlum kod — oʻzi', () => {
    wrap(
      <AuditLogList
        items={[auditItem, { ...auditItem, id: 'x9', action: 'new.code' }]}
        filter="all"
        hasMore={false}
        onFilter={noop}
        onMore={noop}
        onOpen={noop}
      />,
    );
    expect(screen.getByText(t.auditActions['billing.discount.set'])).toBeTruthy();
    expect(screen.getByText('new.code')).toBeTruthy();
  });

  it('diff: oldin → keyin', () => {
    expect(diffText(null)).toBe('—');
    expect(diffText({ a: 1 })).toBe('{"a":1}');
    wrap(<AuditItemView item={auditItem} />);
    expect(screen.getByText('discountPercent')).toBeTruthy();
  });
});
