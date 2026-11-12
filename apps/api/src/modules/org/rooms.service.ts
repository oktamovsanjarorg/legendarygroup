import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Room, CreateRoomRequest, OrgListFilter, UpdateRoomRequest } from '@lg/contracts';
import { rooms, type RoomRow, type Database, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { changedFields, ROOM_AUDIT_FIELDS, toRoom } from './org.serializer.js';
import {
  archivedFilter,
  type ArchiveVerb,
  assertArchiveTransition,
  withNameConflict,
} from './org.shared.js';

type CreateInput = z.output<typeof CreateRoomRequest>;

const NAME_UQ = 'rooms_branch_name_active_uq';

/** Xonalar (T-102, FR-ORG-2): CRUD, arxivlash. Har yozish — audit (before/after) bilan. */
@Injectable()
export class RoomsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(filter: OrgListFilter): Promise<Room[]> {
    const rows = await this.db
      .select()
      .from(rooms)
      .where(archivedFilter(rooms.archivedAt, filter))
      .orderBy(asc(rooms.name), asc(rooms.id));
    return rows.map(toRoom);
  }

  async get(id: string): Promise<Room> {
    const [row] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return toRoom(row);
  }

  async create(ctx: AuditContext, input: CreateInput): Promise<Room> {
    return withNameConflict(NAME_UQ, 'ROOM_NAME_TAKEN', () =>
      this.db.transaction(async (tx) => {
        const [row] = await tx.insert(rooms).values(input).returning();
        if (!row) throw new Error('xona yaratilmadi');
        const room = toRoom(row);
        await this.audit.record(
          ctx,
          { action: 'room.create', entity: 'room', entityId: row.id, after: room },
          tx,
        );
        return room;
      }),
    );
  }

  async update(ctx: AuditContext, id: string, patch: UpdateRoomRequest): Promise<Room> {
    return withNameConflict(NAME_UQ, 'ROOM_NAME_TAKEN', () =>
      this.db.transaction(async (tx) => {
        const current = await this.lock(tx, id);
        if (current.archivedAt) throw new AppException(HttpStatus.CONFLICT, 'ARCHIVED_READ_ONLY');
        const [row] = await tx.update(rooms).set(patch).where(eq(rooms.id, id)).returning();
        return this.recordChange(tx, { ctx, action: 'room.update', before: current, after: row });
      }),
    );
  }

  /** Arxivlash / arxivdan chiqarish. Kelajakdagi darslari bor xonani arxivlash taqig'i — T-103/T-104. */
  async setArchived(ctx: AuditContext, id: string, verb: ArchiveVerb): Promise<Room> {
    return withNameConflict(NAME_UQ, 'ROOM_NAME_TAKEN', () =>
      this.db.transaction(async (tx) => {
        const current = await this.lock(tx, id);
        assertArchiveTransition(current.archivedAt, verb);
        const archivedAt = verb === 'archive' ? this.clock.now() : null;
        const [row] = await tx
          .update(rooms)
          .set({ archivedAt })
          .where(eq(rooms.id, id))
          .returning();
        return this.recordChange(tx, { ctx, action: `room.${verb}`, before: current, after: row });
      }),
    );
  }

  private async lock(tx: Transaction, id: string): Promise<RoomRow> {
    const [row] = await tx.select().from(rooms).where(eq(rooms.id, id)).for('update');
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return row;
  }

  private async recordChange(
    tx: Transaction,
    c: { ctx: AuditContext; action: string; before: RoomRow; after: RoomRow | undefined },
  ): Promise<Room> {
    if (!c.after) throw new Error('xona yangilanmadi');
    const result = toRoom(c.after);
    const diff = changedFields(toRoom(c.before), result, ROOM_AUDIT_FIELDS);
    await this.audit.record(
      c.ctx,
      { action: c.action, entity: 'room', entityId: c.after.id, ...diff },
      tx,
    );
    return result;
  }
}
