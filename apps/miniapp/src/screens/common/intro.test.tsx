import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloudIntroStore } from '../../session/intro-store.js';
import { type IntroKind, introKindOf, IntroView } from './intro.js';

afterEach(cleanup);

function Flow({ kind, onDone }: { kind: IntroKind; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  return <IntroView kind={kind} index={index} onIndex={setIndex} onDone={onDone} />;
}

describe('C-06 tanishtiruv (T-125)', () => {
  it('rol → toʻplam: ustoz, ota-ona, xodim; oʻquvchi — yoʻq', () => {
    expect(introKindOf('teacher')).toBe('teacher');
    expect(introKindOf('guardian')).toBe('guardian');
    expect(introKindOf('director')).toBe('staff');
    expect(introKindOf('admin')).toBe('staff');
    expect(introKindOf('student')).toBeNull();
  });

  it('MainButton «Keyingi» ×2 → «Boshlash»; BackButton oldingisiga qaytaradi', () => {
    const wa = createFakeWebApp();
    const onDone = vi.fn();
    render(
      <TelegramProvider webApp={wa}>
        <Flow kind="guardian" onDone={onDone} />
      </TelegramProvider>,
    );
    const [c1, c2, c3] = t.intro.guardian;
    expect(screen.getByRole('heading', { name: c1.title })).toBeTruthy();
    expect(wa.MainButton.params.text).toBe(t.intro.next);
    act(() => wa.MainButton.click());
    expect(screen.getByRole('heading', { name: c2.title })).toBeTruthy();
    act(() => wa.BackButton.click());
    expect(screen.getByRole('heading', { name: c1.title })).toBeTruthy();
    act(() => wa.MainButton.click());
    act(() => wa.MainButton.click());
    expect(screen.getByRole('heading', { name: c3.title })).toBeTruthy();
    expect(wa.MainButton.params.text).toBe(t.intro.start);
    act(() => wa.MainButton.click());
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('koʻrilgani CloudStorage’da, rol toʻplami boʻyicha alohida', async () => {
    const wa = createFakeWebApp();
    const s = cloudIntroStore(wa);
    expect(await s.seen('teacher')).toBe(false);
    await s.markSeen('teacher');
    expect(await s.seen('teacher')).toBe(true);
    expect(await s.seen('staff')).toBe(false);
  });
});
