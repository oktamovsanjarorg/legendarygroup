import type { PayrollItemKind } from '@lg/contracts';
import {
  type Database,
  type NewPayrollItemRow,
  type NewTeacherAdvanceRow,
  type NewTeacherContractRow,
  payrollItems,
  type PayrollItemRow,
  payrollRuns,
  type PayrollRunRow,
  teacherAdvances,
  type TeacherAdvanceRow,
  teacherContracts,
  type TeacherContractRow,
  type Transaction,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, lt, notInArray, or, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { periodDays } from './payroll-metrics.repository.js';

/** Generatsiya qayta yaratadigan qatorlar; bonus/jarima/tuzatish (BR-26) qo'lda — saqlanadi. */
export const AUTO_ITEM_KINDS: PayrollItemKind[] = ['fixed', 'percent', 'per_lesson', 'advance'];

export type PayrollItemWithName = PayrollItemRow & { teacherName: string };

@Injectable()
export class PayrollRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async createContract(data: NewTeacherContractRow): Promise<TeacherContractRow> {
    const [row] = await this.db.insert(teacherContracts).values(data).returning();
    if (!row) throw new Error('CONTRACT_CREATE_FAILED');
    return row;
  }

  async findActiveContracts(teacherId?: string): Promise<TeacherContractRow[]> {
    const query = this.db.select().from(teacherContracts);
    if (teacherId) return query.where(eq(teacherContracts.teacherId, teacherId));
    return query;
  }

  /** BR-23: shu oyning kamida bir kunida amalda bo'lgan shartnomalar (filial bo'yicha). */
  async findContractsForPeriod(branchId: string, period: string): Promise<TeacherContractRow[]> {
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

  async createAdvance(data: NewTeacherAdvanceRow): Promise<TeacherAdvanceRow> {
    const [row] = await this.db.insert(teacherAdvances).values(data).returning();
    if (!row) throw new Error('ADVANCE_CREATE_FAILED');
    return row;
  }

  /** BR-28: hali ushlanmagan yoki aynan shu hisobda ushlangan (qayta generatsiya) avanslar. */
  async findAdvancesForRun(
    teacherId: string,
    runId: string,
    period: string,
  ): Promise<TeacherAdvanceRow[]> {
    const { next } = periodDays(period);
    return this.db
      .select()
      .from(teacherAdvances)
      .where(
        and(
          eq(teacherAdvances.teacherId, teacherId),
          lt(teacherAdvances.givenAt, next),
          or(isNull(teacherAdvances.deductedInRunId), eq(teacherAdvances.deductedInRunId, runId)),
        ),
      );
  }

  async findPayrollRunById(id: string): Promise<PayrollRunRow | undefined> {
    const [row] = await this.db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
    return row;
  }

  async findPayrollRunByPeriod(
    branchId: string,
    period: string,
  ): Promise<PayrollRunRow | undefined> {
    const [row] = await this.db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.branchId, branchId), eq(payrollRuns.period, period)));
    return row;
  }

  async findPayrollItems(runId: string, db: Database | Transaction = this.db) {
    const rows: PayrollItemWithName[] = await db
      .select({
        id: payrollItems.id,
        runId: payrollItems.runId,
        teacherId: payrollItems.teacherId,
        kind: payrollItems.kind,
        amount: payrollItems.amount,
        details: payrollItems.details,
        note: payrollItems.note,
        createdAt: payrollItems.createdAt,
        teacherName: users.fullName,
      })
      .from(payrollItems)
      .innerJoin(users, eq(payrollItems.teacherId, users.id))
      .where(eq(payrollItems.runId, runId));
    return rows;
  }

  /** Qatorni tranzaksiyada, hisobni qulflab (FOR UPDATE) qo'shadi; DRAFT bo'lmasa — `null`. */
  async addItemToDraft(item: NewPayrollItemRow): Promise<PayrollRunRow | null> {
    return this.db.transaction(async (tx) => {
      const run = await this.lockRun(tx, item.runId);
      if (run?.status !== 'draft') return null;
      await tx.insert(payrollItems).values(item);
      return this.refreshTotal(tx, run.id);
    });
  }

  /**
   * DRAFT → APPROVED, qulf ostida: `validate` (masalan, manfiy net) xato tashlasa — o'zgarmaydi.
   * DRAFT bo'lmasa — `null` (parallel ikkinchi tasdiqlash ham shu yerga tushadi).
   */
  async approve(
    runId: string,
    actorId: string,
    validate: (items: PayrollItemWithName[]) => void,
  ): Promise<PayrollRunRow | null> {
    return this.db.transaction(async (tx) => {
      const run = await this.lockRun(tx, runId);
      if (run?.status !== 'draft') return null;
      validate(await this.findPayrollItems(runId, tx));
      const [row] = await tx
        .update(payrollRuns)
        .set({ status: 'approved', approvedBy: actorId, approvedAt: this.clock.now() })
        .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.status, 'draft')))
        .returning();
      return row ?? null;
    });
  }

  /** APPROVED → PAID (shartli UPDATE — atomar); o'tmasa `null`. */
  async markPaid(runId: string, actorId: string): Promise<PayrollRunRow | null> {
    const [row] = await this.db
      .update(payrollRuns)
      .set({ status: 'paid', paidBy: actorId, paidAt: this.clock.now() })
      .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.status, 'approved')))
      .returning();
    return row ?? null;
  }

  /**
   * Qoralamani yaratadi/yangilaydi: avtomatik qatorlar almashtiriladi, qo'lda kiritilganlari
   * qoladi; avans bog'lanishi sinxronlanadi; jami — DB'dagi qatorlardan. DRAFT emas — `null`.
   */
  async saveGeneratedRun(params: {
    runId: string;
    branchId: string;
    period: string;
    items: NewPayrollItemRow[];
    advanceIds: string[];
  }): Promise<PayrollRunRow | null> {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .insert(payrollRuns)
        .values({ id: params.runId, branchId: params.branchId, period: params.period })
        .onConflictDoUpdate({
          target: [payrollRuns.branchId, payrollRuns.period],
          set: { updatedAt: this.clock.now() },
          setWhere: eq(payrollRuns.status, 'draft'),
        })
        .returning();
      if (!run) return null;

      await tx
        .delete(payrollItems)
        .where(and(eq(payrollItems.runId, run.id), inArray(payrollItems.kind, AUTO_ITEM_KINDS)));
      if (params.items.length > 0) {
        await tx.insert(payrollItems).values(params.items.map((i) => ({ ...i, runId: run.id })));
      }
      await this.syncAdvances(tx, run.id, params.advanceIds);
      return this.refreshTotal(tx, run.id);
    });
  }

  private async syncAdvances(tx: Transaction, runId: string, ids: string[]): Promise<void> {
    const released = eq(teacherAdvances.deductedInRunId, runId);
    await tx
      .update(teacherAdvances)
      .set({ deductedInRunId: null })
      .where(ids.length > 0 ? and(released, notInArray(teacherAdvances.id, ids)) : released);
    if (ids.length > 0) {
      await tx
        .update(teacherAdvances)
        .set({ deductedInRunId: runId })
        .where(inArray(teacherAdvances.id, ids));
    }
  }

  private async lockRun(tx: Transaction, runId: string): Promise<PayrollRunRow | undefined> {
    const [run] = await tx
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.id, runId))
      .for('update');
    return run;
  }

  /** Jami = har ustoz net'ining musbat qismi yig'indisi (to'lanadigan summa). */
  private async refreshTotal(tx: Transaction, runId: string): Promise<PayrollRunRow> {
    const perTeacher = tx
      .select({ net: sql<string>`sum(${payrollItems.amount})`.as('net') })
      .from(payrollItems)
      .where(eq(payrollItems.runId, runId))
      .groupBy(payrollItems.teacherId)
      .as('per_teacher');
    const [sum] = await tx
      .select({ total: sql<string>`coalesce(sum(greatest(${perTeacher.net}, 0)), 0)::text` })
      .from(perTeacher);
    const [run] = await tx
      .update(payrollRuns)
      .set({ totalAmount: BigInt(sum?.total ?? '0'), updatedAt: this.clock.now() })
      .where(eq(payrollRuns.id, runId))
      .returning();
    if (!run) throw new Error('PAYROLL_RUN_NOT_FOUND');
    return run;
  }
}
