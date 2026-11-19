import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { changedCodes, codeIssues, initialCodes, titulCode } from './codes-form.js';
import { CODE_ROWS } from './codes-mock.js';
import { CodesView } from './codes.js';

afterEach(cleanup);

describe('MT-05a kodlar formasi (T-128)', () => {
  it('boshlangʻich — ustoz kodi yoki taklif; oʻzgarish — faqat saqlangandan farqlilar', () => {
    const v = initialCodes(CODE_ROWS);
    expect(v).toEqual({ c1: '1', c2: '7', c3: '2', c4: '3' });
    expect(changedCodes(CODE_ROWS, v)).toEqual([
      { studentId: 'c3', code: 2 },
      { studentId: 'c4', code: 3 },
    ]);
    expect(changedCodes(CODE_ROWS, { ...v, c1: '', c3: '', c4: '' })).toEqual([
      { studentId: 'c1', code: null },
    ]);
  });

  it('takror va notoʻgʻri son — xato, saqlanmaydi', () => {
    const v = { c1: '1', c2: '1', c3: '0', c4: '1000' };
    expect(codeIssues(v)).toEqual({
      c1: 'duplicate',
      c2: 'duplicate',
      c3: 'invalid',
      c4: 'invalid',
    });
    expect(changedCodes(CODE_ROWS, v)).toBeNull();
    expect(titulCode('7')).toBe('007');
  });
});

describe('MT-05a CodesView', () => {
  it('takliflar bilan MainButton faol; bosilganda oʻzgarishlar uzatiladi', async () => {
    const wa = createFakeWebApp();
    const onSave = vi.fn();
    render(
      <TelegramProvider webApp={wa}>
        <CodesView groupName="MAT-A" rows={CODE_ROWS} onSave={onSave} />
      </TelegramProvider>,
    );
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(true));
    fireEvent.change(screen.getByRole('textbox', { name: 'Karimov Jasur' }), {
      target: { value: '15' },
    });
    act(() => wa.MainButton.click());
    expect(onSave).toHaveBeenCalledWith([
      { studentId: 'c3', code: 15 },
      { studentId: 'c4', code: 3 },
    ]);
  });

  it('takror kiritilsa — xato matni, MainButton nofaol', async () => {
    const wa = createFakeWebApp();
    render(
      <TelegramProvider webApp={wa}>
        <CodesView groupName="MAT-A" rows={CODE_ROWS} onSave={vi.fn()} />
      </TelegramProvider>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Karimov Jasur' }), {
      target: { value: '7' },
    });
    expect(screen.getAllByText('Bu kod roʻyxatda takrorlangan')).toHaveLength(2);
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(false));
  });
});
