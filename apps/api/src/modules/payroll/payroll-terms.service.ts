import type {
  CreateTeacherAdvanceRequest,
  CreateTeacherContractRequest,
  PayrollStaffOption,
  TeacherAdvance,
  TeacherContract,
} from '@lg/contracts';
import type { TeacherContractRow, Transaction } from '@lg/db';
import { addDays, type Clock } from '@lg/domain';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { PayrollTermsRepository } from './payroll-terms.repository.js';
import { mapContractRow } from './payroll.mappers.js';

const ADVANCES_SHOWN = 100;

/** Shartnoma turi talab qilgan summa kiritilganmi (BR-23). */
function hasAmounts(r: CreateTeacherContractRequest): boolean {
  const fixed = BigInt(r.fixedAmount) > 0n;
  const percent = r.percentBp > 0;
  if (r.type === 'mixed') return fixed && percent;
  return r.type === 'fixed' ? fixed : percent;
}

const overlaps = (c: TeacherContractRow, from: string, to: string | null) =>
  (to === null || c.validFrom <= to) && (c.validTo === null || c.validTo >= from);

/** FR-SAL-1, BR-28: ustoz shartnomalari va avanslar. */
@Injectable()
export class PayrollTermsService {
  constructor(
    @Inject(PayrollTermsRepository) private readonly repo: PayrollTermsRepository,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /**
   * Yangi shartnoma. Shu doirada ochiq eskisi bo'lsa — u yangisidan bir kun oldin yopiladi;
   * boshqa ustma-ust tushish — 409 (ikki shartnoma birga hisoblanmaydi, Q-104).
   */
  async createContract(
    branchId: string,
    r: CreateTeacherContractRequest,
  ): Promise<TeacherContract> {
    const validTo = r.validTo ?? null;
    const groupId = r.groupId ?? null;
    if (validTo !== null && validTo < r.validFrom)
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE' });
    if (!hasAmounts(r)) throw new BadRequestException({ code: 'CONTRACT_AMOUNT_REQUIRED' });
    await this.assertStaff(r.teacherId);
    const row = await this.repo.transaction(async (tx) => {
      for (const c of await this.repo.sameScope(tx, r.teacherId, groupId)) {
        if (!overlaps(c, r.validFrom, validTo)) continue;
        if (c.validTo !== null || c.validFrom >= r.validFrom)
          throw new ConflictException({ code: 'CONTRACT_OVERLAP' });
        await this.repo.setContractEnd(tx, c.id, addDays(r.validFrom, -1));
      }
      await this.repo.invalidateDrafts(tx);
      return this.repo.insertContract(tx, {
        branchId,
        teacherId: r.teacherId,
        groupId,
        type: r.type,
        fixedAmount: r.type === 'percent' ? 0n : BigInt(r.fixedAmount),
        percentBp: r.type === 'fixed' ? 0 : r.percentBp,
        perLessonRate: BigInt(r.perLessonRate),
        base: r.base,
        validFrom: r.validFrom,
        validTo,
      });
    });
    return mapContractRow(row);
  }

  async listContracts(teacherId?: string): Promise<TeacherContract[]> {
    const rows = await this.repo.contracts(teacherId);
    return rows.map((r) => ({
      ...mapContractRow(r.c),
      teacherName: r.teacherName,
      ...(r.groupName ? { groupName: r.groupName } : {}),
    }));
  }

  /** Ustoz ketdi / shart tugadi: oxirgi kun. */
  async endContract(id: string, validTo: string): Promise<TeacherContract> {
    return this.repo.transaction(async (tx) => {
      const c = await this.contract(tx, id);
      if (validTo < c.validFrom) throw new BadRequestException({ code: 'INVALID_DATE_RANGE' });
      await this.repo.invalidateDrafts(tx);
      return mapContractRow(await this.repo.setContractEnd(tx, id, validTo));
    });
  }

  /** Xato kiritilgani — tasdiqlangan oylikda ishlatilmagan bo'lsa. */
  async deleteContract(id: string): Promise<void> {
    await this.repo.transaction(async (tx) => {
      await this.contract(tx, id);
      if (await this.repo.usedInApproved(tx, 'contractId', id))
        throw new ConflictException({ code: 'CONTRACT_IN_USE' });
      await this.repo.invalidateDrafts(tx);
      await this.repo.deleteContract(tx, id);
    });
  }

  staffOptions(): Promise<PayrollStaffOption[]> {
    return this.repo.staffOptions();
  }

  async createAdvance(
    actor: RequestUser,
    branchId: string,
    r: CreateTeacherAdvanceRequest,
  ): Promise<{ id: string }> {
    if (r.givenAt > this.clock.today())
      throw new BadRequestException({ code: 'ADVANCE_IN_FUTURE' });
    await this.assertStaff(r.teacherId);
    return this.repo.transaction(async (tx) => {
      await this.repo.invalidateDrafts(tx);
      const row = await this.repo.insertAdvance(tx, {
        branchId,
        teacherId: r.teacherId,
        amount: BigInt(r.amount),
        givenAt: r.givenAt,
        note: r.note ?? null,
        createdBy: actor.id,
      });
      return { id: row.id };
    });
  }

  async listAdvances(): Promise<TeacherAdvance[]> {
    const rows = await this.repo.advances(ADVANCES_SHOWN);
    return rows.map(({ a, teacherName, withheld }) => ({
      id: a.id,
      teacherId: a.teacherId,
      teacherName,
      amount: a.amount.toString(),
      withheld,
      givenAt: a.givenAt,
      note: a.note,
    }));
  }

  /** Xato kiritilgan avans — hali ushlanmagan (tasdiqlangan hisobda yo'q) bo'lsa. */
  async deleteAdvance(id: string): Promise<void> {
    await this.repo.transaction(async (tx) => {
      if (!(await this.repo.lockAdvance(tx, id)))
        throw new NotFoundException({ code: 'NOT_FOUND' });
      if (await this.repo.usedInApproved(tx, 'advanceId', id))
        throw new ConflictException({ code: 'ADVANCE_IN_USE' });
      await this.repo.invalidateDrafts(tx);
      await this.repo.deleteAdvance(tx, id);
    });
  }

  private async contract(tx: Transaction, id: string): Promise<TeacherContractRow> {
    const c = await this.repo.lockContract(tx, id);
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND' });
    return c;
  }

  private async assertStaff(userId: string): Promise<void> {
    if (!(await this.repo.isStaff(userId)))
      throw new BadRequestException({ code: 'PAYROLL_NOT_STAFF' });
  }
}
