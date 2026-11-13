import type {
  AddPayrollAdjustmentRequest,
  CreateTeacherAdvanceRequest,
  CreateTeacherContractRequest,
  PayrollRunDetail,
  TeacherContract,
} from '@lg/contracts';
import type { NewPayrollItemRow, TeacherContractRow } from '@lg/db';
import {
  calculateFixedSalary,
  calculateNetSalary,
  calculatePercentSalary,
  calculateSubstituteSalary,
} from '@lg/domain';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import type { RequestUser } from '../auth/index.js';
import { buildPayrollRunDetail, mapContractRow } from './payroll.mappers.js';
import { PayrollRepository } from './payroll.repository.js';

@Injectable()
export class PayrollService {
  constructor(@Inject(PayrollRepository) private readonly repo: PayrollRepository) {}

  async createContract(
    actor: RequestUser,
    branchId: string,
    req: CreateTeacherContractRequest,
  ): Promise<TeacherContract> {
    const row = await this.repo.createContract({
      branchId,
      teacherId: req.teacherId,
      groupId: req.groupId ?? null,
      type: req.type,
      fixedAmount: BigInt(req.fixedAmount),
      percentBp: req.percentBp,
      perLessonRate: BigInt(req.perLessonRate),
      base: req.base,
      validFrom: req.validFrom,
      validTo: req.validTo ?? null,
    });
    return mapContractRow(row);
  }

  async listContracts(_actor: RequestUser, teacherId?: string): Promise<TeacherContract[]> {
    const rows = await this.repo.findActiveContracts(teacherId);
    return rows.map(mapContractRow);
  }

  async createAdvance(
    actor: RequestUser,
    branchId: string,
    req: CreateTeacherAdvanceRequest,
  ): Promise<{ id: string }> {
    const row = await this.repo.createAdvance({
      branchId,
      teacherId: req.teacherId,
      amount: BigInt(req.amount),
      givenAt: req.givenAt,
      note: req.note ?? null,
      createdBy: actor.id,
    });
    return { id: row.id };
  }

  async generatePayrollRun(
    actor: RequestUser,
    branchId: string,
    period: string,
  ): Promise<PayrollRunDetail> {
    const existing = await this.repo.findPayrollRunByPeriod(branchId, period);
    if (existing && existing.status !== 'draft') {
      throw new BadRequestException({ code: 'PAYROLL_ALREADY_APPROVED' });
    }

    const contracts = await this.repo.findActiveContracts();
    const uniqueTeachers = Array.from(new Set(contracts.map((c) => c.teacherId)));

    const runId = existing ? existing.id : uuidv7();
    const itemsToSave: NewPayrollItemRow[] = [];
    const advancesToDeduct: string[] = [];
    let grandTotal = 0n;

    for (const teacherId of uniqueTeachers) {
      const contract = contracts.find((c) => c.teacherId === teacherId);
      if (!contract) continue;

      const teacherItems = await this.computeTeacherPayrollItems({
        runId,
        teacherId,
        contract,
        period,
      });

      itemsToSave.push(...teacherItems);

      // Ushlanmagan avanslarni yig'ish
      const advs = await this.repo.findUndeductedAdvances(teacherId);
      for (const adv of advs) {
        advancesToDeduct.push(adv.id);
        itemsToSave.push({
          runId,
          teacherId,
          kind: 'advance',
          amount: -adv.amount,
          details: { advanceId: adv.id, givenAt: adv.givenAt },
          note: adv.note ?? 'Avans ushlab qolindi',
        });
      }

      const netSalary = calculateNetSalary(
        itemsToSave
          .filter((it) => it.teacherId === teacherId)
          .map((it) => ({ kind: it.kind, amount: it.amount })),
      );
      grandTotal += netSalary;
    }

    const savedRun = await this.repo.saveGeneratedPayrollRunTx({
      runId,
      branchId,
      period,
      items: itemsToSave,
      advancesToDeduct,
      totalAmount: grandTotal,
    });
    return this.getPayrollRun(actor, savedRun.id);
  }

  private async computeTeacherPayrollItems(ctx: {
    runId: string;
    teacherId: string;
    contract: TeacherContractRow;
    period: string;
  }): Promise<NewPayrollItemRow[]> {
    const items: NewPayrollItemRow[] = [];
    const metrics = await this.repo.calculateLessonMetrics(ctx.teacherId, ctx.period);
    if (ctx.contract.type === 'fixed' || ctx.contract.type === 'mixed') {
      items.push(this.createFixedItem(ctx, metrics));
    }
    if (ctx.contract.type === 'percent' || ctx.contract.type === 'mixed') {
      items.push(await this.createPercentItem(ctx));
    }
    if (metrics.substituteLessonsTaughtAsSub > 0 && ctx.contract.perLessonRate > 0n) {
      items.push(this.createSubstituteItem(ctx, metrics.substituteLessonsTaughtAsSub));
    }
    return items;
  }

