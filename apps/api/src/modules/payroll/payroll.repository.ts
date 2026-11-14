import {
  type Database,
  groupTeachers,
  lessons,
  type NewPayrollItemRow,
  type NewPayrollRunRow,
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
  users,
} from '@lg/db';
import type { TeacherLessonMetrics } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

@Injectable()
export class PayrollRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async createContract(data: NewTeacherContractRow): Promise<TeacherContractRow> {
    const [row] = await this.db.insert(teacherContracts).values(data).returning();
    if (!row) throw new Error('CONTRACT_CREATE_FAILED');
    return row;
  }

  async findActiveContracts(teacherId?: string): Promise<TeacherContractRow[]> {
    const query = this.db.select().from(teacherContracts);
    if (teacherId) {
      return query.where(eq(teacherContracts.teacherId, teacherId));
    }
    return query;
  }

  async findContractById(id: string): Promise<TeacherContractRow | undefined> {
    const [row] = await this.db.select().from(teacherContracts).where(eq(teacherContracts.id, id));
    return row;
  }

  async createAdvance(data: NewTeacherAdvanceRow): Promise<TeacherAdvanceRow> {
    const [row] = await this.db.insert(teacherAdvances).values(data).returning();
    if (!row) throw new Error('ADVANCE_CREATE_FAILED');
    return row;
  }

  async findUndeductedAdvances(teacherId: string): Promise<TeacherAdvanceRow[]> {
    return this.db
      .select()
      .from(teacherAdvances)
      .where(
        and(eq(teacherAdvances.teacherId, teacherId), isNull(teacherAdvances.deductedInRunId)),
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

  async updatePayrollRun(
    id: string,
    patch: Partial<NewPayrollRunRow>,
  ): Promise<PayrollRunRow | undefined> {
    const [row] = await this.db
      .update(payrollRuns)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(payrollRuns.id, id))
      .returning();
    return row;
  }

  async findPayrollItems(runId: string): Promise<Array<PayrollItemRow & { teacherName: string }>> {
    const rows = await this.db
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

  async addPayrollItem(data: NewPayrollItemRow): Promise<PayrollItemRow> {
    const [row] = await this.db.insert(payrollItems).values(data).returning();
    if (!row) throw new Error('PAYROLL_ITEM_FAILED');
    return row;
  }

  async calculateLessonMetrics(teacherId: string, period: string): Promise<TeacherLessonMetrics> {
    // Ustozning guruhlaridagi darslar
    const myGroupLessons = await this.db
      .select({
        id: lessons.id,
        teacherId: lessons.teacherId,
        isSubstitute: lessons.isSubstitute,
      })
      .from(lessons)
      .innerJoin(groupTeachers, eq(groupTeachers.groupId, lessons.groupId))
      .where(
        and(
          eq(groupTeachers.teacherId, teacherId),
          sql`to_char(${lessons.date}, 'YYYY-MM') = ${period}`,
          sql`${lessons.status} <> 'cancelled'`,
        ),
      );

    const totalScheduledLessons = myGroupLessons.length;
    // Mening guruhimda boshqalar o'tgan o'rinbosar darslari
    const substituteLessonsTaughtByOthers = myGroupLessons.filter(
      (l) => l.teacherId !== teacherId,
    ).length;

    // Men o'zim o'rinbosar sifatida o'tgan darslar
    const subLessonsTaughtByMe = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .where(
        and(
          eq(lessons.teacherId, teacherId),
          eq(lessons.isSubstitute, true),
          sql`to_char(${lessons.date}, 'YYYY-MM') = ${period}`,
          sql`${lessons.status} <> 'cancelled'`,
        ),
      );

    return {
      totalScheduledLessons,
      substituteLessonsTaughtByOthers,
      substituteLessonsTaughtAsSub: subLessonsTaughtByMe.length,
    };
  }

  async calculateTeacherCollectedAmount(teacherId: string, period: string): Promise<bigint> {
    // BR-24: Ustoz guruhlariga shu oyda taqsimlangan to'lovlar yig'indisi
    const res = await this.db.execute<{ total: string | null }>(
      sql`
        SELECT COALESCE(SUM(pa.amount), 0) as total
        FROM payment_allocations pa
        INNER JOIN invoice_lines il ON il.id = pa.invoice_line_id
        INNER JOIN enrollments e ON e.id = il.enrollment_id
        INNER JOIN group_teachers gt ON gt.group_id = e.group_id
        INNER JOIN payments p ON p.id = pa.payment_id
        WHERE gt.teacher_id = ${teacherId}
          AND to_char(p.paid_at, 'YYYY-MM') = ${period}
      `,
    );

    const val = (res as unknown as Array<{ total: string | null }>)[0]?.total ?? '0';
    return BigInt(val);
  }

  async saveGeneratedPayrollRunTx(params: {
    runId: string;
    branchId: string;
    period: string;
    items: NewPayrollItemRow[];
    advancesToDeduct: string[];
    totalAmount: bigint;
  }): Promise<PayrollRunRow> {
    return this.db.transaction(async (tx) => {
      // 1) Qoralama run yaratish yoki yangilash
      const [run] = await tx
        .insert(payrollRuns)
        .values({
          id: params.runId,
          branchId: params.branchId,
          period: params.period,
          status: 'draft',
          totalAmount: params.totalAmount,
        })
        .onConflictDoUpdate({
          target: [payrollRuns.branchId, payrollRuns.period],
          set: {
            totalAmount: params.totalAmount,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!run) throw new Error('RUN_SAVE_FAILED');

      // 2) Eski draft itemlarni tozalash
      await tx.delete(payrollItems).where(eq(payrollItems.runId, run.id));

      // 3) Yangi itemlarni kiritish
      if (params.items.length > 0) {
        await tx.insert(payrollItems).values(params.items);
      }

      // 4) Ushlangan avanslarni runId ga bog'lash
      for (const advId of params.advancesToDeduct) {
        await tx
          .update(teacherAdvances)
          .set({ deductedInRunId: run.id })
          .where(eq(teacherAdvances.id, advId));
      }

      return run;
    });
  }
}
