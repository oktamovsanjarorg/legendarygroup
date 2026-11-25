import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type CreateTicketMessageRequest,
  type CreateTicketRequest,
  DEFAULT_BRANCH_ID,
  type ListTicketsQuery,
  type TicketDetail,
  type TicketItem,
  type TicketMessageItem,
  type TicketStatus,
  type UpdateTicketRequest,
} from '@lg/contracts';
import { type Database, guardians, studentGuardians, type TicketMessageRow } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { OutboxService } from '../outbox/index.js';
import { PermissionsService, StaffDirectoryService } from '../rbac/index.js';
import { TicketsRepository } from './tickets.repository.js';

/** `undefined` — holat o'zgarmaydi. */
function nextStatus(status: TicketStatus, byAuthor: boolean): TicketStatus | undefined {
  if (byAuthor) return status === 'resolved' || status === 'closed' ? 'open' : undefined;
  if (status === 'closed') throw new AppException(HttpStatus.CONFLICT, 'TICKET_CLOSED');
  return status === 'open' ? 'in_progress' : undefined;
}

const toMessage = (
  m: TicketMessageRow,
  authorName: string,
  ticketAuthorId: string,
): TicketMessageItem => ({
  id: m.id,
  ticketId: m.ticketId,
  authorId: m.authorId,
  authorName,
  authorRole: m.authorId === ticketAuthorId ? 'author' : 'staff',
  text: m.text,
  fileUrl: m.fileUrl,
  createdAt: m.createdAt.toISOString(),
});

@Injectable()
export class TicketsService {
  constructor(
    @Inject(TicketsRepository) private readonly repo: TicketsRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(StaffDirectoryService) private readonly staff: StaffDirectoryService,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  /**
   * Scope: `ticket.handle` — hamma murojaatlar; `ticket.create` — faqat o'zi ochganlari;
   * ikkalasi ham yo'q (masalan, ustoz) — 403. Rol emas, ruxsat (override hisobga olinadi).
   */
  private async scopeOf(actor: RequestUser): Promise<'all' | 'own'> {
    const perms = await this.permissions.forUser(actor.id, actor.role, actor.pv);
    if (perms.has('ticket.handle')) return 'all';
    if (perms.has('ticket.create')) return 'own';
    throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  /** Begona murojaat — 404 (mavjudligi oshkor qilinmaydi). */
  private async assertVisible(actor: RequestUser, authorId: string): Promise<void> {
    if ((await this.scopeOf(actor)) === 'own' && authorId !== actor.id)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }

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
    if (dto.studentId && (await this.scopeOf(actor)) === 'own') {
      const allowed = await this.isParentOf(actor.id, dto.studentId);
      if (!allowed) {
        throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
      }
    }

    const ticketId = await this.repo.transaction(async (tx) => {
      const ticket = await this.repo.createTicket(tx, {
        branchId: DEFAULT_BRANCH_ID,
        authorId: actor.id,
        studentId: dto.studentId,
        subject: dto.subject,
        priority: dto.priority,
      });
      const message = await this.repo.createMessage(tx, {
        ticketId: ticket.id,
        authorId: actor.id,
        text: dto.message,
      });
      await this.outbox.publish(
        'TicketMessageCreated',
        { ticketId: ticket.id, messageId: message.id },
        tx,
      );
      return ticket.id;
    });

    return this.getTicket(actor, ticketId);
  }

  /**
   * Xabar (T-138): xodim javobi ochiq murojaatni «koʻrilmoqda»ga oʻtkazadi, egasining xabari hal
   * boʻlganini qayta ochadi; yopilganiga xodim yozmaydi. Xabarnoma — `TicketMessageCreated`.
   */
  async addMessage(
    actor: RequestUser,
    ticketId: string,
    dto: CreateTicketMessageRequest,
  ): Promise<TicketMessageItem> {
    const message = await this.repo.transaction(async (tx) => {
      const ticket = await this.repo.lockTicket(tx, ticketId);
      if (!ticket) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      await this.assertVisible(actor, ticket.authorId);
      const row = await this.repo.createMessage(
        tx,
        { ticketId, authorId: actor.id, text: dto.text, fileUrl: dto.fileUrl },
        nextStatus(ticket.status, actor.id === ticket.authorId),
      );
      await this.outbox.publish('TicketMessageCreated', { ticketId, messageId: row.id }, tx);
      return row;
    });
    const row = await this.repo.messageWithTicket(message.id);
    if (!row) throw new Error('murojaat xabari topilmadi');
    return toMessage(row.message, row.authorName, row.ticket.authorId);
  }

  /** Ticket holatini yangilash (Admin / Director) */
  async updateTicket(
    actor: RequestUser,
    ticketId: string,
    dto: UpdateTicketRequest,
  ): Promise<TicketItem> {
    if (dto.assignedTo && !(await this.staff.isActiveManager(dto.assignedTo)))
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'assignedTo' });
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

    await this.assertVisible(actor, row.ticket.authorId);

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
      messages: messages.map((m) => toMessage(m.message, m.authorName, t.authorId)),
    };
  }

  /** Ticketlar ro'yxati */
  async listTickets(actor: RequestUser, query: ListTicketsQuery): Promise<{ items: TicketItem[] }> {
    const authorId = (await this.scopeOf(actor)) === 'own' ? actor.id : undefined;

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
