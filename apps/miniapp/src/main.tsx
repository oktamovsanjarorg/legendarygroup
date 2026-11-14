import { miniappMessages as t } from '@lg/i18n';
import { PALETTE, toCssVariables } from '@lg/ui-core';
import { applyTelegramTheme, getWebApp, supports } from '@lg/ui-tg';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.js';
import { OpenInTelegramPage } from './pages/open-in-telegram.js';
import './styles.css';

document.title = t.appTitle;
const el = document.getElementById('root');
if (!el) throw new Error('#root topilmadi');
const root = createRoot(el);
const wa = getWebApp();

if (wa) {
  wa.ready();
  wa.expand();
  // Ro'yxatni pastga surish ilovani yopib yubormasin (Bot API 7.7+).
  if (supports(wa, 'verticalSwipes')) wa.disableVerticalSwipes?.();
  applyTelegramTheme(wa);
  root.render(
    <StrictMode>
      <App webApp={wa} />
    </StrictMode>,
  );
} else {
  const style = document.createElement('style');
  style.textContent = `:root{${toCssVariables(PALETTE.light)}}`;
  document.head.append(style);
  root.render(<OpenInTelegramPage />);
}
