import { Inject, Injectable } from '@nestjs/common';
import type { TicketPriority, TicketStatus } from '@lg/contracts';
import {
  type Database,
  students,
  ticketMessages,
  type TicketMessageRow,
  tickets,
  users,
} from '@lg/db';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';

export interface CreateTicketRepoInput {
  branchId: string;
  authorId: string;
  studentId?: string | null;
  subject: string;
  priority?: TicketPriority;
}

export interface CreateMessageRepoInput {
  ticketId: string;
  authorId: string;
  text: string;
  fileUrl?: string | null;
}

@Injectable()
export class TicketsRepository {
  private readonly assigneeUser = alias(users, 'assignee_user');

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /** Yangi ticket yaratish */
  async createTicket(input: CreateTicketRepoInput) {
    const [row] = await this.db
      .insert(tickets)
      .values({
        branchId: input.branchId,
        authorId: input.authorId,
        studentId: input.studentId ?? null,
        subject: input.subject,
        priority: input.priority ?? 'normal',
        status: 'open',
      })
      .returning();
    if (!row) throw new Error('Ticket not created');
    return row;
  }

  /** Ticketga yangi xabar qo'shish */
  async createMessage(input: CreateMessageRepoInput): Promise<TicketMessageRow> {
    const [row] = await this.db
      .insert(ticketMessages)
      .values({
        ticketId: input.ticketId,
        authorId: input.authorId,
        text: input.text,
        fileUrl: input.fileUrl ?? null,
      })
      .returning();
    if (!row) throw new Error('Message not created');

    await this.db
      .update(tickets)
      .set({
        lastMessageAt: this.clock.now(),
        updatedAt: this.clock.now(),
      })
      .where(eq(tickets.id, input.ticketId));

    return row;
  }

  /** ID bo'yicha ticketni topish */
  async findById(id: string) {
    const [row] = await this.db
      .select({
        ticket: tickets,
        authorName: users.fullName,
        authorPhone: users.phone,
        studentName: students.fullName,
        assignedToName: this.assigneeUser.fullName,
      })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.authorId))
      .leftJoin(students, eq(students.id, tickets.studentId))
      .leftJoin(this.assigneeUser, eq(this.assigneeUser.id, tickets.assignedTo))
      .where(eq(tickets.id, id));

    return row ?? null;
  }

  /** Ticket xabarlari ro'yxatini olish */
  async findMessages(ticketId: string) {
    const rows = await this.db
      .select({
        message: ticketMessages,
        authorName: users.fullName,
      })
      .from(ticketMessages)
      .innerJoin(users, eq(users.id, ticketMessages.authorId))
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.createdAt);

    return rows;
  }

  /** Ticketlar ro'yxati */
  async listTickets(params: {
    branchId: string;
    authorId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    limit: number;
    offset: number;
  }) {
    const conditions = [eq(tickets.branchId, params.branchId)];
    if (params.authorId) conditions.push(eq(tickets.authorId, params.authorId));
    if (params.status) conditions.push(eq(tickets.status, params.status));
    if (params.priority) conditions.push(eq(tickets.priority, params.priority));

    const rows = await this.db
      .select({
        ticket: tickets,
        authorName: users.fullName,
        authorPhone: users.phone,
        studentName: students.fullName,
        assignedToName: this.assigneeUser.fullName,
      })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.authorId))
      .leftJoin(students, eq(students.id, tickets.studentId))
      .leftJoin(this.assigneeUser, eq(this.assigneeUser.id, tickets.assignedTo))
      .where(and(...conditions))
      .orderBy(desc(tickets.lastMessageAt))
      .limit(params.limit)
      .offset(params.offset);

    return rows;
  }

  /** Ticket holatini yangilash */
  async updateTicket(
    id: string,
    data: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedTo?: string | null;
    },
  ) {
    const [row] = await this.db
      .update(tickets)
      .set({
        ...data,
        updatedAt: this.clock.now(),
      })
      .where(eq(tickets.id, id))
      .returning();
    return row;
  }
}
