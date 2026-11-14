import { Inject, Injectable } from '@nestjs/common';
import { type Database, settings, type Transaction } from '@lg/db';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface UpsertSettingParams {
  key: string;
  value: unknown;
  updatedBy: string | null;
  updatedAt: Date;
  tx?: Transaction | Database;
}

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async getRaw(key: string, tx: Transaction | Database = this.db) {
    const [row] = await tx.select().from(settings).where(eq(settings.key, key));
    return row ?? null;
  }

  async upsertRaw(params: UpsertSettingParams): Promise<void> {
    const client = params.tx ?? this.db;
    const { key, value, updatedBy, updatedAt } = params;
    await client.insert(settings).values({ key, value, updatedBy, updatedAt }).onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy, updatedAt },
    });
  }
}
