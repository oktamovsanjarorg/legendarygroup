import { Inject, Injectable } from '@nestjs/common';
import { type CreateFeedbackInput } from '@lg/contracts';
import { feedbacks, outboxEvents, type Database, type FeedbackRow, type Transaction } from '@lg/db';
import { desc, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface CreateFeedbackParams {
  userId?: string | null;
  input: CreateFeedbackInput;
  requestId?: string | null;
}

@Injectable()
export class FeedbackRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async create(params: CreateFeedbackParams): Promise<FeedbackRow> {
    const { userId, input, requestId } = params;

    return this.db.transaction(async (tx: Transaction) => {
      const [inserted] = await tx
        .insert(feedbacks)
        .values({
          userId: userId ?? null,
          type: input.type,
          text: input.text,
          fileId: input.fileId ?? null,
          screen: input.screen ?? null,
          appVersion: input.appVersion ?? null,
          platform: input.platform,
          requestId: requestId ?? null,
          clientContext: (input.clientContext as Record<string, unknown>) ?? null,
          status: 'received',
        })
        .returning();

      if (!inserted) {
        throw new Error('Feedback yozishda kutilmagan xatolik');
      }

      // Outbox event: loyiha egasiga/adminga Telegram xabar chiqarish uchun
      await tx.insert(outboxEvents).values({
        type: 'feedback.created',
        payload: {
          feedbackId: inserted.id,
          type: inserted.type,
          text: inserted.text,
          screen: inserted.screen,
          platform: inserted.platform,
          fileId: inserted.fileId,
          userId: inserted.userId,
        },
      });

      return inserted;
    });
  }

  async list(limit = 50, offset = 0): Promise<FeedbackRow[]> {
    return this.db
      .select()
      .from(feedbacks)
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string): Promise<FeedbackRow | undefined> {
    const [row] = await this.db.select().from(feedbacks).where(eq(feedbacks.id, id));
    return row;
  }
}
