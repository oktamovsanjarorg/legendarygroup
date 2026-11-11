import type { Context, NextFunction } from 'grammy';

/** Redis'ning bizga kerakli qismi (testda soxtasi). */
export interface DedupeStore {
  set(key: string, value: string, mode: 'EX', ttl: number, nx: 'NX'): Promise<'OK' | null>;
}

export const UPDATE_TTL_S = 24 * 60 * 60;

/**
 * Takroriy update'ni o'tkazib yuboradi (T-010 Aniqlik): Telegram webhook'ni qayta yuborishi
 * mumkin (timeout, restart). `update_id` 24 soat saqlanadi — bir update bir marta ishlanadi.
 */
export const dedupeUpdates =
  (store: DedupeStore) =>
  async (ctx: Context, next: NextFunction): Promise<void> => {
    const first = await store.set(
      `tg:update:${ctx.update.update_id}`,
      '1',
      'EX',
      UPDATE_TTL_S,
      'NX',
    );
    if (first === 'OK') await next();
  };
