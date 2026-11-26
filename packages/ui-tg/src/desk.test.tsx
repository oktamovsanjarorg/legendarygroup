import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { canGoFullscreen, useTyping } from './desk.js';
import { createFakeWebApp } from './testing.js';

afterEach(cleanup);

function Probe() {
  return (
    <div>
      <input aria-label="matn" />
      <input type="checkbox" aria-label="belgi" />
      <span>{useTyping() ? 'yozyapti' : 'yoq'}</span>
    </div>
  );
}

describe('desk (T-175)', () => {
  it('brauzerdagi Telegram ham kompyuter mijozi; telefon — yoʻq', () => {
    expect(canGoFullscreen(createFakeWebApp({ platform: 'webk', version: '8.0' }))).toBe(true);
    expect(canGoFullscreen(createFakeWebApp({ platform: 'android', version: '8.0' }))).toBe(false);
    expect(canGoFullscreen(createFakeWebApp({ platform: 'tdesktop', version: '7.0' }))).toBe(false);
  });

  it('matn maydonida fokus — yozyapti; belgi katakchasi va fokus chiqishi — yoʻq', async () => {
    const r = render(<Probe />);
    act(() => r.getByLabelText('matn').focus());
    expect(r.getByText('yozyapti')).toBeTruthy();
    act(() => r.getByLabelText('belgi').focus());
    await act(() => new Promise((ok) => setTimeout(ok, 5)));
    expect(r.getByText('yoq')).toBeTruthy();
  });
});
