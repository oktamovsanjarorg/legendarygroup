import { HttpStatus } from '@nestjs/common';
import type { OrgListFilter } from '@lg/contracts';
import { isUniqueViolation } from '@lg/db';
import type { ErrorCode } from '@lg/i18n';
import { isNotNull, isNull, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppException } from '../../common/errors/app.exception.js';

export type ArchiveVerb = 'archive' | 'restore';

/** Ro'yxat filtri → `archived_at` sharti (`all` — shartsiz). */
export function archivedFilter(column: AnyPgColumn, f: OrgListFilter): SQL | undefined {
  if (f === 'active') return isNull(column);
  if (f === 'archived') return isNotNull(column);
  return undefined;
}

/** Arxiv holatiga mos amalmi: takroriy arxivlash/chiqarish — 409. */
export function assertArchiveTransition(archivedAt: Date | null, verb: ArchiveVerb): void {
  if (verb === 'archive' && archivedAt)
    throw new AppException(HttpStatus.CONFLICT, 'ALREADY_ARCHIVED');
  if (verb === 'restore' && !archivedAt)
    throw new AppException(HttpStatus.CONFLICT, 'NOT_ARCHIVED');
}

/**
 * Faol nom band (partial unique index) → domen xatosi. Tekshirish DB'da — parallel so'rovlarda
 * ham ishonchli (avval SELECT qilish poyga holatini qoldiradi).
 */
export async function withNameConflict<T>(
  constraint: string,
  code: ErrorCode,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isUniqueViolation(err, constraint)) throw new AppException(HttpStatus.CONFLICT, code);
    throw err;
  }
}
