import { Inject, Injectable } from '@nestjs/common';
import { type CreateFeedbackInput, type FeedbackResponse } from '@lg/contracts';
import { type RequestUser } from '../auth/index.js';
import { FeedbackRepository } from './feedback.repository.js';

@Injectable()
export class FeedbackService {
  constructor(@Inject(FeedbackRepository) private readonly repository: FeedbackRepository) {}

  async submitFeedback(
    actor: RequestUser,
    input: CreateFeedbackInput,
    requestId?: string,
  ): Promise<FeedbackResponse> {
    const row = await this.repository.create({
      userId: actor.id,
      input,
      requestId,
    });

    return {
      id: row.id,
      status: 'received',
      message: 'Fikr-mulohazangiz muvaffaqiyatli qabul qilindi. Rahmat!',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listFeedbacks(limit?: number, offset?: number) {
    return this.repository.list(limit, offset);
  }
}
