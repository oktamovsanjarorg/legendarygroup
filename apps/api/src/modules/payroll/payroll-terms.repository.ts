import type { RoleCode } from '@lg/contracts';
import {
  type Database,
  groups,
  type NewTeacherAdvanceRow,
  type NewTeacherContractRow,
  payrollItems,
  payrollRuns,
  roles,
  teacherAdvances,
  type TeacherAdvanceRow,
  teacherContracts,
  type TeacherContractRow,
  type Transaction,
  userRoles,
  users,
} from '@lg/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { periodDays } from './payroll-metrics.repository.js';

const STAFF: RoleCode[] = ['teacher', 'admin', 'director'];

export interface OutstandingAdvance extends TeacherAdvanceRow {
  /** Boshqa hisoblarda allaqachon ushlangan qismi (BR-28, Q-104). */
  withheld: bigint;
}

/** Shartnoma va avanslar (BR-23, BR-28). */
@Injectable()
export class PayrollTermsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(run);
  }

  /** Faol xodim (ustoz, admin, director) — ota-ona/o'quvchiga oylik yo'q. */
  async isStaff(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.id, userId), eq(users.status, 'active'), inArray(roles.code, STAFF)))
      .limit(1);
    return row !== undefined;
  }

  /** Oylik yozilishi mumkin bo'lgan faol xodimlar. */
  async staffOptions() {
    return this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        roles: sql<RoleCode[]>`array_agg(${roles.code} order by ${roles.code})`,
      })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.status, 'active'), inArray(roles.code, STAFF)))
      .groupBy(users.id)
      .orderBy(users.fullName);
  }

  async contracts(teacherId?: string) {
    return this.db
      .select({ c: teacherContracts, teacherName: users.fullName, groupName: groups.name })
      .from(teacherContracts)
      .innerJoin(users, eq(users.id, teacherContracts.teacherId))
      .leftJoin(groups, eq(groups.id, teacherContracts.groupId))
      .where(teacherId ? eq(teacherContracts.teacherId, teacherId) : undefined)
      .orderBy(users.fullName, desc(teacherContracts.validFrom));
  }

  /** Shu ustozning shu doiradagi (guruh yoki umumiy) shartnomalari — qulf bilan. */
  async sameScope(tx: Transaction, teacherId: string, groupId: string | null) {
    return tx
      .select()
      .from(teacherContracts)
      .where(
        and(
          eq(teacherContracts.teacherId, teacherId),
          groupId ? eq(teacherContracts.groupId, groupId) : isNull(teacherContracts.groupId),
        ),
      )
      .for('update');
  }

  async insertContract(tx: Transaction, data: NewTeacherContractRow): Promise<TeacherContractRow> {
    const [row] = await tx.insert(teacherContracts).values(data).returning();
    if (!row) throw new Error('CONTRACT_CREATE_FAILED');
    return row;
  }

  async lockContract(tx: Transaction, id: string): Promise<TeacherContractRow | undefined> {
    const [row] = await tx
      .select()
      .from(teacherContracts)
      .where(eq(teacherContracts.id, id))
      .for('update');
    return row;
  }

  async setContractEnd(tx: Transaction, id: string, validTo: string): Promise<TeacherContractRow> {
    const [row] = await tx
      .update(teacherContracts)
      .set({ validTo })
      .where(eq(teacherContracts.id, id))
      .returning();
    if (!row) throw new Error('CONTRACT_UPDATE_FAILED');
    return row;
  }

  async deleteContract(tx: Transaction, id: string): Promise<void> {
    await tx.delete(teacherContracts).where(eq(teacherContracts.id, id));
  }

  /** Shart o'zgardi — qoralamalar qayta hisoblanmaguncha tasdiqlanmaydi (Q-104). */
  async invalidateDrafts(tx: Transaction): Promise<void> {
    await tx.update(payrollRuns).set({ generatedAt: null }).where(eq(payrollRuns.status, 'draft'));
  }

  /** Tasdiqlangan hisobda ishlatilganmi (`details` dagi kalit bo'yicha). */
  async usedInApproved(
    tx: Transaction,
    key: 'contractId' | 'advanceId',
    id: string,
  ): Promise<boolean> {
    const [row] = await tx
      .select({ id: payrollItems.id })
      .from(payrollItems)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payrollItems.runId))
      .where(and(ne(payrollRuns.status, 'draft'), sql`${payrollItems.details}->>${key} = ${id}`))
      .limit(1);
    return row !== undefined;
  }

  /** BR-23: shu oyning kamida bir kunida amalda bo'lgan shartnomalar (filial bo'yicha). */
  async contractsForPeriod(branchId: string, period: string): Promise<TeacherContractRow[]> {
    const { first, next } = periodDays(period);
    return this.db
      .select()
      .from(teacherContracts)
      .where(
        and(
          eq(teacherContracts.branchId, branchId),
          lt(teacherContracts.validFrom, next),
          or(isNull(teacherContracts.validTo), gte(teacherContracts.validTo, first)),
        ),
      );
  }

  async insertAdvance(tx: Transaction, data: NewTeacherAdvanceRow): Promise<TeacherAdvanceRow> {
    const [row] = await tx.insert(teacherAdvances).values(data).returning();
    if (!row) throw new Error('ADVANCE_CREATE_FAILED');
    return row;
  }

  async advances(limit: number) {
    return this.db
      .select({
        a: teacherAdvances,
        teacherName: users.fullName,
        withheld: this.withheldSql(),
      })
      .from(teacherAdvances)
      .innerJoin(users, eq(users.id, teacherAdvances.teacherId))
      .orderBy(desc(teacherAdvances.givenAt), desc(teacherAdvances.id))
      .limit(limit);
  }

  async lockAdvance(tx: Transaction, id: string): Promise<TeacherAdvanceRow | undefined> {
    const [row] = await tx
      .select()
      .from(teacherAdvances)
      .where(eq(teacherAdvances.id, id))
      .for('update');
    return row;
  }

  async deleteAdvance(tx: Transaction, id: string): Promise<void> {
    await tx.delete(teacherAdvances).where(eq(teacherAdvances.id, id));
  }

  /** BR-28: oy oxirigacha berilgan, hali to'liq ushlanmagan (yoki shu hisobda ushlangan) avanslar. */
  async outstandingAdvances(
    branchId: string,
    runId: string,
    period: string,
  ): Promise<OutstandingAdvance[]> {
    const { next } = periodDays(period);
    const rows = await this.db
      .select({ a: teacherAdvances, withheld: this.withheldSql(runId) })
      .from(teacherAdvances)
      .where(
        and(
          eq(teacherAdvances.branchId, branchId),
          lt(teacherAdvances.givenAt, next),
          or(isNull(teacherAdvances.deductedInRunId), eq(teacherAdvances.deductedInRunId, runId)),
        ),
      )
      .orderBy(teacherAdvances.givenAt, teacherAdvances.id);
    return rows.map((r) => ({ ...r.a, withheld: BigInt(r.withheld) }));
  }

  /** Hisoblarda ushlangan qism (`exceptRun` — qayta hisoblanayotgan qoralama). */
  private withheldSql(exceptRun?: string) {
    return sql<string>`coalesce((select -sum(i.amount) from payroll_items i
      where i.kind = 'advance' and i.details->>'advanceId' = teacher_advances.id::text
        ${exceptRun ? sql`and i.run_id <> ${exceptRun}` : sql``}), 0)::text`;
  }
}
