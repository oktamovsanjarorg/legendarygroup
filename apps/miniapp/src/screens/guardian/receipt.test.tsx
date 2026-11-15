import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { METHOD } from '../../data/guardian-map.js';
import { ReceiptView } from './receipt.js';

afterEach(cleanup);
const p = t.payments;

describe('MG-05a Chek (FR-PAY-8)', () => {
  it('rekvizitlar; bekor qilingan — sabab; MainButton — PDF', async () => {
    const wa = createFakeWebApp();
    const onPdf = vi.fn();
    render(
      <TelegramProvider webApp={wa}>
        <ReceiptView
          r={{
            number: 'LG-2026-000007',
            amount: 650_000n,
            date: new Date('2026-11-10T07:00:00Z'),
            method: METHOD.bank,
            cancelled: true,
            cancelReason: 'Kassa xatosi',
          }}
          onPdf={onPdf}
        />
      </TelegramProvider>,
    );
    expect(screen.getByText('LG-2026-000007')).toBeTruthy();
    expect(screen.getByText(p.methods.transfer)).toBeTruthy();
    expect(screen.getByText('Kassa xatosi')).toBeTruthy();
    await waitFor(() => expect(wa.MainButton.params.text).toBe(p.receiptPdf));
    act(() => wa.MainButton.click());
    expect(onPdf).toHaveBeenCalledOnce();
  });
});
