import type { AddPayrollAdjustmentRequest, OwnPayrollMonth, PayrollRunDetail } from '@lg/contracts';
import type { NewPayrollItemRow, TeacherContractRow } from '@lg/db';
import { type Clock, tashkentMonthRange } from '@lg/domain';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { PermissionsService } from '../rbac/index.js';
import { PayrollTermsRepository } from './payroll-terms.repository.js';
import { buildPayrollRunDetail } from './payroll.mappers.js';
import { PayrollRepository } from './payroll.repository.js';
import { PayrollGenerator } from './payroll-generator.js';

@Injectable()
export class PayrollService {
  constructor(
    @Inject(PayrollRepository) private readonly repo: PayrollRepository,
    @Inject(PayrollTermsRepository) private readonly terms: PayrollTermsRepository,
    @Inject(PayrollGenerator) private readonly generator: PayrollGenerator,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async generatePayrollRun(
    actor: RequestUser,
    branchId: string,
    period: string,
  ): Promise<PayrollRunDetail> {
    if (period > this.clock.today().slice(0, 7))
      throw new BadRequestException({ code: 'PERIOD_IN_FUTURE' });
    const existing = await this.repo.findPayrollRunByPeriod(branchId, period);
    if (existing && existing.status !== 'draft') {
      throw new BadRequestException({ code: 'PAYROLL_ALREADY_APPROVED' });
    }
    const runId = existing?.id ?? uuidv7();
    const byTeacher = new Map<string, TeacherContractRow[]>();
    for (const c of await this.terms.contractsForPeriod(branchId, period)) {
      byTeacher.set(c.teacherId, [...(byTeacher.get(c.teacherId) ?? []), c]);
    }
    const advances = await this.terms.outstandingAdvances(branchId, runId, period);
    // Shartnomasi yo'q, lekin avansi bor xodim: qo'lda yozilgan bonusidan ushlanadi.
    for (const a of advances) byTeacher.set(a.teacherId, byTeacher.get(a.teacherId) ?? []);

    const items: NewPayrollItemRow[] = [];
    const advanceIds: string[] = [];
    for (const [teacherId, contracts] of byTeacher) {
      const res = await this.generator.teacherItems(teacherId, contracts, {
        runId,
        period,
        advances: advances.filter((a) => a.teacherId === teacherId),
      });
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
    if (!(await this.terms.isStaff(req.teacherId)))
      throw new BadRequestException({ code: 'PAYROLL_NOT_STAFF' });
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

  /** BR-26: xato kiritilgan bonus/jarimani qoralamadan olib tashlash. */
  async removeAdjustment(runId: string, itemId: string): Promise<void> {
    if (await this.repo.removeManualItem(runId, itemId)) return;
    const run = await this.repo.findPayrollRunById(runId);
    if (run?.status === 'draft') throw new NotFoundException({ code: 'NOT_FOUND' });
    await this.throwStatusError(runId, 'PAYROLL_ALREADY_APPROVED');
  }

  /**
   * BR-27: DRAFT → APPROVED. Oy tugagan va undan keyin hisoblangan bo'lishi shart (Q-104): aks
   * holda oyning qolgan kunlaridagi tushum hech qaysi hisobga tushmasdi. Manfiy net — rad.
   */
  async approvePayrollRun(actor: RequestUser, runId: string): Promise<void> {
    const approved = await this.repo.approve(runId, actor.id, (run, items) => {
      const { end } = tashkentMonthRange(run.period);
      if (this.clock.now() < end) throw new BadRequestException({ code: 'PAYROLL_PERIOD_OPEN' });
      if (!run.generatedAt || run.generatedAt < end)
        throw new BadRequestException({ code: 'PAYROLL_STALE' });
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
    const perms = await this.permissions.forUser(actor.id, actor.role, actor.pv);
    const manages = perms.has('payroll.manage');
    if (!manages && !perms.has('payroll.view_own')) throw new ForbiddenException();
    const run = await this.repo.findPayrollRunById(runId);
    if (!run) throw new NotFoundException({ code: 'PAYROLL_RUN_NOT_FOUND' });

    const rawItems = await this.repo.findPayrollItems(runId);
    let items = rawItems;
    if (!manages) {
      items = rawItems.filter((i) => i.teacherId === actor.id);
    }

    const detail = buildPayrollRunDetail(run, items);
    // Xodimga jami — faqat o'ziniki (boshqalar oyligi yig'indisi oshkor bo'lmaydi).
    if (!manages) return { ...detail, totalAmount: detail.teachers[0]?.totalNet ?? '0' };
    return detail;
  }

  /** W-25: davr hisobi (generatsiya qilinmagan bo'lsa — `null`, yozuvsiz). */
  async findRunByPeriod(
    actor: RequestUser,
    branchId: string,
    period: string,
  ): Promise<PayrollRunDetail | null> {
    const run = await this.repo.findPayrollRunByPeriod(branchId, period);
    return run ? this.getPayrollRun(actor, run.id) : null;
  }

  /** Ustozning o'z oyliklari ro'yxati (payroll.view_own). */
  async listOwnPayroll(actor: RequestUser): Promise<OwnPayrollMonth[]> {
    const rows = await this.repo.findTeacherRuns(actor.id);
    return rows.map((r) => ({ ...r, totalNet: r.totalNet ?? '0' }));
  }
}
