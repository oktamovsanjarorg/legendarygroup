import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type CreateFeedbackInput, type FeedbackResponse } from '@lg/contracts';
import { AppException } from '../../common/errors/app.exception.js';
import { type RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { FeedbackRepository } from './feedback.repository.js';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FeedbackRepository) private readonly repository: FeedbackRepository,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async submitFeedback(
    actor: RequestUser,
    input: CreateFeedbackInput,
    requestId?: string,
  ): Promise<FeedbackResponse> {
    if (input.fileId) await this.assertOwnScreenshot(actor, input.fileId);
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

  /** Faqat o'zi yuklagan skrinshot — boshqaning cheki/rasmi Direktorga «sizdirilmasin». */
  private async assertOwnScreenshot(actor: RequestUser, fileId: string): Promise<void> {
    const f = await this.files.ownership(fileId);
    if (f?.purpose !== 'feedback_screenshot' || f.uploadedBy !== actor.id)
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'FILE_NOT_ALLOWED');
  }

  async listFeedbacks(limit?: number, offset?: number) {
    return this.repository.list(limit, offset);
  }
}
