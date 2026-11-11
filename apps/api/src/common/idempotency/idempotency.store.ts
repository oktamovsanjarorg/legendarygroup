import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { type Database, idempotencyKeys } from '@lg/db';
import { DB_TOKEN } from '../db/db.tokens.js';

export interface IdempotencyScope {
  key: string;
  route: string;
  userId: string | null;
}

export interface StoredResponse {
  requestHash: string;
  responseStatus: number | null;
  responseBody: unknown;
}

interface ClaimInput {
  requestHash: string;
  now: Date;
  expiresAt: Date;
  /** Shundan oldin band qilingan va tugallanmagan yozuv "osilib qolgan" hisoblanadi. */
  staleBefore: Date;
}

/** `idempotency_keys` jadvali ustidagi atomar amallar. */
@Injectable()
export class IdempotencyStore {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /**
   * Kalitni atomar band qiladi. `true` — shu so'rov bajarishi kerak.
   * Mavjud yozuv muddati o'tgan yoki osilib qolgan bo'lsa — uni egallaydi.
   */
  async claim(scope: IdempotencyScope, input: ClaimInput): Promise<boolean> {
    const values = {
      ...scope,
      requestHash: input.requestHash,
      responseStatus: null,
      responseBody: null,
      createdAt: input.now,
      expiresAt: input.expiresAt,
    };
    const inserted = await this.db
      .insert(idempotencyKeys)
      .values(values)
      .onConflictDoNothing()
      .returning({ key: idempotencyKeys.key });
    if (inserted.length > 0) return true;

    const takenOver = await this.db
      .update(idempotencyKeys)
      .set(values)
      .where(
        and(
          this.match(scope),
          or(
            lte(idempotencyKeys.expiresAt, input.now),
            and(
              isNull(idempotencyKeys.responseStatus),
              lt(idempotencyKeys.createdAt, input.staleBefore),
            ),
          ),
        ),
      )
      .returning({ key: idempotencyKeys.key });
    return takenOver.length > 0;
  }

  async find(scope: IdempotencyScope): Promise<StoredResponse | undefined> {
    const [row] = await this.db
      .select({
        requestHash: idempotencyKeys.requestHash,
        responseStatus: idempotencyKeys.responseStatus,
        responseBody: idempotencyKeys.responseBody,
      })
      .from(idempotencyKeys)
      .where(this.match(scope))
      .limit(1);
    return row;
  }

  async complete(scope: IdempotencyScope, status: number, body: unknown): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({ responseStatus: status, responseBody: body ?? null })
      .where(and(this.match(scope), isNull(idempotencyKeys.responseStatus)));
  }

  /** Handler xato bilan tugadi — band qilish bekor, mijoz shu kalit bilan qayta urina oladi. */
  async release(scope: IdempotencyScope): Promise<void> {
    await this.db
      .delete(idempotencyKeys)
      .where(and(this.match(scope), isNull(idempotencyKeys.responseStatus)));
  }

  private match(scope: IdempotencyScope): SQL | undefined {
    return and(
      eq(idempotencyKeys.key, scope.key),
      eq(idempotencyKeys.route, scope.route),
      sql`${idempotencyKeys.userId} IS NOT DISTINCT FROM ${scope.userId}::uuid`,
    );
  }
}
