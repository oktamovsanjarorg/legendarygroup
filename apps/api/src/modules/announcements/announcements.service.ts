import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type AnnouncementItem,
  type AnnouncementListQuery,
  type AnnouncementPreviewQuery,
  type AnnouncementPreviewResponse,
  type AnnouncementRecipientItem,
  type AnnouncementStats,
  type AnnouncementTargetType,
  type CreateAnnouncementRequest,
  DEFAULT_BRANCH_ID,
  PDF_MIME,
} from '@lg/contracts';
import type { AnnouncementRecipientRow, AnnouncementRow, Database } from '@lg/db';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { DebtorsService } from '../billing/index.js';
import { FilesService } from '../files/index.js';
import { NotificationsService } from '../notifications/index.js';
import { OutboxService } from '../outbox/index.js';
import {
  type AnnouncementsRepository,
  type AudienceRecipient,
  AnnouncementsRepository as RepoToken,
} from './announcements.repository.js';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

/** Shu vaqt ichida takrorlangan aynan bir xil e'lon — ikki marta bosish (yangi e'lon emas). */
const DUPLICATE_WINDOW_MS = 2 * 60_000;

const countOf = (rows: AnnouncementRecipientRow[], s: AnnouncementRecipientRow['status']) =>
  rows.filter((r) => r.status === s).length;

const toItem = (
  a: AnnouncementRow,
  authorName: string,
  recipients: AnnouncementRecipientRow[],
): AnnouncementItem => ({
  id: a.id,
  branchId: a.branchId,
  authorId: a.authorId,
  authorName,
  title: a.title,
  body: a.body,
  targetType: a.targetType,
  targetId: a.targetId,
  fileId: a.fileId,
  fileType: a.fileType,
  status: a.status,
  totalRecipients: a.totalRecipients,
  sentCount: countOf(recipients, 'sent'),
  failedCount: countOf(recipients, 'failed'),
  blockedCount: countOf(recipients, 'blocked'),
  sentAt: a.sentAt ? a.sentAt.toISOString() : null,
  createdAt: a.createdAt.toISOString(),
});

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(RepoToken) private readonly repo: AnnouncementsRepository,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(DebtorsService) private readonly debtors: DebtorsService,
    @Inject(FilesService) private readonly files: FilesService,
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
      const allowed = await this.repo.isMainTeacher(actor.id, targetId, this.clock.today());
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
    const audience = await this.audience(query.targetType, query.targetId);

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

  private async audience(
    type: AnnouncementTargetType,
    id?: string | null,
  ): Promise<AudienceRecipient[]> {
    return this.repo.guardiansOf(await this.studentIds(type, id ?? null));
  }

  private async studentIds(type: AnnouncementTargetType, id: string | null): Promise<string[]> {
    if (type === 'all') return this.repo.activeStudentIds(DEFAULT_BRANCH_ID);
    if (type === 'debtors') return this.debtors.debtorStudentIds(DEFAULT_BRANCH_ID);
    if (!id)
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'targetId' });
    const by = type === 'group' ? { groupId: id } : { courseId: id };
    return this.repo.enrolledStudentIds(by, this.clock.today());
  }

  /** Faqat muallif yuklagan `announcement` fayli biriktiriladi. */
  private async fileTypeOf(actor: RequestUser, fileId: string | null | undefined) {
    if (!fileId) return null;
    const own = await this.files.ownership(fileId);
    if (own?.purpose !== 'announcement' || own.uploadedBy !== actor.id)
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'fileId' });
    return own.mime === PDF_MIME ? ('document' as const) : ('image' as const);
  }

  /**
   * E'lon, qabul qiluvchilar va `AnnouncementCreated` — bitta tranzaksiya; yuborish worker'da
   * (`AnnouncementDispatcher`): jarayon yarmida to'xtasa ham davom etadi, takror yuborilmaydi.
   */
  async createAndSend(
    actor: RequestUser,
    dto: CreateAnnouncementRequest,
  ): Promise<AnnouncementItem> {
    await this.assertActorScope(actor, dto.targetType, dto.targetId);
    const fileType = await this.fileTypeOf(actor, dto.fileId);
    const audience = await this.audience(dto.targetType, dto.targetId);
    const since = new Date(this.clock.now().getTime() - DUPLICATE_WINDOW_MS);
    const key = { ...dto, authorId: actor.id };
    const id = await this.db.transaction(async (tx) => {
      const sameId = await this.repo.findDuplicate(tx, key, since);
      if (sameId) return sameId;
      const ann = await this.repo.createAnnouncement(tx, {
        branchId: DEFAULT_BRANCH_ID,
        authorId: actor.id,
        title: dto.title,
        body: dto.body,
        targetType: dto.targetType,
        targetId: dto.targetId,
        fileId: dto.fileId,
        fileType,
        status: audience.length > 0 ? 'processing' : 'completed',
        totalRecipients: audience.length,
        sentAt: audience.length > 0 ? null : this.clock.now(),
      });
      await this.repo.insertRecipients(
        tx,
        audience.map((a) => ({
          announcementId: ann.id,
          userId: a.userId,
          recipientName: a.guardianName,
          recipientPhone: a.phone,
          status: 'queued' as const,
        })),
      );
      if (audience.length > 0)
        await this.outbox.publish('AnnouncementCreated', { announcementId: ann.id }, tx);
      return ann.id;
    });
    return this.getById(actor, id);
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
    return toItem(row.announcement, row.authorName, await this.liveRecipients(id));
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
      // Ustoz — faqat o'ziniki (sahifalashdan oldin, aks holda sahifa bo'sh chiqardi).
      authorId: actor.role === 'teacher' ? actor.id : undefined,
      limit: query.limit,
      offset: query.offset,
    });

    const recipients = await this.liveRecipients(...rows.map((r) => r.announcement.id));
    const of = (id: string) => recipients.filter((r) => r.announcementId === id);
    return {
      items: rows.map((r) => toItem(r.announcement, r.authorName, of(r.announcement.id))),
    };
  }

  /** Haqiqiy holat: navbatga qo'yilgandan keyin yetgan, bloklangan yoki yiqilgan bo'lishi mumkin. */
  private async liveRecipients(...ids: string[]): Promise<AnnouncementRecipientRow[]> {
    const stored = await this.repo.findRecipients(...ids);
    const live = await this.notificationsService.deliveryOf(
      stored.flatMap((r) => (r.notificationId ? [r.notificationId] : [])),
    );
    return stored.map((r) => {
      const d = r.notificationId ? live.get(r.notificationId) : undefined;
      return d
        ? { ...r, status: d.status, failedReason: d.failedReason, sentAt: d.sentAt ?? r.sentAt }
        : r;
    });
  }

  /** E'lon yetkazilish statistikasi (FR-RPT-5) */
  async getStats(actor: RequestUser, id: string): Promise<AnnouncementStats> {
    const ann = await this.getById(actor, id);
    const recipients = await this.liveRecipients(id);

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
      queuedCount: countOf(recipients, 'queued'),
      sentCount: ann.sentCount,
      failedCount: ann.failedCount,
      blockedCount: ann.blockedCount,
      recipients: recipientItems,
    };
  }
}
