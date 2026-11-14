import type {
  AddPayrollAdjustmentRequest,
  CreateTeacherAdvanceRequest,
  CreateTeacherContractRequest,
  PayrollRunDetail,
  TeacherContract,
} from '@lg/contracts';
import type { NewPayrollItemRow, TeacherContractRow } from '@lg/db';
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
import { PayrollGenerator } from './payroll-generator.js';

@Injectable()
export class PayrollService {
  constructor(
    @Inject(PayrollRepository) private readonly repo: PayrollRepository,
    @Inject(PayrollGenerator) private readonly generator: PayrollGenerator,
  ) {}

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
    const runId = existing?.id ?? uuidv7();
    const byTeacher = new Map<string, TeacherContractRow[]>();
    for (const c of await this.repo.findContractsForPeriod(branchId, period)) {
      byTeacher.set(c.teacherId, [...(byTeacher.get(c.teacherId) ?? []), c]);
    }

    const items: NewPayrollItemRow[] = [];
    const advanceIds: string[] = [];
    for (const [teacherId, contracts] of byTeacher) {
      const res = await this.generator.teacherItems(teacherId, contracts, { runId, period });
      items.push(...res.items.map((i) => ({ ...i, runId })));
      advanceIds.push(...res.advanceIds);
    }

    const saved = await this.repo.saveGeneratedRun({ runId, branchId, period, items, advanceIds });
    if (!saved) throw new BadRequestException({ code: 'PAYROLL_ALREADY_APPROVED' });
    return this.getPayrollRun(actor, saved.id);
  }

  /** BR-26: bonus/jarima — faqat DRAFT hisobga, sabab bilan; jami DB'dan qayta hisoblanadi. */
  async addAdjustment(
    actor: RequestUser,
    runId: string,
    req: AddPayrollAdjustmentRequest,
  ): Promise<void> {
    const amt = BigInt(req.amount);
    const saved = await this.repo.addItemToDraft({
      runId,
      teacherId: req.teacherId,
      kind: req.kind,
      amount: req.kind === 'bonus' ? amt : -amt,
      details: { addedBy: actor.id },
      note: req.note,
    });
    if (!saved) await this.throwStatusError(runId, 'PAYROLL_ALREADY_APPROVED');
  }

  /** BR-27: DRAFT → APPROVED. Biror ustoz net'i manfiy bo'lsa (avans > oylik) — tasdiqlanmaydi. */
  async approvePayrollRun(actor: RequestUser, runId: string): Promise<void> {
    const approved = await this.repo.approve(runId, actor.id, (items) => {
      const net = new Map<string, bigint>();
      for (const i of items) net.set(i.teacherId, (net.get(i.teacherId) ?? 0n) + i.amount);
      if ([...net.values()].some((v) => v < 0n)) {
        throw new BadRequestException({ code: 'PAYROLL_NEGATIVE_NET' });
      }
    });
    if (!approved) await this.throwStatusError(runId, 'PAYROLL_NOT_DRAFT');
  }

  /** BR-27: APPROVED → PAID; qayta chaqirish xavfsiz (allaqachon PAID — muvaffaqiyat). */
  async markPayrollPaid(actor: RequestUser, runId: string): Promise<void> {
    if (await this.repo.markPaid(runId, actor.id)) return;
    const run = await this.repo.findPayrollRunById(runId);
    if (run?.status === 'paid') return;
    await this.throwStatusError(runId, 'PAYROLL_NOT_APPROVED');
  }

  private async throwStatusError(runId: string, code: string): Promise<never> {
    const run = await this.repo.findPayrollRunById(runId);
    if (!run) throw new NotFoundException({ code: 'PAYROLL_RUN_NOT_FOUND' });
    throw new BadRequestException({ code });
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
