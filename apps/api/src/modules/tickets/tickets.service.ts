import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type CreateTicketMessageRequest,
  type CreateTicketRequest,
  DEFAULT_BRANCH_ID,
  type ListTicketsQuery,
  type TicketDetail,
  type TicketItem,
  type TicketMessageItem,
  type UpdateTicketRequest,
} from '@lg/contracts';
import { type Database, guardians, studentGuardians } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { NotificationsService } from '../notifications/index.js';
import { TicketsRepository } from './tickets.repository.js';

@Injectable()
export class TicketsService {
  constructor(
    @Inject(TicketsRepository) private readonly repo: TicketsRepository,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(DB_TOKEN) private readonly db: Database,
  ) {}

  private async isParentOf(guardianUserId: string, studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: studentGuardians.studentId })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(and(eq(guardians.userId, guardianUserId), eq(studentGuardians.studentId, studentId)));
    return Boolean(row);
  }

  /** Yangi ticket ochish (FR-RPT-7) */
  async createTicket(actor: RequestUser, dto: CreateTicketRequest): Promise<TicketDetail> {
    if (dto.studentId && actor.role === 'guardian') {
      const allowed = await this.isParentOf(actor.id, dto.studentId);
      if (!allowed) {
        throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
      }
    }

    const ticket = await this.repo.createTicket({
      branchId: DEFAULT_BRANCH_ID,
      authorId: actor.id,
      studentId: dto.studentId,
      subject: dto.subject,
      priority: dto.priority,
    });

    await this.repo.createMessage({
      ticketId: ticket.id,
      authorId: actor.id,
      text: dto.message,
    });

    return this.getTicket(actor, ticket.id);
  }

  /** Ticketga yangi xabar qo'shish (javob qaytarish) */
  async addMessage(
    actor: RequestUser,
    ticketId: string,
    dto: CreateTicketMessageRequest,
  ): Promise<TicketMessageItem> {
    const existing = await this.repo.findById(ticketId);
    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }

    if (actor.role === 'guardian' && existing.ticket.authorId !== actor.id) {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }

    const message = await this.repo.createMessage({
      ticketId,
      authorId: actor.id,
      text: dto.text,
      fileUrl: dto.fileUrl,
    });

    // Agar xodim javob bergan bo'lsa (author !== ticket author), ota-onaga bildirishnoma yuboriladi
    if (actor.id !== existing.ticket.authorId) {
      await this.notifyParentOnReply(existing.ticket.authorId, existing.ticket.subject, dto.text);
    }

    return {
      id: message.id,
      ticketId: message.ticketId,
      authorId: message.authorId,
      authorName: actor.id,
      authorRole: actor.role,
      text: message.text,
      fileUrl: message.fileUrl,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private async notifyParentOnReply(
    parentUserId: string,
    subject: string,
    replyText: string,
  ): Promise<void> {
    try {
      await this.notifications.notify({
        userId: parentUserId,
        type: 'announcement',
        dedupeKey: `ticket-reply-${Date.now()}`,
        payload: {
          title: `Murojaatingizga javob: ${subject}`,
          message: replyText,
        },
      });
    } catch {
      // Bildirishnoma xatosi ticket saqlanishiga to'sqinlik qilmasligi kerak
    }
  }

  /** Ticket holatini yangilash (Admin / Director) */
  async updateTicket(
    actor: RequestUser,
    ticketId: string,
    dto: UpdateTicketRequest,
  ): Promise<TicketItem> {
    if (actor.role === 'guardian') {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    const updated = await this.repo.updateTicket(ticketId, dto);
    if (!updated) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }
    return this.getTicket(actor, ticketId);
  }

  /** Ticket va uning barcha xabarlarini olish */
  async getTicket(actor: RequestUser, ticketId: string): Promise<TicketDetail> {
    const row = await this.repo.findById(ticketId);
    if (!row) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }

    if (actor.role === 'guardian' && row.ticket.authorId !== actor.id) {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }

    const messages = await this.repo.findMessages(ticketId);
    const t = row.ticket;

    return {
      id: t.id,
      branchId: t.branchId,
      authorId: t.authorId,
      authorName: row.authorName,
      authorPhone: row.authorPhone,
      studentId: t.studentId,
      studentName: row.studentName,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTo,
      assignedToName: row.assignedToName,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messages: messages.map((m) => ({
        id: m.message.id,
        ticketId: m.message.ticketId,
        authorId: m.message.authorId,
        authorName: m.authorName,
        authorRole: 'user',
        text: m.message.text,
        fileUrl: m.message.fileUrl,
        createdAt: m.message.createdAt.toISOString(),
      })),
    };
  }

  /** Ticketlar ro'yxati */
  async listTickets(actor: RequestUser, query: ListTicketsQuery): Promise<{ items: TicketItem[] }> {
    const authorId = actor.role === 'guardian' ? actor.id : undefined;

    const rows = await this.repo.listTickets({
      branchId: DEFAULT_BRANCH_ID,
      authorId,
      status: query.status,
      priority: query.priority,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: rows.map((r) => {
        const t = r.ticket;
        return {
          id: t.id,
          branchId: t.branchId,
          authorId: t.authorId,
          authorName: r.authorName,
          authorPhone: r.authorPhone,
          studentId: t.studentId,
          studentName: r.studentName,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          assignedTo: t.assignedTo,
          assignedToName: r.assignedToName,
          lastMessageAt: t.lastMessageAt.toISOString(),
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        };
      }),
    };
  }
}
