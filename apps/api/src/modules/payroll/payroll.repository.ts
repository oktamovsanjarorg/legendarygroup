import type { PayrollItemKind } from '@lg/contracts';
import {
  type Database,
  type NewPayrollItemRow,
  payrollItems,
  type PayrollItemRow,
  payrollRuns,
  type PayrollRunRow,
  teacherAdvances,
  type Transaction,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

/** Generatsiya qayta yaratadigan qatorlar; bonus/jarima/tuzatish (BR-26) qo'lda — saqlanadi. */
export const AUTO_ITEM_KINDS: PayrollItemKind[] = ['fixed', 'percent', 'per_lesson', 'advance'];

export type PayrollItemWithName = PayrollItemRow & { teacherName: string };

@Injectable()
export class PayrollRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

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

  /** Ustoz qatori bor hisoblar va uning yig'indisi (yangisi birinchi). */
  async findTeacherRuns(teacherId: string) {
    return this.db
      .select({
        runId: payrollRuns.id,
        period: payrollRuns.period,
        status: payrollRuns.status,
        totalNet: sql<string>`sum(${payrollItems.amount})::text`,
      })
      .from(payrollItems)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payrollItems.runId))
      .where(eq(payrollItems.teacherId, teacherId))
      .groupBy(payrollRuns.id)
      .orderBy(desc(payrollRuns.period));
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

  /** Qo'lda kiritilgan bonus/jarimani qoralamadan olib tashlash; DRAFT emas yoki qator yo'q — `null`. */
  async removeManualItem(runId: string, itemId: string): Promise<PayrollItemRow | null> {
    return this.db.transaction(async (tx) => {
      const run = await this.lockRun(tx, runId);
      if (run?.status !== 'draft') return null;
      const [item] = await tx
        .delete(payrollItems)
        .where(
          and(
            eq(payrollItems.id, itemId),
            eq(payrollItems.runId, runId),
            notInArray(payrollItems.kind, AUTO_ITEM_KINDS),
          ),
        )
        .returning();
      if (item) await this.refreshTotal(tx, run.id);
      return item ?? null;
    });
  }

  /** Qo'lda kiritilgan qatorlar yig'indisi (bonus − jarima) — avans ushlash chegarasi uchun. */
  async manualNet(runId: string, teacherId: string): Promise<bigint> {
    const [row] = await this.db
      .select({ net: sql<string>`coalesce(sum(${payrollItems.amount}), 0)::text` })
      .from(payrollItems)
      .where(
        and(
          eq(payrollItems.runId, runId),
          eq(payrollItems.teacherId, teacherId),
          notInArray(payrollItems.kind, AUTO_ITEM_KINDS),
        ),
      );
    return BigInt(row?.net ?? '0');
  }

  /**
   * DRAFT → APPROVED, qulf ostida: `validate` (masalan, manfiy net) xato tashlasa — o'zgarmaydi.
   * DRAFT bo'lmasa — `null` (parallel ikkinchi tasdiqlash ham shu yerga tushadi).
   */
  async approve(
    runId: string,
    actorId: string,
    validate: (run: PayrollRunRow, items: PayrollItemWithName[]) => void,
  ): Promise<PayrollRunRow | null> {
    return this.db.transaction(async (tx) => {
      const run = await this.lockRun(tx, runId);
      if (run?.status !== 'draft') return null;
      validate(run, await this.findPayrollItems(runId, tx));
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
        .values({
          id: params.runId,
          branchId: params.branchId,
          period: params.period,
          generatedAt: this.clock.now(),
        })
        .onConflictDoUpdate({
          target: [payrollRuns.branchId, payrollRuns.period],
          set: { updatedAt: this.clock.now(), generatedAt: this.clock.now() },
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
