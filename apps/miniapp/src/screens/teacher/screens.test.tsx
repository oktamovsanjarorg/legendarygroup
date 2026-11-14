import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnounceView } from './announce.js';
import { AttendanceView } from './attendance.js';
import { LESSON, ROSTER } from './mock.js';

afterEach(cleanup);
const wrap = (wa: FakeWebApp, ui: ReactNode) =>
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);

describe('MT-02 Davomat (FR-ATT-1/2)', () => {
  it('2 kishini bosish → MainButton «Saqlash (17/20 keldi)», saqlashda belgilar uzatiladi', async () => {
    const wa = createFakeWebApp();
    const onSave = vi.fn();
    wrap(wa, <AttendanceView lesson={LESSON} students={ROSTER} onSave={onSave} />);
    // s7 oldindan sababli → boshida 19/20.
    await waitFor(() => expect(wa.MainButton.params.text).toBe('Saqlash (19/20 keldi)'));
    fireEvent.click(screen.getByRole('button', { name: `${ROSTER[0]?.name}: Keldi` }));
    fireEvent.click(screen.getByRole('button', { name: `${ROSTER[1]?.name}: Keldi` }));
    await waitFor(() => expect(wa.MainButton.params.text).toBe('Saqlash (17/20 keldi)'));
    expect(wa.closingConfirmation).toBe(true);
    act(() => wa.MainButton.click());
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      s1: { kind: 'absent' },
      s2: { kind: 'absent' },
      s7: { kind: 'excused' },
    });
  });

  it("saqlangan, o'zgarishsiz — MainButton yashirin", async () => {
    const wa = createFakeWebApp();
    wrap(
      wa,
      <AttendanceView
        lesson={LESSON}
        students={ROSTER}
        saved={{ s1: { kind: 'absent' } }}
        onSave={vi.fn()}
      />,
    );
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(false));
  });
});

describe("MT-10 E'lon (11-ux §4.5)", () => {
  it("qoralama tiklanadi → oldindan ko'rish → tasdiqlash oynasi → yuborish", async () => {
    const wa = createFakeWebApp();
    const onSend = vi.fn();
    wrap(
      wa,
      <AnnounceView
        groupName="B2"
        recipients={20}
        draft="Ertaga dars 16:00 da."
        onAttach={vi.fn()}
        onSend={onSend}
      />,
    );
    expect(screen.getByText(t.announce.preview)).toBeTruthy();
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(true));
    act(() => wa.MainButton.click());
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.announce.confirm }));
    expect(onSend).toHaveBeenCalledWith('Ertaga dars 16:00 da.');
  });

  it('matn boʻsh — yuborib boʻlmaydi', async () => {
    const wa = createFakeWebApp();
    wrap(wa, <AnnounceView groupName="B2" recipients={20} onAttach={vi.fn()} onSend={vi.fn()} />);
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(false));
  });
});
