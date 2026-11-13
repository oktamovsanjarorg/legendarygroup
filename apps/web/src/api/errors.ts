import { ApiError } from './client.js';

/** Xato → ko'rsatiladigan matn (server `message` — i18n'dan, 07 §2). */
export const errorText = (e: unknown): string => (e instanceof ApiError ? e.message : String(e));

/** `DataTable`/`ErrorState` uchun xato ko'rinishi (requestId — "Batafsil"da). */
export const errorView = (e: unknown, onRetry: () => void) => ({
  message: errorText(e),
  requestId: e instanceof ApiError ? e.requestId : undefined,
  onRetry,
});
