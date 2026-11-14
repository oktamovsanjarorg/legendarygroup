import { webF3AdminMessages } from './web-f3-admin.js';
import { webF3CommMessages } from './web-f3-comm.js';
import { webF3FinanceMessages } from './web-f3-finance.js';

/** Web panel — F3–F5 ekranlari (W-19…W-27, W-30, W-35; docs/ux/screens.md §2). */
export const webF3Messages = {
  ...webF3CommMessages,
  ...webF3FinanceMessages,
  ...webF3AdminMessages,
};
