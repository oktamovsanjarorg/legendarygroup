import { PALETTE, toCssVariables } from '@lg/ui-core';
import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import './preview.css';
import { TelegramFrame } from './telegram-frame.js';

function WebTheme({ scheme }: { scheme: 'light' | 'dark' }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `:root{${toCssVariables(PALETTE[scheme])}color-scheme:${scheme};}`;
    document.head.append(style);
    return () => style.remove();
  }, [scheme]);
  return null;
}

/** `ui-tg/*` — Telegram ramkasi; `ui-web/*` — web palitrasi. */
const withTheme: Decorator = (Story, ctx) => {
  const theme = String(ctx.globals['theme'] ?? 'light');
  if (ctx.title.startsWith('ui-tg/'))
    return (
      <TelegramFrame theme={theme}>
        <Story />
      </TelegramFrame>
    );
  return (
    <div className="min-h-screen bg-surface p-6">
      <WebTheme scheme={theme === 'dark' ? 'dark' : 'light'} />
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Tema (Mini App: Telegram temasi)',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'lowContrast', title: 'Custom (past kontrast → fallback)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: { layout: 'fullscreen', a11y: { test: 'error' } },
};

export default preview;
