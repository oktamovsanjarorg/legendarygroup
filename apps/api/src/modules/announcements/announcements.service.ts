import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type AnnouncementItem,
  type AnnouncementListQuery,
  type AnnouncementPreviewQuery,
  type AnnouncementPreviewResponse,
  type AnnouncementRecipientItem,
  type AnnouncementStats,
  type CreateAnnouncementRequest,
  DEFAULT_BRANCH_ID,
} from '@lg/contracts';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { NotificationsService } from '../notifications/index.js';
import {
  type AnnouncementsRepository,
  type AudienceRecipient,
  AnnouncementsRepository as RepoToken,
} from './announcements.repository.js';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(RepoToken) private readonly repo: AnnouncementsRepository,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  /** O'qituvchi doirasini tekshirish */
  private async assertActorScope(
    actor: RequestUser,
    targetType: string,
    targetId?: string | null,
  ): Promise<void> {
    if (actor.role === 'guardian') {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    if (actor.role === 'teacher') {
      if (targetType !== 'group' || !targetId) {
        throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
      }
      const allowed = await this.repo.isTeacherInGroup(actor.id, targetId);
      if (!allowed) {
        throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
      }
    }
  }

  /** E'lon oldidan auditoriya qamrovini ko'rish (Preview) */
  async preview(
    actor: RequestUser,
    query: AnnouncementPreviewQuery,
  ): Promise<AnnouncementPreviewResponse> {
    await this.assertActorScope(actor, query.targetType, query.targetId);
    const audience = await this.repo.findAudience({
      branchId: DEFAULT_BRANCH_ID,
      targetType: query.targetType,
      targetId: query.targetId,
    });

    return {
      targetType: query.targetType,
      targetId: query.targetId ?? null,
      recipientCount: audience.length,
      sampleRecipients: audience.slice(0, 5).map((r) => ({
        userId: r.userId,
        guardianName: r.guardianName,
        phone: r.phone,
        studentNames: r.studentNames,
      })),
    };
  }

  /** E'lon yaratish va tarqatish */
  async createAndSend(
    actor: RequestUser,
    dto: CreateAnnouncementRequest,
  ): Promise<AnnouncementItem> {
    await this.assertActorScope(actor, dto.targetType, dto.targetId);
    const audience = await this.repo.findAudience({
      branchId: DEFAULT_BRANCH_ID,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });

    const status = dto.sendNow ? 'processing' : 'draft';
    const ann = await this.repo.createAnnouncement({
      branchId: DEFAULT_BRANCH_ID,
      authorId: actor.id,
      title: dto.title,
      body: dto.body,
      targetType: dto.targetType,
      targetId: dto.targetId,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      status,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });

    if (dto.sendNow && audience.length > 0) {
      await this.dispatchToAudience(ann.id, audience, dto);
    } else if (dto.sendNow && audience.length === 0) {
      await this.repo.updateAnnouncementStatus(ann.id, {
        status: 'completed',
        sentAt: new Date(),
        totalRecipients: 0,
      });
    }

    return this.getById(actor, ann.id);
  }

  private async dispatchToAudience(
    announcementId: string,
    audience: AudienceRecipient[],
    dto: CreateAnnouncementRequest,
  ): Promise<void> {
    await this.repo.insertRecipients(
      audience.map((a) => ({
        announcementId,
        userId: a.userId,
        recipientName: a.guardianName,
        recipientPhone: a.phone,
        status: 'queued',
      })),
    );

    let sent = 0;
    let failed = 0;

    for (const r of audience) {
      try {
        const notifId = await this.notificationsService.notify({
          userId: r.userId,
          type: 'announcement',
          branchId: r.branchId,
          dedupeKey: `announcement-${announcementId}-${r.userId}`,
          payload: {
            title: dto.title,
            body: dto.body,
            message: dto.body,
            fileUrl: dto.fileUrl,
            fileType: dto.fileType,
          },
        });

        await this.repo.updateRecipientDelivery(announcementId, r.userId, {
          notificationId: notifId,
          status: 'sent',
          sentAt: new Date(),
        });
        sent += 1;
      } catch (err) {
        await this.repo.updateRecipientDelivery(announcementId, r.userId, {
          status: 'failed',
          failedReason: err instanceof Error ? err.message : 'Unknown error',
        });
        failed += 1;
      }
    }

    await this.repo.updateAnnouncementStatus(announcementId, {
      status: 'completed',
      sentAt: new Date(),
      totalRecipients: audience.length,
      sentCount: sent,
      failedCount: failed,
    });
  }

  /** ID bo'yicha e'lonni olish */
  async getById(actor: RequestUser, id: string): Promise<AnnouncementItem> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }
    if (actor.role === 'teacher' && row.announcement.authorId !== actor.id) {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    const a = row.announcement;
    return {
      id: a.id,
      branchId: a.branchId,
      authorId: a.authorId,
      authorName: row.authorName,
      title: a.title,
      body: a.body,
      targetType: a.targetType,
      targetId: a.targetId,
      fileUrl: a.fileUrl,
      fileType: a.fileType,
      status: a.status,
      totalRecipients: a.totalRecipients,
      sentCount: a.sentCount,
      failedCount: a.failedCount,
      blockedCount: a.blockedCount,
      sentAt: a.sentAt ? a.sentAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    };
  }

  /** E'lonlar ro'yxati */
  async list(
    actor: RequestUser,
    query: AnnouncementListQuery,
  ): Promise<{ items: AnnouncementItem[] }> {
    if (actor.role === 'guardian') {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    const rows = await this.repo.listAnnouncements({
      branchId: DEFAULT_BRANCH_ID,
      targetType: query.targetType,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    const filtered =
      actor.role === 'teacher' ? rows.filter((r) => r.announcement.authorId === actor.id) : rows;

    return {
      items: filtered.map((r) => {
        const a = r.announcement;
        return {
          id: a.id,
          branchId: a.branchId,
          authorId: a.authorId,
          authorName: r.authorName,
          title: a.title,
          body: a.body,
          targetType: a.targetType,
          targetId: a.targetId,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
          status: a.status,
          totalRecipients: a.totalRecipients,
          sentCount: a.sentCount,
          failedCount: a.failedCount,
          blockedCount: a.blockedCount,
          sentAt: a.sentAt ? a.sentAt.toISOString() : null,
          createdAt: a.createdAt.toISOString(),
        };
      }),
    };
  }

  /** E'lon yetkazilish statistikasi (FR-RPT-5) */
  async getStats(actor: RequestUser, id: string): Promise<AnnouncementStats> {
    const ann = await this.getById(actor, id);
    const recipients = await this.repo.findRecipients(id);

    const queuedCount = recipients.filter((r) => r.status === 'queued').length;
    const sentCount = recipients.filter((r) => r.status === 'sent').length;
    const failedCount = recipients.filter((r) => r.status === 'failed').length;
    const blockedCount = recipients.filter((r) => r.status === 'blocked').length;

    const recipientItems: AnnouncementRecipientItem[] = recipients.map((r) => ({
      id: r.id,
      userId: r.userId,
      recipientName: r.recipientName,
      recipientPhone: r.recipientPhone,
      channel: r.channel,
      status: r.status,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      failedReason: r.failedReason,
    }));

    return {
      id: ann.id,
      title: ann.title,
      status: ann.status,
      totalRecipients: ann.totalRecipients,
      queuedCount,
      sentCount,
      failedCount,
      blockedCount,
      recipients: recipientItems,
    };
  }
}
