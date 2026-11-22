import { formatPeriod, miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp } from '@lg/ui-tg/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SetupView } from './setup.js';

afterEach(cleanup);
const G = [{ enrollmentId: 'e1', groupId: 'g1', name: '1-guruh', price: 600000n }];

describe('MS-05b boshlangʻich holat (T-145, Q-94)', () => {
  it('kelgan oydan oʻtgan oygacha oylar; «Toʻlanmagan» — guruh narxi bilan; MainButton', () => {
    const wa = createFakeWebApp();
    const onRow = vi.fn();
    const onSave = vi.fn();
    render(
      <TelegramProvider webApp={wa}>
        <SetupView
          student="Karimov Aziz"
          today="2026-11-22"
          groups={G}
          rows={{ e1: { startDate: '2026-09-15', unpaid: {} } }}
          saving={false}
          onRow={onRow}
          onSave={onSave}
        />
      </TelegramProvider>,
    );
    expect(screen.getByRole('radiogroup', { name: formatPeriod('2026-09') })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: formatPeriod('2026-10') })).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: formatPeriod('2026-11') })).toBeNull();
    const oct = screen.getByRole('radiogroup', { name: formatPeriod('2026-10') });
    fireEvent.click(
      [...oct.querySelectorAll('[role=radio]')].find(
        (el) => el.textContent === t.staffSetup.unpaid,
      ) as HTMLElement,
    );
    expect(onRow).toHaveBeenCalledWith('e1', {
      startDate: '2026-09-15',
      unpaid: { '2026-10': 600000n },
    });
    expect(wa.MainButton.params).toMatchObject({ is_visible: true, text: t.staffSetup.save });
    wa.MainButton.click();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('shu oyda kelgan — oldingi oy yoʻq', () => {
    render(
      <TelegramProvider webApp={createFakeWebApp()}>
        <SetupView
          student="A"
          today="2026-11-22"
          groups={G}
          rows={{ e1: { startDate: '2026-11-05', unpaid: {} } }}
          saving={false}
          onRow={vi.fn()}
          onSave={vi.fn()}
        />
      </TelegramProvider>,
    );
    expect(screen.getByText(t.staffSetup.noMonths)).toBeTruthy();
  });
});