  private createFixedItem(
    ctx: { runId: string; teacherId: string; contract: TeacherContractRow },
    metrics: { totalScheduledLessons: number; substituteLessonsTaughtByOthers: number },
  ): NewPayrollItemRow {
    const fixed = calculateFixedSalary(
      ctx.contract.fixedAmount,
      metrics.totalScheduledLessons,
      metrics.substituteLessonsTaughtByOthers,
    );
    return {
      runId: ctx.runId,
      teacherId: ctx.teacherId,
      kind: 'fixed',
      amount: fixed,
      details: {
        originalFixed: ctx.contract.fixedAmount.toString(),
        scheduledLessons: metrics.totalScheduledLessons,
        substituteLessons: metrics.substituteLessonsTaughtByOthers,
      },
      note: 'Fiks oylik',
    };
  }

  private async createPercentItem(ctx: {
    runId: string;
    teacherId: string;
    contract: TeacherContractRow;
    period: string;
  }): Promise<NewPayrollItemRow> {
    const collected = await this.repo.calculateTeacherCollectedAmount(ctx.teacherId, ctx.period);
    const percentAmt = calculatePercentSalary(collected, ctx.contract.percentBp);
    return {
      runId: ctx.runId,
      teacherId: ctx.teacherId,
      kind: 'percent',
      amount: percentAmt,
      details: { collectedBase: collected.toString(), percentBp: ctx.contract.percentBp },
      note: `${ctx.contract.percentBp / 100}% ulush`,
    };
  }

  private createSubstituteItem(
    ctx: { runId: string; teacherId: string; contract: TeacherContractRow },
    subCount: number,
  ): NewPayrollItemRow {
    const subAmt = calculateSubstituteSalary(subCount, ctx.contract.perLessonRate);
    return {
      runId: ctx.runId,
      teacherId: ctx.teacherId,
      kind: 'per_lesson',
      amount: subAmt,
      details: { substituteLessons: subCount, rate: ctx.contract.perLessonRate.toString() },
      note: `Oʻrinbosar darslari (${subCount} ta)`,
    };
  }

  async addAdjustment(
    actor: RequestUser,
    runId: string,
    req: AddPayrollAdjustmentRequest,
  ): Promise<void> {
    const run = await this.repo.findPayrollRunById(runId);
    if (!run) throw new NotFoundException({ code: 'PAYROLL_RUN_NOT_FOUND' });
    if (run.status !== 'draft') {
      throw new BadRequestException({ code: 'PAYROLL_ALREADY_APPROVED' });
    }

    const amt = BigInt(req.amount);
    const signedAmount = req.kind === 'bonus' ? amt : -amt;

    await this.repo.addPayrollItem({
      runId,
      teacherId: req.teacherId,
      kind: req.kind,
      amount: signedAmount,
      details: { addedBy: actor.id },
      note: req.note,
    });

    const newTotal = run.totalAmount + signedAmount;
    await this.repo.updatePayrollRun(runId, {
      totalAmount: newTotal > 0n ? newTotal : 0n,
    });
  }

  async approvePayrollRun(_actor: RequestUser, runId: string): Promise<void> {
    const run = await this.repo.findPayrollRunById(runId);
    if (!run) throw new NotFoundException({ code: 'PAYROLL_RUN_NOT_FOUND' });
    if (run.status !== 'draft') {
      throw new BadRequestException({ code: 'PAYROLL_NOT_DRAFT' });
    }

    await this.repo.updatePayrollRun(runId, {
      status: 'approved',
      approvedBy: _actor.id,
      approvedAt: new Date(),
    });
  }

  async markPayrollPaid(_actor: RequestUser, runId: string): Promise<void> {
    const run = await this.repo.findPayrollRunById(runId);
    if (!run) throw new NotFoundException({ code: 'PAYROLL_RUN_NOT_FOUND' });
    if (run.status === 'paid') return;

    await this.repo.updatePayrollRun(runId, {
      status: 'paid',
      paidBy: _actor.id,
      paidAt: new Date(),
    });
  }

  async getPayrollRun(actor: RequestUser, runId: string): Promise<PayrollRunDetail> {
    if (actor.role !== 'director' && actor.role !== 'teacher') {
      throw new ForbiddenException();
    }
    const run = await this.repo.findPayrollRunById(runId);
    if (!run) throw new NotFoundException({ code: 'PAYROLL_RUN_NOT_FOUND' });

    const rawItems = await this.repo.findPayrollItems(runId);
    let items = rawItems;
    if (actor.role === 'teacher') {
      items = rawItems.filter((i) => i.teacherId === actor.id);
    }

    return buildPayrollRunDetail(run, items);
  }
}
